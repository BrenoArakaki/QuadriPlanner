const CHAVE = "grade";

const DIAS_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

// A unidade da grade é a TURMA, não o professor: uma turma é um código de
// matrícula que já vem com teoria e prática juntas, às vezes com docentes
// diferentes em cada parte. Guardamos os dados do professor escolhido junto,
// pra página da grade montar o card sem precisar de outra requisição.
export function montarItemGrade(prof, turma) {
  return {
    teacher_id: prof.teacher_id,
    professor: prof.professor,
    materia: prof.materia,
    a_percent: prof.a_percent,
    distribuicao: prof.distribuicao,
    amostras: prof.amostras,
    url: prof.url,
    turma,
  };
}

export function lerGrade() {
  try {
    const bruto = localStorage.getItem(CHAVE);
    const lista = bruto ? JSON.parse(bruto) : [];
    // descarta entradas salvas antes da grade passar a guardar a turma inteira
    return lista.filter((item) => item && item.turma && item.turma.codigo);
  } catch {
    return [];
  }
}

function salvar(lista) {
  localStorage.setItem(CHAVE, JSON.stringify(lista));
  return lista;
}

function normalizarMateria(materia) {
  return (materia || "").trim().toUpperCase();
}

export function adicionarNaGrade(grade, item) {
  return salvar([...grade, item]);
}

export function removerDaGrade(grade, item) {
  return salvar(grade.filter((g) => g.turma.codigo !== item.turma.codigo));
}

// O card do ranking é por professor, então ele está "na grade" quando alguma
// turma dele já foi escolhida para essa matéria.
export function itemDoProfNaGrade(grade, prof) {
  return (
    grade.find(
      (g) =>
        g.teacher_id === prof.teacher_id &&
        normalizarMateria(g.materia) === normalizarMateria(prof.materia)
    ) || null
  );
}

// Você cursa a matéria uma vez só: se ela já está na grade (com qualquer
// professor ou turma), a segunda entrada seria sempre engano.
export function materiaJaNaGrade(grade, materia) {
  return grade.find((g) => normalizarMateria(g.materia) === normalizarMateria(materia)) || null;
}

export function formatarHora(min) {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}`;
}

// Uma turma pode ter mais de um encontro por semana, e o PDF não usa um
// separador próprio entre eles: emenda tudo com vírgula, a mesma vírgula que
// separa sala e frequência dentro de um encontro. O que marca o começo de um
// encontro novo é sempre "<dia> das" — e é aí que cortamos.
//
// Ex.: "segunda das 10:00 às 12:00, sala A-102-0, quinzenal II, quinta das
// 08:00 às 10:00, sala A 102-0, semanal" vira dois encontros, cada um com sua
// frequência: toda semana ("semanal") ou só numa das duas semanas do ciclo
// ("quinzenal I" / "II"). Blocos em formato não reconhecido são ignorados.
const PADRAO_ENCONTRO = new RegExp(`(?=(?:${DIAS_SEMANA.join("|")})\\s+das\\s)`, "i");

export function parseHorario(texto) {
  if (!texto) return [];

  return texto
    .split(PADRAO_ENCONTRO)
    // sobra a vírgula que emendava este encontro no anterior
    .map((bloco) => bloco.trim().replace(/[,;]\s*$/, "").trim())
    .filter(Boolean)
    .map((bloco) => {
      const dia = DIAS_SEMANA.find((d) => bloco.toLowerCase().includes(d));
      const matchHora = bloco.match(/(\d{1,2}):(\d{2})\s*às\s*(\d{1,2}):(\d{2})/i);
      if (!dia || !matchHora) return null;

      const blocoMinusculo = bloco.toLowerCase();
      let frequencia = "semanal";
      if (blocoMinusculo.includes("quinzenal ii")) frequencia = "quinzenal II";
      else if (blocoMinusculo.includes("quinzenal i")) frequencia = "quinzenal I";

      const [, hi, mi, hf, mf] = matchHora;
      return {
        dia,
        inicio: Number(hi) * 60 + Number(mi),
        fim: Number(hf) * 60 + Number(mf),
        frequencia,
        texto: bloco,
      };
    })
    .filter(Boolean);
}

// Todos os encontros de uma turma, marcando de qual parte cada um veio e
// quem dá aula nela — é isso que permite mostrar no calendário que a prática
// é com outro professor.
export function aulasDaTurma(turma) {
  if (!turma) return [];

  return [
    ...parseHorario(turma.horario_teoria).map((aula) => ({
      ...aula,
      tipo: "teoria",
      docentes: turma.docentes_teoria || [],
    })),
    ...parseHorario(turma.horario_pratica).map((aula) => ({
      ...aula,
      tipo: "prática",
      docentes: turma.docentes_pratica || [],
    })),
  ];
}

// Um docente vem da API como objeto completo; quando a API não achou o nome
// do PDF, vem só { nome }.
export function nomeDocente(docente) {
  if (!docente) return "";
  if (typeof docente === "string") return docente;
  return docente.professor || docente.nome || "";
}

// Agrupa os encontros da turma por docente, porque teoria e prática podem ser
// com professores diferentes e a pessoa quer ver a avaliação dos dois — não
// só a de quem ela escolheu no ranking.
export function docentesDaTurma(turma) {
  const porDocente = new Map();

  aulasDaTurma(turma).forEach((aula) => {
    aula.docentes.forEach((docente) => {
      const chave = (typeof docente === "object" && docente.teacher_id) || nomeDocente(docente);
      if (!chave) return;

      if (!porDocente.has(chave)) porDocente.set(chave, { docente, aulas: [] });
      porDocente.get(chave).aulas.push(aula);
    });
  });

  return [...porDocente.values()];
}

// Duas aulas conflitam se caem no mesmo dia com horários sobrepostos e pelo
// menos uma delas acontece naquela semana: "semanal" está nas duas semanas do
// ciclo, então bate com qualquer coisa; "quinzenal I" só bate com "semanal"
// ou outra "quinzenal I" (nunca com "quinzenal II", que é a outra semana).
function aulasConflitam(a, b) {
  if (a.dia !== b.dia) return false;

  const sobrepoe = a.inicio < b.fim && b.inicio < a.fim;
  if (!sobrepoe) return false;

  if (a.frequencia === "semanal" || b.frequencia === "semanal") return true;
  return a.frequencia === b.frequencia;
}

// Primeiro choque de horário entre uma turma candidata e o que já está na
// grade. Retorna { item, aulaNova, aulaExistente } ou null se está livre.
export function conflitoDaTurma(grade, turma) {
  const novas = aulasDaTurma(turma);

  for (const item of grade) {
    if (item.turma.codigo === turma.codigo) continue;

    for (const aulaNova of novas) {
      for (const aulaExistente of aulasDaTurma(item.turma)) {
        if (aulasConflitam(aulaNova, aulaExistente)) {
          return { item, aulaNova, aulaExistente };
        }
      }
    }
  }

  return null;
}

export function descreverConflito(conflito) {
  const { dia, inicio, fim } = conflito.aulaExistente;
  return `${conflito.item.materia} (${dia}, ${formatarHora(inicio)}–${formatarHora(fim)})`;
}

export { DIAS_SEMANA };
