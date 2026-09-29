import re
import csv
import unicodedata
import os
import pdfplumber
import requests
from urllib.parse import quote_plus

PDF_PATH = "matriculas_2026_2_turmas_ofertadas.pdf"
CSV_CACHE = "turmas.csv"

COLUNAS_TEORIA = ["DOCENTE TEORIA", "DOCENTE TEORIA 2", "DOCENTE TEORIA 3"]
COLUNAS_PRATICA = ["DOCENTE PRÁTICA", "DOCENTE PRÁTICA 2", "DOCENTE PRÁTICA 3"]
COLUNAS_DOCENTE = COLUNAS_TEORIA + COLUNAS_PRATICA


def materia_base(turma_texto):
    """Extrai o nome da matéria a partir da coluna TURMA, removendo o
    sufixo de turno/campus (ex.: 'A1-Matutino (SA)')."""
    texto = turma_texto.strip().replace("\n", " ")
    texto = re.split(r"\s+[A-Z]\d*-", texto, maxsplit=1)[0]
    return texto.strip()


def carregar_tabela(pdf_path):
    """Lê o PDF (export de Excel) como uma tabela estruturada.
    Muito mais robusto que parsear linha a linha: cada coluna já vem
    separada, sem depender de heurísticas para achar nomes."""
    header = None
    rows = []

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            for tabela in page.extract_tables():
                if not tabela:
                    continue

                linhas = [
                    [(c or "").replace("\n", " ").strip() for c in linha]
                    for linha in tabela
                ]

                # As primeiras páginas do PDF trazem avisos e mapas de salas,
                # que o pdfplumber também enxerga como tabela. Só interessa a
                # tabela de turmas, que sempre começa com a coluna CURSO (e
                # repete esse cabeçalho a cada página).
                if linhas[0][0].upper() != "CURSO":
                    continue

                if header is None:
                    header = linhas[0]

                rows.extend(linhas[1:])

    if header is None:
        raise ValueError(
            "Não achei a tabela de turmas no PDF: nenhuma tabela começa com a coluna CURSO."
        )

    return header, rows


def garantir_csv(pdf_path, csv_path):
    """Gera o CSV a partir do PDF apenas se ainda não existir
    (evita reprocessar o PDF toda vez que o script roda)."""
    if os.path.exists(csv_path):
        return

    header, rows = carregar_tabela(pdf_path)

    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)


