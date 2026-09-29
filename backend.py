"""
Backend da interface do buscador de professores por matéria.

O PDF de turmas é trocado pelo administrador, fora do site: veja trocar_pdf.py.

Roda localmente e expõe as rotas (todas de leitura):
  GET /api/materias?q=<termo>         -> lista de matérias que batem com o termo
  GET /api/todas-materias             -> catálogo de todas as matérias ofertadas
  GET /api/ementa?materia=<nome>      -> objetivos e recomendações da matéria
  GET /api/ranking?materia=<nome>     -> ranking de professores daquela matéria
  GET /api/token/validar              -> diz se o token enviado é aceito pela API

O token da UFABCnext não fica mais no servidor (nem em variável de ambiente):
cada pessoa salva o dela na página inicial do site, que guarda no localStorage
do navegador e manda no cabeçalho X-UFABC-Token em toda requisição. Assim o
backend é sem estado e duas pessoas podem usar a mesma instância com contas
diferentes.

Rodar:
  pip install flask flask-cors pdfplumber requests
  python backend.py
"""

import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

from ementas import carregar_ementas, codigos_da_materia, buscar_ementa
from materia_v2 import (
    PDF_PATH,
    cabecalhos,
    CSV_CACHE,
    garantir_csv,
    carregar_linhas_csv,
    listar_materias_base,
    listar_todas_materias,
    extrair_professores_por_materia,
    buscar_professor,
    pegar_reviews,
    pegar_percentual_A,
)

app = Flask(__name__)
# O frontend roda em outra origem/porta, e manda o token num cabeçalho
# personalizado — que só passa no preflight se for liberado aqui.
CORS(app, allow_headers=["Content-Type", "X-UFABC-Token"])

SEM_TOKEN = "Nenhum token da UFABCnext foi enviado. Salve o seu na página inicial do site."

# Carrega o CSV uma vez, na subida do servidor
garantir_csv(PDF_PATH, CSV_CACHE)
LINHAS = carregar_linhas_csv(CSV_CACHE)

# Índice de objetivos/recomendações: arquivo local, lido uma vez na subida
EMENTAS = carregar_ementas()


def token_da_requisicao():
    """Token que o navegador mandou. Aceita o cabeçalho próprio e também um
    Authorization: Bearer <token>, pra facilitar testes com curl."""
    token = request.headers.get("X-UFABC-Token", "").strip()
    if token:
        return token

    auth = request.headers.get("Authorization", "").strip()
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()

    return ""


@app.route("/api/token/validar")
def api_token_validar():
    """Uma busca qualquer na API só pra saber se o token é aceito: é o que a
    página inicial usa pra avisar na hora, em vez de a pessoa descobrir só
    quando o ranking vier vazio."""
    token = token_da_requisicao()
    if not token:
        return jsonify({"valido": False, "erro": "Nenhum token enviado."}), 400

    try:
        buscar_professor("silva", token)
        return jsonify({"valido": True})
    except requests.HTTPError as e:
        status = e.response.status_code if e.response is not None else 0
        if status in (401, 403):
            return jsonify({"valido": False, "erro": "Token inválido ou expirado."})
        return jsonify({"valido": False, "erro": f"A UFABCnext respondeu {status}."})
    except Exception as e:
        return jsonify({"valido": False, "erro": f"Não deu pra falar com a UFABCnext: {e}"})


@app.route("/api/resumo")
def api_resumo():
    teacher_id = request.args.get("teacher_id", "").strip()
    if not teacher_id:
        return jsonify({"erro": "parâmetro 'teacher_id' é obrigatório"}), 400

    token = token_da_requisicao()
    if not token:
        return jsonify({"erro": SEM_TOKEN}), 401

    url = f"https://api.v2.ufabcnext.com/v2/teachers/{teacher_id}/summary"

    try:
        r = requests.get(url, headers=cabecalhos(token))
        r.raise_for_status()
        return jsonify(r.json())
    except Exception as e:
        return jsonify({"erro": f"Falha ao buscar resumo: {e}"}), 500


@app.route("/api/materias")
def api_materias():
    termo = request.args.get("q", "").strip()
    if not termo:
        return jsonify({"opcoes": []})

    opcoes = listar_materias_base(LINHAS, termo)
    return jsonify({"opcoes": opcoes})


@app.route("/api/todas-materias")
def api_todas_materias():
    """Catálogo completo pra aba "Matérias": só o que vem do PDF, sem tocar
    na API de professores (por isso responde na hora, com as 400+ matérias)."""
    return jsonify({"materias": listar_todas_materias(LINHAS)})


