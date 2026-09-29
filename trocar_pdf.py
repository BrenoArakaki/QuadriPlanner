"""
Troca o PDF de turmas ofertadas — ferramenta de administrador.

Antes isso era um upload no próprio site, o que deixava qualquer visitante
substituir os dados de todo mundo. Agora a troca acontece aqui, na máquina que
hospeda o backend.

Uso:
  python trocar_pdf.py caminho/para/matriculas_2026_3_turmas_ofertadas.pdf

O script valida o PDF antes de trocar: extrai a tabela de turmas do arquivo
novo e só substitui o atual se a extração der certo, pra um PDF errado (ou um
export sem a tabela) não derrubar o site. Depois de rodar, reinicie o backend.
"""

import os
import sys
import shutil

from materia_v2 import PDF_PATH, CSV_CACHE, carregar_tabela, garantir_csv


def trocar(caminho_novo):
    if not os.path.exists(caminho_novo):
        return f"Arquivo não encontrado: {caminho_novo}"

    if not caminho_novo.lower().endswith(".pdf"):
        return "O arquivo precisa ser um .pdf"

    print(f"Lendo {caminho_novo}...")
    try:
        _, linhas = carregar_tabela(caminho_novo)
    except Exception as e:
        return f"Não consegui extrair a tabela de turmas desse PDF: {e}"

    if not linhas:
        return "O PDF tem a tabela de turmas, mas ela está vazia."

    print(f"OK: {len(linhas)} turmas encontradas.")

    # O PDF atual vira .bak antes de sair, pra dar pra voltar atrás
    if os.path.exists(PDF_PATH):
        backup = PDF_PATH + ".bak"
        shutil.copy2(PDF_PATH, backup)
        print(f"Backup do anterior: {backup}")

    shutil.copy2(caminho_novo, PDF_PATH)

    # o CSV é cache do PDF: sem apagar, garantir_csv mantém o antigo
    if os.path.exists(CSV_CACHE):
        os.remove(CSV_CACHE)
    garantir_csv(PDF_PATH, CSV_CACHE)

    print(f"\nPronto: {PDF_PATH} atualizado e {CSV_CACHE} regerado.")
    print("Reinicie o backend (python backend.py) pra ele carregar as turmas novas.")
    return None


def main():
    if len(sys.argv) != 2:
        print(__doc__.strip())
        return 1

    erro = trocar(sys.argv[1])
    if erro:
        print(f"ERRO: {erro}")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
