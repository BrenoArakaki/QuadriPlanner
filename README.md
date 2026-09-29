# 📚 QuadriPlanner

O **QuadriPlanner** é uma ferramenta para estudantes da **UFABC** pesquisarem disciplinas, compararem professores e montarem sua grade quadrimestral em um só lugar.

Os dados das turmas são obtidos a partir do **PDF oficial de turmas ofertadas da UFABC**, enquanto as avaliações dos professores são obtidas através da API do [UFABC Next](https://www.ufabcnext.com/).

## ✨ Funcionalidades

### 📚 Matérias

Pesquise pelas disciplinas ofertadas no quadrimestre e consulte suas turmas, horários e professores.
<img width="1882" height="963" alt="image" src="https://github.com/user-attachments/assets/25126372-ba66-4a0b-8b28-97c8775e54a7" />

### 👨‍🏫 Ranking de Professores

Compare os professores de uma disciplina através da distribuição de conceitos e avaliações disponíveis.
<img width="1882" height="950" alt="image" src="https://github.com/user-attachments/assets/33585f0e-ced4-4020-a3cb-c3ee38956134" />

### ⭐ Favoritos

Salve matérias e professores para acessá-los rapidamente posteriormente.
<img width="1737" height="882" alt="image" src="https://github.com/user-attachments/assets/610bbcb9-72fa-4e02-815d-88f7682bb6bd" />

### 🗓️ Minha Grade

Monte sua grade selecionando as turmas desejadas e visualize os horários em um calendário.
<img width="1865" height="882" alt="image" src="https://github.com/user-attachments/assets/a24d47e1-5eb9-48e6-84f0-7f45dadeb453" />

## 🛠️ Tecnologias

**Frontend**

* React
* Vite
* JavaScript
* CSS

**Backend**

* Python
* Flask
* pdfplumber

**APIs e dados**

* UFABC Next API
* PDF oficial de turmas da UFABC
* Catálogo de disciplinas da UFABC

## 🚀 Como executar

### Backend

```bash
pip install -r requirements.txt
python backend.py
```

O backend será executado na porta `5000`. Na primeira execução, o PDF de turmas é processado e o `turmas.csv` é gerado.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend será disponibilizado pelo Vite, normalmente em `http://localhost:5173`.

## 🔑 Token UFABC Next

Para acessar o ranking e os resumos de professores, o usuário informa seu próprio token do UFABC Next.

O token fica armazenado no `localStorage` do navegador e é enviado através do header `X-UFABC-Token`.

O backend não armazena tokens.

## 🔄 Atualização do quadrimestre

Para atualizar as turmas quando um novo PDF for disponibilizado:

```bash
python trocar_pdf.py caminho/para/novo_pdf.pdf
```

O script valida o PDF, cria um backup do arquivo anterior e gera um novo `turmas.csv`.

---

### 🎓 Sobre

Projeto desenvolvido para facilitar o planejamento da grade e a escolha de disciplinas na UFABC.
