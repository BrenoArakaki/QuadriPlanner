"""Primeira versão do buscador, que lia o PDF linha a linha com PyMuPDF.

Foi substituída pelo materia_v2.py, que lê o PDF como tabela (bem mais
confiável) e é o que o site usa. Está aqui só como histórico.

  pip install pymupdf requests
  $env:UFABC_TOKEN="seu_token"   (PowerShell)
  python materia.py
"""

import os
import re
import fitz
import requests
from urllib.parse import quote_plus

PDF_PATH = "matriculas_2026_2_turmas_ofertadas.pdf"
TOKEN = os.environ.get("UFABC_TOKEN", "")

PALAVRAS_INVALIDAS = {
    "SA", "SB", "SANTO ANDRÉ", "SÃO BERNARDO",
    "MATUTINO", "NOTURNO"
}


def parece_nome(linha):
    linha = linha.strip()

    if not linha:
        return False
    if any(char.isdigit() for char in linha):
        return False
    if linha in PALAVRAS_INVALIDAS:
        return False
    if linha.startswith("BACHARELADO EM"):
        return False

    dias = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"]
    if any(dia in linha.lower() for dia in dias):
        return False

    return linha.upper() == linha


def materia_base(linha):
    linha = linha.strip()
    linha = re.split(r"\s+[A-Z]\d+-", linha, maxsplit=1)[0]
    return linha.strip()


def listar_materias_base(pdf_path, termo_busca):
    doc = fitz.open(pdf_path)
    termo_busca = termo_busca.upper().strip()

    opcoes = []
    vistos = set()

    for page in doc:
        text = page.get_text("text")
        linhas = [linha.strip() for linha in text.split("\n") if linha.strip()]

        for linha in linhas:
            base = materia_base(linha)

            if termo_busca in base.upper():
                if base not in vistos:
                    vistos.add(base)
                    opcoes.append(base)

    return sorted(opcoes)


def extrair_professores_por_materia(pdf_path, materia_escolhida):
    doc = fitz.open(pdf_path)
    materia_escolhida = materia_escolhida.upper().strip()

    resultados = []
    vistos = set()

    for page_num, page in enumerate(doc, start=1):
        text = page.get_text("text")
        linhas = [linha.strip() for linha in text.split("\n") if linha.strip()]

        for i, linha in enumerate(linhas):
            if materia_base(linha).upper() == materia_escolhida:
                professor_partes = []
                capturando = False

                for j in range(1, 15):
                    if i + j >= len(linhas):
                        break

                    prox = linhas[i + j].strip()

                    if prox.startswith("BACHARELADO EM"):
                        break

                    if prox.isdigit():
                        capturando = True
                        continue

                    if capturando:
                        if parece_nome(prox):
                            professor_partes.append(prox)
                        elif professor_partes:
                            break

                professor = " ".join(professor_partes).strip()

                chave = (materia_base(linha), professor)
                if professor and chave not in vistos:
                    vistos.add(chave)
                    resultados.append({
                        "pagina": page_num,
                        "materia": materia_base(linha),
                        "turma_completa": linha,
                        "professor_pdf": professor
                    })

    return resultados


def buscar_professor(nome):
    url = "https://api.v2.ufabcnext.com/entities/teachers/search"
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
    }

    r = requests.get(url, params={"q": nome}, headers=headers)
    r.raise_for_status()
    return r.json()


def pegar_reviews(teacher_id):
    url = f"https://api.v2.ufabcnext.com/entities/teachers/reviews/{teacher_id}"
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
    }

    r = requests.get(url, headers=headers)
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
    termo = input("Digite a matéria: ").strip()

    opcoes = listar_materias_base(PDF_PATH, termo)

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
    encontrados = extrair_professores_por_materia(PDF_PATH, materia_escolhida)

    if not encontrados:
        print("Nenhum professor encontrado para essa matéria.")
        return

    ranking = []

    for item in encontrados:
        nome_pdf = item["professor_pdf"]

        try:
            busca = buscar_professor(nome_pdf)

            if busca["total"] == 0 or not busca["data"]:
                print(f"Professor não encontrado na API: {nome_pdf}")
                continue

            prof_api = busca["data"][0]
            teacher_id = prof_api["_id"]
            nome_api = prof_api["name"]

            reviews = pegar_reviews(teacher_id)
            a_percent = pegar_percentual_A(reviews)

            url = f"https://www.ufabcnext.com/app/reviews?q={quote_plus(nome_api)}&teacherId={teacher_id}"

            ranking.append({
                "materia": item["materia"],
                "professor": nome_api,
                "teacher_id": teacher_id,
                "A_percent": a_percent,
                "url": url,
                "turma": item["turma_completa"]
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
        print(f"   Turma: {prof['turma']}")
        print(f"   Link: {prof['url']}")
        print()


if __name__ == "__main__":
    if not TOKEN:
        print("Defina a variável de ambiente UFABC_TOKEN antes de rodar.")
    else:
        main()