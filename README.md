# QuadriPlanner

Ferramenta pra ajudar quem estuda na UFABC a montar a grade: mostra, para cada
matéria ofertada no quadrimestre, quais professores dão as turmas e como é a
distribuição de conceitos de cada um — junto com ementa, resumo das reviews,
favoritos e um calendário da grade escolhida.

Os dados de turmas vêm do PDF oficial de turmas ofertadas; as avaliações de
professores vêm da API do [UFABC Next](https://www.ufabcnext.com/app/), a quem
vão todos os créditos por manter esse ecossistema.

## Como funciona

- **`materia_v2.py`** — lê o PDF de turmas ofertadas como tabela (`pdfplumber`)
  e converte pra `turmas.csv`, o cache usado em tempo de execução. Também tem
  as funções que consultam a API do UFABC Next.
- **`ementas.py`** — casa as matérias do PDF com o catálogo de disciplinas
  (`disciplinas_ufabc.json`) pra trazer objetivos e recomendações.
- **`backend.py`** — API Flask de leitura que o frontend consome.
- **`frontend/`** — SPA em React + Vite. Dentro de `src/`:
  - `paginas/` — uma por aba da sidebar (`PaginaToken`, `PaginaRanking`, …)
  - `componentes/` — UI compartilhada (`Componentes.jsx`) e os dialogs
  - `lib/` — lógica sem UI: `token` (o token e o `apiFetch`), `favoritos` e
    `grade` (persistência no `localStorage`), `resumos` (hook das reviews) e
    `textoMatriculas` (texto pra colar no sistema de matrículas)
  - `estilos/` — a folha de estilo única, com as variáveis dos temas
  - `assets/` — imagens
- **`trocar_pdf.py`** — troca o PDF de turmas num novo quadrimestre (ver abaixo).
- **`materia.py`** — primeira versão do script, substituída pelo `materia_v2.py`.
  Fica só como histórico.

### O token da UFABCnext

O backend **não guarda token nenhum**. Quem usa o site cola o próprio token da
UFABCnext na página inicial; ele fica no `localStorage` do navegador e vai no
cabeçalho `X-UFABC-Token` em cada requisição. Assim o backend é sem estado e
duas pessoas podem usar a mesma instância com contas diferentes.

Sem token as abas **Matérias** e **Minha Grade** continuam funcionando (são
dados locais) — só o ranking e os resumos de professores dependem da API.

## Rodando

Backend (porta 5000):

```bash
pip install -r requirements.txt
python backend.py
```

Na primeira execução ele processa o PDF e gera o `turmas.csv`, o que leva alguns
segundos; depois disso a subida é imediata.

Frontend (porta 5173):

```bash
cd frontend
npm install
npm run dev
```

Abra o endereço que o Vite imprimir e cole seu token na página inicial.

## Rotas da API

| Rota | O que faz |
| --- | --- |
| `GET /api/materias?q=<termo>` | matérias que batem com o termo |
| `GET /api/todas-materias` | catálogo completo das matérias ofertadas |
| `GET /api/ementa?materia=<nome>` | objetivos e recomendações da matéria |
| `GET /api/ranking?materia=<nome>` | ranking de professores da matéria |
| `GET /api/resumo?teacher_id=<id>` | resumo das reviews do professor |
| `GET /api/token/validar` | diz se o token enviado é aceito pela API |

As três últimas exigem o cabeçalho `X-UFABC-Token`.

## Novo quadrimestre

Quando sai o PDF de turmas ofertadas do quadrimestre seguinte:

```bash
python trocar_pdf.py caminho/para/matriculas_2026_3_turmas_ofertadas.pdf
```

O script valida o arquivo antes de trocar (só substitui se conseguir extrair a
tabela de turmas), regenera o `turmas.csv` e guarda um `.bak` do PDF antigo.
Reinicie o backend depois.
