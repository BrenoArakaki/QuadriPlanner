import { useState, useMemo } from "react";
import { LuCopy, LuCheck } from "react-icons/lu";
import { Header, ProfCard } from "../componentes/Componentes";
import { textoMatriculas, totaisDaGrade } from "../lib/textoMatriculas";
import { useResumos } from "../lib/resumos";
import { lerFavoritos, ehFavorito, alternarFavorito } from "../lib/favoritos";
import { lerGrade, removerDaGrade, aulasDaTurma, docentesDaTurma, nomeDocente, formatarHora } from "../lib/grade";

const DIAS_EXIBIDOS = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const NOMES_DIAS = {
  segunda: "Segunda",
  terça: "Terça",
  quarta: "Quarta",
  quinta: "Quinta",
  sexta: "Sexta",
  sábado: "Sábado",
};

const INICIO_MIN = 8 * 60;
const FIM_MIN = 23 * 60;
const ALTURA_SLOT = 16; // px por bloco de 30 min
// Oito cores que continuam distinguíveis entre si duas a duas, inclusive nos
// três tipos de daltonismo (pior par: ΔE 17.4 na visão normal, 10.3 simulando
// deuteranopia — os pisos são 15 e 8). A cor do texto vem junto porque as
// claras pedem tinta escura e as escuras pedem branco.
const CORES = [
  { fundo: "#64a1ee", texto: "#05261a" },
  { fundo: "#ff939c", texto: "#05261a" },
  { fundo: "#94aa44", texto: "#05261a" },
  { fundo: "#7e5db1", texto: "#ffffff" },
  { fundo: "#f2cd64", texto: "#05261a" },
  { fundo: "#008474", texto: "#ffffff" },
  { fundo: "#a75c00", texto: "#ffffff" },
  { fundo: "#4aebeb", texto: "#05261a" },
];
const COR_EXTRA = { fundo: "#8b96ab", texto: "#ffffff" };

// A cor sai da ordem em que a matéria entrou na grade, não de um hash do nome:
// hash dava colisão (duas matérias na mesma cor) e ainda repetia a paleta.
function coresDaGrade(grade) {
  const mapa = new Map();
  grade.forEach((item) => {
    if (!mapa.has(item.materia)) mapa.set(item.materia, CORES[mapa.size] || COR_EXTRA);
  });
  return mapa;
}

// Linhas de 30 min do grid (há turmas começando 14:30 / terminando 18:30).
const SLOTS = [];
for (let m = INICIO_MIN; m < FIM_MIN; m += 30) SLOTS.push(m);

// Rótulos de hora cheia. Vai até FIM_MIN inclusive pra marcar o fim da
// última aula (23:00) na linha de baixo da grade.
const MARCAS_HORA = [];
for (let m = INICIO_MIN; m <= FIM_MIN; m += 60) MARCAS_HORA.push(m);

function linhaDoMinuto(min) {
  return Math.round((min - INICIO_MIN) / 30) + 2;
}

