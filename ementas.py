"""
Objetivos e recomendações das disciplinas, lidos de disciplinas_ufabc.json.

O PDF de turmas diz quando e com quem a matéria acontece, mas não do que ela
trata. Este módulo junta as duas coisas: dado o nome de uma matéria do PDF,
devolve os objetivos e as recomendações dela.

O casamento é pelo código da disciplina (o "ESZR007-21" que já vem embutido no
código da turma): os nomes do PDF chegam com hífens e espaços quebrados pela
extração ("PÓS- COLONIALISMO"), então nome só serve como segunda tentativa.
"""

import json
import os

from materia_v2 import normalizar, materia_base, codigo_da_disciplina

JSON_DISCIPLINAS = "disciplinas_ufabc.json"


def carregar_ementas(caminho=JSON_DISCIPLINAS):
    """Índice de consulta: o mesmo registro indexado por código e por nome
    normalizado. Devolve índices vazios se o arquivo não estiver na pasta —
    o resto do site continua funcionando sem ele."""
    if not os.path.exists(caminho):
        return {"por_codigo": {}, "por_nome": {}}

    with open(caminho, encoding="utf-8") as f:
        disciplinas = json.load(f)

    return {
        "por_codigo": {d["codigo"]: d for d in disciplinas if d.get("codigo")},
        "por_nome": {normalizar(d["nome"]): d for d in disciplinas if d.get("nome")},
    }


def codigos_da_materia(linhas, materia):
    """Códigos de disciplina das turmas dessa matéria. É lista porque matéria
    com nome igual pode ter código diferente por curso/versão do catálogo."""
    procurado = normalizar(materia)
    codigos = []

    for linha in linhas:
        if normalizar(materia_base(linha["TURMA"])) != procurado:
            continue

        codigo = codigo_da_disciplina((linha.get("CÓDIGO DE TURMA") or "").strip())
        if codigo and codigo not in codigos:
            codigos.append(codigo)

    return codigos


def buscar_ementa(indice, materia, codigos):
    """Objetivos e recomendações da matéria, ou None se ela não está no JSON."""
    for codigo in codigos:
        achou = indice["por_codigo"].get(codigo)
        if achou:
            return achou

    return indice["por_nome"].get(normalizar(materia))