def carregar_linhas_csv(csv_path):
    with open(csv_path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def normalizar(texto):
    """Sem acento e em maiúsculas, pra comparar busca com nome de matéria:
    quem digita "fisica" quer achar "FÍSICA"."""
    sem_acento = unicodedata.normalize("NFKD", texto or "")
    sem_acento = "".join(c for c in sem_acento if not unicodedata.combining(c))
    return sem_acento.upper().strip()


def listar_materias_base(linhas, termo_busca):
    termo_busca = normalizar(termo_busca)
    vistos = set()
    opcoes = []

    for linha in linhas:
        base = materia_base(linha["TURMA"])
        if termo_busca in normalizar(base) and base not in vistos:
            vistos.add(base)
            opcoes.append(base)

    return sorted(opcoes)


# O código da turma embute o da disciplina entre o prefixo de turno/turma e o
# sufixo de campus: "DA1BCJ0203-15SA" -> "BCJ0203-15". A turma pode vir sem
# número ("DANHZ2112-18SB"), por isso o \d* no meio.
PADRAO_CODIGO_TURMA = re.compile(r"^[A-Z][A-Z]\d*(.+?)(SA|SB)$")


def codigo_da_disciplina(codigo_turma):
    achou = PADRAO_CODIGO_TURMA.match(codigo_turma)
    return achou.group(1) if achou else codigo_turma


def docentes_das_colunas(linha, colunas):
    nomes = []
    for coluna in colunas:
        nome = (linha.get(coluna) or "").strip()
        if nome and nome not in nomes:
            nomes.append(nome)
    return nomes


# O PDF não tem colunas de campus/turno: os dois vêm grudados no fim do nome
# da turma ("... A1-Matutino (SA)"), às vezes com espaço depois do hífen e com
# sufixo depois do campus ("(SA) - Carga Horária Extensionista").
PADRAO_TURNO_CAMPUS = re.compile(r"\s[A-Z]\d*-\s*([A-Za-zÀ-ÿ]+)\s*\((SA|SB)\)")


def turno_e_campus(turma_texto):
    achou = PADRAO_TURNO_CAMPUS.search(turma_texto or "")
    return (achou.group(1), achou.group(2)) if achou else ("", "")


def listar_todas_materias(linhas):
    """Todas as matérias ofertadas no PDF, uma por nome-base, já com o que
    dá pra saber olhando só as turmas dela: código da disciplina, cursos,
    campi, turnos e quantas turmas existem. É o catálogo da aba "Matérias",
    que não consulta a API de professores."""
    por_materia = {}

    for linha in linhas:
        nome = materia_base(linha["TURMA"])
        if not nome:
            continue

        entrada = por_materia.setdefault(
            nome,
            {
                "nome": nome,
                "codigos": [],
                "cursos": [],
                "campi": [],
                "turnos": [],
                "tpi": "",
                "turmas": 0,
            },
        )

        turno, campus = turno_e_campus(linha["TURMA"])
        codigo = codigo_da_disciplina((linha.get("CÓDIGO DE TURMA") or "").strip())
        curso = (linha.get("CURSO") or "").strip()
        tpi = (linha.get("T-P-E-I") or "").strip()

        entrada["turmas"] += 1
        if not entrada["tpi"]:
            entrada["tpi"] = tpi

        for chave, valor in (
            ("codigos", codigo),
            ("cursos", curso),
            ("campi", campus),
            ("turnos", turno),
        ):
            if valor and valor not in entrada[chave]:
                entrada[chave].append(valor)

    for entrada in por_materia.values():
        entrada["cursos"].sort()
        entrada["campi"].sort()
        entrada["turnos"].sort()

    return sorted(por_materia.values(), key=lambda m: normalizar(m["nome"]))


def montar_turma(linha):
    """Uma linha do PDF é uma turma: um código de matrícula que já vem com
    teoria e prática juntas — e que pode ter docentes diferentes em cada
    parte, por isso os dois horários e as duas listas andam sempre juntos."""
    codigo = (linha.get("CÓDIGO DE TURMA") or "").strip()
    nome_turma = linha["TURMA"].strip()
    turno, campus = turno_e_campus(nome_turma)

    return {
        "codigo": codigo,
        "codigo_disciplina": codigo_da_disciplina(codigo),
        # o PDF traz "T-P-I" em umas turmas e "T-P-E-I" (com extensão) em outras
        "tpi": (linha.get("T-P-E-I") or "").strip(),
        "turma": nome_turma,
        "campus": campus,
        "turno": turno,
        "horario_teoria": (linha.get("TEORIA") or "").strip(),
        "horario_pratica": (linha.get("PRÁTICA") or "").strip(),
        "docentes_teoria": docentes_das_colunas(linha, COLUNAS_TEORIA),
        "docentes_pratica": docentes_das_colunas(linha, COLUNAS_PRATICA),
    }


def extrair_professores_por_materia(linhas, materia_escolhida):
    """Agrupa por professor, cada um carregando TODAS as turmas que dá nessa
    matéria. Antes ficava uma turma só por professor, escolhida pela ordem do
    PDF, e as outras sumiam sem o usuário saber que existiam."""
    materia_escolhida = normalizar(materia_escolhida)
    por_professor = {}

    for linha in linhas:
        if normalizar(materia_base(linha["TURMA"])) != materia_escolhida:
            continue

        turma = montar_turma(linha)

        for coluna in COLUNAS_DOCENTE:
            professor = (linha.get(coluna) or "").strip()
            if not professor:
                continue

            entrada = por_professor.setdefault(
                professor,
                {
                    "professor_pdf": professor,
                    "materia": materia_base(linha["TURMA"]),
                    "turmas": [],
                },
            )

            ja_tem = next(
                (t for t in entrada["turmas"] if t["codigo"] == turma["codigo"]), None
            )
            if ja_tem is None:
                ja_tem = dict(turma, papeis=[])
                entrada["turmas"].append(ja_tem)

            # o mesmo professor pode dar teoria E prática da mesma turma
            papel = "prática" if coluna in COLUNAS_PRATICA else "teoria"
            if papel not in ja_tem["papeis"]:
                ja_tem["papeis"].append(papel)

    return list(por_professor.values())


def cabecalhos(token):
    """Cabeçalhos da API da UFABCnext. O token vem de quem chamou: no site
    ele é o que a pessoa salvou na página inicial (ver backend.py); no uso
    por linha de comando, a variável de ambiente UFABC_TOKEN."""
    return {
        "Authorization": f"Bearer {token}",
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
    }


def buscar_professor(nome, token):
    url = "https://api.v2.ufabcnext.com/entities/teachers/search"
    r = requests.get(url, params={"q": nome}, headers=cabecalhos(token))
    r.raise_for_status()
    return r.json()


def pegar_reviews(teacher_id, token):
    url = f"https://api.v2.ufabcnext.com/entities/teachers/reviews/{teacher_id}"
    r = requests.get(url, headers=cabecalhos(token))
    r.raise_for_status()
    return r.json()


def pegar_percentual_A(review_json):
    dist = review_json["general"]["distribution"]
    total = 0
    qtd_a = 0

    for item in dist:
        qtd = item.get("amount", 0)
        total += qtd
        if item.get("conceito") == "A":
            qtd_a = qtd

    if total == 0:
        return 0

    return (qtd_a / total) * 100


def main():
    # Só o script de linha de comando lê a variável de ambiente; no site o
    # token vem do que a pessoa salvou na página inicial.
    token = os.environ.get("UFABC_TOKEN", "")
    if not token:
        print("Defina a variável de ambiente UFABC_TOKEN antes de rodar.")
        return

    garantir_csv(PDF_PATH, CSV_CACHE)
    linhas = carregar_linhas_csv(CSV_CACHE)

    termo = input("Digite a matéria: ").strip()
    opcoes = listar_materias_base(linhas, termo)

    if not opcoes:
        print("Nenhuma matéria encontrada.")
        return

    print("\nEscolha a matéria:\n")
    for i, materia in enumerate(opcoes, start=1):
        print(f"{i}. {materia}")

    try:
        escolha = int(input("\nDigite o número: ")) - 1
        if escolha < 0 or escolha >= len(opcoes):
            print("Opção inválida.")
            return
    except ValueError:
        print("Digite um número válido.")
        return

    materia_escolhida = opcoes[escolha]
    encontrados = extrair_professores_por_materia(linhas, materia_escolhida)

    if not encontrados:
        print("Nenhum professor encontrado para essa matéria.")
        return

    ranking = []

    for item in encontrados:
        nome_pdf = item["professor_pdf"]

        try:
            busca = buscar_professor(nome_pdf, token)

            if busca["total"] == 0 or not busca["data"]:
                print(f"Professor não encontrado na API: {nome_pdf}")
                continue

            prof_api = busca["data"][0]
            teacher_id = prof_api["_id"]
            nome_api = prof_api["name"]

            reviews = pegar_reviews(teacher_id, token)
            a_percent = pegar_percentual_A(reviews)

            url = f"https://www.ufabcnext.com/app/reviews?q={quote_plus(nome_api)}&teacherId={teacher_id}"

            ranking.append({
                "materia": item["materia"],
                "professor": nome_api,
                "teacher_id": teacher_id,
                "A_percent": a_percent,
                "url": url,
                "turmas": item["turmas"],
            })

        except Exception as e:
            print(f"Erro com {nome_pdf}: {e}")

    unicos = {}
    for prof in ranking:
        tid = prof["teacher_id"]
        if tid not in unicos or prof["A_percent"] > unicos[tid]["A_percent"]:
            unicos[tid] = prof

    ranking = list(unicos.values())
    ranking.sort(key=lambda x: x["A_percent"], reverse=True)

    print(f"\nRanking por percentual de A — {materia_escolhida}:\n")
    for i, prof in enumerate(ranking, start=1):
        print(f"{i}. {prof['professor']} -> {prof['A_percent']:.2f}% A")
        for t in prof["turmas"]:
            print(f"   Turma: {t['turma']} ({'/'.join(t['papeis'])})")
        print(f"   Link: {prof['url']}")
        print()


if __name__ == "__main__":
    main()