function MiniCalendario({ titulo, eventos, cores, onRemover }) {
  return (
    <div className="card grade-card">
      <h3 className="grade-semana-titulo">{titulo}</h3>
      <div
        className="grade-grid"
        style={{
          gridTemplateColumns: `44px repeat(${DIAS_EXIBIDOS.length}, 1fr)`,
          // A linha extra de 0px no fim ancora o rótulo das 23:00 na última
          // divisória da grade, igual aos outros rótulos de hora.
          gridTemplateRows: `28px repeat(${SLOTS.length}, ${ALTURA_SLOT}px) 0px`,
        }}
      >
        {DIAS_EXIBIDOS.map((dia, i) => (
          <div key={dia} className="grade-dia-header" style={{ gridColumn: i + 2, gridRow: 1 }}>
            {NOMES_DIAS[dia]}
          </div>
        ))}

        {MARCAS_HORA.map((m) => (
          <div key={m} className="grade-hora-label" style={{ gridColumn: 1, gridRow: linhaDoMinuto(m) }}>
            {formatarHora(m)}
          </div>
        ))}

        {SLOTS.map((m, i) =>
          DIAS_EXIBIDOS.map((dia, j) => (
            <div
              key={`${dia}-${m}`}
              className={`grade-celula ${m % 60 === 0 ? "hora-cheia" : ""}`}
              style={{ gridColumn: j + 2, gridRow: i + 2 }}
            />
          ))
        )}

        {eventos.map(({ item, aula }) => {
          const colDia = DIAS_EXIBIDOS.indexOf(aula.dia) + 2;
          const docentes = aula.docentes.map(nomeDocente).join(", ");
          const cor = cores.get(item.materia) || COR_EXTRA;

          return (
            <div
              key={`${item.turma.codigo}-${aula.tipo}-${aula.dia}-${aula.inicio}`}
              className="grade-evento"
              style={{
                gridColumn: colDia,
                gridRow: `${linhaDoMinuto(aula.inicio)} / ${linhaDoMinuto(aula.fim)}`,
                background: cor.fundo,
                color: cor.texto,
              }}
              title={`${item.materia} — ${aula.tipo} com ${docentes || "docente não informado"} (${aula.texto}). Clique para remover da grade.`}
              onClick={() => onRemover(item)}
            >
              <strong>{item.materia}</strong>
              <span>{aula.tipo}{docentes && ` · ${docentes}`}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PaginaGrade() {
  const [grade, setGrade] = useState(() => lerGrade());
  const [favoritos, setFavoritos] = useState(() => lerFavoritos());
  const { resumos, alternarResumo } = useResumos();
  const [statusCopia, setStatusCopia] = useState("");

  function handleRemover(item) {
    setStatusCopia("");
    setGrade((atual) => removerDaGrade(atual, item));
  }

  function handleAlternarFavorito(prof) {
    setFavoritos((atual) => alternarFavorito(atual, prof));
  }

  async function copiarMaterias() {
    try {
      await navigator.clipboard.writeText(textoMatriculas(grade));
      setStatusCopia("copiado");
    } catch {
      // clipboard exige contexto seguro (https ou localhost)
      setStatusCopia("erro");
    }
  }

  const { semana1, semana2, semHorario } = useMemo(() => {
    const semana1 = [];
    const semana2 = [];
    const semHorario = [];

    grade.forEach((item) => {
      const aulas = aulasDaTurma(item.turma).filter((a) => DIAS_EXIBIDOS.includes(a.dia));

      if (aulas.length === 0) {
        semHorario.push(item);
        return;
      }

      aulas.forEach((aula) => {
        if (aula.frequencia !== "quinzenal II") semana1.push({ item, aula });
        if (aula.frequencia !== "quinzenal I") semana2.push({ item, aula });
      });
    });

    return { semana1, semana2, semHorario };
  }, [grade]);

  const { creditos, cargaHoraria } = useMemo(() => totaisDaGrade(grade), [grade]);
  const cores = useMemo(() => coresDaGrade(grade), [grade]);

  const temQuinzenal = grade.some((item) =>
    aulasDaTurma(item.turma).some((a) => a.frequencia !== "semanal")
  );

  return (
    <>
      <Header
        titulo={<>Minha <span className="accent">grade</span> horária</>}
        subtitulo="Matérias que você adicionou, organizadas num mini calendário semanal."
        acoes={
          grade.length > 0 && (
            <button className="btn-secundario btn-copiar" onClick={copiarMaterias}>
              {statusCopia === "copiado" ? <LuCheck /> : <LuCopy />}
              {statusCopia === "copiado" ? "Copiado!" : "Copiar matérias"}
            </button>
          )
        }
      />

      {grade.length === 0 ? (
        <p className="subtitle">
          Sua grade está vazia. No ranking, clique no ícone de calendário num professor pra escolher a turma e adicionar a matéria aqui.
        </p>
      ) : (
        <>
          <div className="grade-acoes">
            <div className="grade-totais">
              <span className="grade-total">
                <strong>{creditos}</strong> créditos (T-P)
              </span>
              <span className="grade-total">
                <strong>{cargaHoraria}</strong> de carga-horária (T-P-I)
              </span>
              <span className="grade-total">
                <strong>{grade.length}</strong> {grade.length === 1 ? "matéria" : "matérias"}
              </span>
            </div>
            {statusCopia === "erro" && (
              <span className="erro-msg">Seu navegador bloqueou a cópia. Tente pelo localhost ou copie na mão.</span>
            )}
          </div>

          <MiniCalendario titulo={temQuinzenal ? "Semana 1 (quinzenal I)" : "Semana única"} eventos={semana1} cores={cores} onRemover={handleRemover} />
          {temQuinzenal && <MiniCalendario titulo="Semana 2 (quinzenal II)" eventos={semana2} cores={cores} onRemover={handleRemover} />}

          {semHorario.length > 0 && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Sem horário identificado</h3>
              <p className="subtitle">Essas turmas estão na sua grade, mas o PDF não trouxe um horário reconhecível.</p>
              {semHorario.map((item) => (
                <div key={item.turma.codigo} className="grade-item-solto">
                  <span>{item.materia} — {item.professor}</span>
                  <button onClick={() => handleRemover(item)}>Remover</button>
                </div>
              ))}
            </div>
          )}

          <h3 className="ranking-title">Professores da <span className="accent">sua grade</span></h3>
          {grade.flatMap((item) =>
            // Uma turma pode ter teoria e prática com docentes diferentes, e a
            // pessoa vai ter aula com os dois — então cada um ganha seu card.
            docentesDaTurma(item.turma).map(({ docente, aulas }) => {
              const prof = {
                teacher_id: docente.teacher_id,
                professor: nomeDocente(docente),
                materia: item.materia,
                a_percent: docente.a_percent,
                distribuicao: docente.distribuicao,
                amostras: docente.amostras,
                url: docente.url,
                turma: item.turma,
                aulas,
              };

              return (
                <ProfCard
                  key={`${item.turma.codigo}-${docente.teacher_id || prof.professor}`}
                  prof={prof}
                  resumo={resumos[prof.teacher_id]}
                  aoAlternarResumo={alternarResumo}
                  favoritado={ehFavorito(favoritos, prof.teacher_id)}
                  aoAlternarFavorito={handleAlternarFavorito}
                  naGrade
                  aoAlternarGrade={() => handleRemover(item)}
                />
              );
            })
          )}
        </>
      )}
    </>
  );
}