@app.route("/api/ementa")
def api_ementa():
    """Objetivos e recomendações da matéria, do disciplinas_ufabc.json."""
    materia = request.args.get("materia", "").strip()
    if not materia:
        return jsonify({"erro": "parâmetro 'materia' é obrigatório"}), 400

    achou = buscar_ementa(EMENTAS, materia, codigos_da_materia(LINHAS, materia))
    if not achou:
        return jsonify({"erro": "Esta matéria não está no catálogo de disciplinas."}), 404

    return jsonify({
        "codigo": achou.get("codigo", ""),
        "nome": achou.get("nome", ""),
        "objetivos": achou.get("objetivos", ""),
        "recomendacoes": achou.get("recomendacoes", ""),
    })


@app.route("/api/ranking")
def api_ranking():
    materia = request.args.get("materia", "").strip()
    if not materia:
        return jsonify({"erro": "parâmetro 'materia' é obrigatório"}), 400

    token = token_da_requisicao()
    if not token:
        return jsonify({"erro": SEM_TOKEN}), 401

    encontrados = extrair_professores_por_materia(LINHAS, materia)
    if not encontrados:
        return jsonify({"ranking": [], "avisos": ["Nenhum professor encontrado para essa matéria."]})

    ranking = []
    avisos = []
    resolvidos = {}  # nome como vem no PDF -> dados desse professor na API

    for item in encontrados:
        nome_pdf = item["professor_pdf"]
        try:
            busca = buscar_professor(nome_pdf, token)

            if busca.get("total", 0) == 0 or not busca.get("data"):
                avisos.append(f"Professor não encontrado na API: {nome_pdf}")
                continue

            prof_api = busca["data"][0]
            teacher_id = prof_api["_id"]
            nome_api = prof_api["name"]

            reviews = pegar_reviews(teacher_id, token)
            a_percent = pegar_percentual_A(reviews)

            dist_bruta = reviews.get("general", {}).get("distribution", [])
            total_amostras = sum(item_d.get("amount", 0) for item_d in dist_bruta)
            distribuicao = {
                item_d.get("conceito"): item_d.get("amount", 0)
                for item_d in dist_bruta
            }

            url = f"https://www.ufabcnext.com/app/reviews?q={nome_api}&teacherId={teacher_id}"

            resolvidos[nome_pdf] = {
                "nome": nome_pdf,
                "professor": nome_api,
                "teacher_id": teacher_id,
                "a_percent": round(a_percent, 2),
                "distribuicao": distribuicao,
                "amostras": total_amostras,
                "url": url,
            }

            ranking.append({
                "materia": item["materia"],
                "professor": nome_api,
                "teacher_id": teacher_id,
                "a_percent": round(a_percent, 2),
                "distribuicao": distribuicao,
                "amostras": total_amostras,
                "url": url,
                "turmas": item["turmas"],
            })

        except Exception as e:
            avisos.append(f"Erro com {nome_pdf}: {e}")

    # Grafias diferentes no PDF podem cair no mesmo professor da API. Antes
    # uma das entradas era descartada (e as turmas dela sumiam); agora as
    # listas de turmas são juntadas.
    unicos = {}
    for prof in ranking:
        tid = prof["teacher_id"]
        if tid not in unicos:
            unicos[tid] = prof
            continue

        ja_tem = {t["codigo"] for t in unicos[tid]["turmas"]}
        unicos[tid]["turmas"].extend(t for t in prof["turmas"] if t["codigo"] not in ja_tem)

    ranking_final = sorted(unicos.values(), key=lambda x: x["a_percent"], reverse=True)

    # Teoria e prática de uma turma podem ser com docentes diferentes, e quem
    # monta a grade quer ver a avaliação dos dois. Todo docente que aparece em
    # alguma turma desta matéria já foi buscado no laço acima, então trocar o
    # nome solto pelos dados completos não custa nenhuma requisição extra.
    # Quem a API não achou fica só com o nome.
    def resolver(nomes):
        return [resolvidos.get(nome, {"nome": nome}) for nome in nomes]

    for prof in ranking_final:
        for turma in prof["turmas"]:
            turma["docentes_teoria"] = resolver(turma["docentes_teoria"])
            turma["docentes_pratica"] = resolver(turma["docentes_pratica"])

    return jsonify({"ranking": ranking_final, "avisos": avisos})


if __name__ == "__main__":
    app.run(port=5000, debug=True)