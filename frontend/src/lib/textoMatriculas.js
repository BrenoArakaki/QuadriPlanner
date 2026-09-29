import { aulasDaTurma, formatarHora } from "./grade";

const NOMES_DIAS = {
  domingo: "Domingo",
  segunda: "Segunda-feira",
  terça: "Terça-feira",
  quarta: "Quarta-feira",
  quinta: "Quinta-feira",
  sexta: "Sexta-feira",
  sábado: "Sábado",
};

const NOMES_CAMPUS = {
  SA: "Santo André",
  SB: "São Bernardo do Campo",
};

// O PDF traz "T-P-I" na maioria das turmas e "T-P-E-I" em algumas (as que têm
// crédito de extensão). O último número é sempre o I.
function lerTpi(texto) {
  const partes = (texto || "").split("-").map((p) => Number(p.trim()));
  if (partes.length < 3 || partes.some((n) => Number.isNaN(n))) return null;

  return {
    t: partes[0],
    p: partes[1],
    i: partes[partes.length - 1],
    e: partes.length >= 4 ? partes[2] : null,
  };
}

function rotuloTpi(tpi) {
  return tpi.e == null
    ? `TPI (${tpi.t} - ${tpi.p} - ${tpi.i})`
    : `TPEI (${tpi.t} - ${tpi.p} - ${tpi.e} - ${tpi.i})`;
}

function rotuloFrequencia(frequencia) {
  const quinzenal = frequencia.match(/^quinzenal (I+)$/);
  return quinzenal ? `quinzenal (${quinzenal[1]})` : frequencia;
}

// O nome da turma traz o campus abreviado ("... A3-Matutino (SA)"), e o texto
// da matrícula usa por extenso. Não dá pra ancorar no fim: 10% das turmas têm
// sufixo depois ("(SA) - Carga Horária Extensionista").
function nomeDaTurma(turma) {
  return (turma.turma || "").replace(
    /\((SA|SB)\)/g,
    (trecho, sigla) => `(${NOMES_CAMPUS[sigla] || sigla})`
  );
}

// Créditos (T-P) e carga-horária (T-P-I) somados de toda a grade, nos mesmos
// moldes que a UFABC usa na confirmação de matrícula.
export function totaisDaGrade(grade) {
  let creditos = 0;
  let cargaHoraria = 0;

  grade.forEach((item) => {
    const tpi = lerTpi(item.turma.tpi);
    if (!tpi) return;

    creditos += tpi.t + tpi.p;
    cargaHoraria += tpi.t + tpi.p + tpi.i;
  });

  return { creditos, cargaHoraria };
}

// Monta o texto no formato da confirmação de matrícula da UFABC, pra colar
// direto onde for preciso.
export function textoMatriculas(grade) {
  const { creditos, cargaHoraria } = totaisDaGrade(grade);
  const turmas = [];

  grade.forEach((item) => {
    const turma = item.turma;
    const tpi = lerTpi(turma.tpi);

    turmas.push(
      [
        turma.codigo_disciplina,
        nomeDaTurma(turma),
        tpi && rotuloTpi(tpi),
        turma.campus && `Campus ${NOMES_CAMPUS[turma.campus] || turma.campus}`,
      ]
        .filter(Boolean)
        .join(" - ")
    );

    aulasDaTurma(turma).forEach((aula) => {
      turmas.push(
        `${NOMES_DIAS[aula.dia] || aula.dia} das ${formatarHora(aula.inicio)} às ` +
          `${formatarHora(aula.fim)} - ${rotuloFrequencia(aula.frequencia)}`
      );
    });
  });

  return [
    `Créditos (T-P): ${creditos}`,
    `Carga-horária (T-P-I): ${cargaHoraria}`,
    "Solicitou matrículas nas seguintes turmas:",
    ...turmas,
  ].join("\n");
}
