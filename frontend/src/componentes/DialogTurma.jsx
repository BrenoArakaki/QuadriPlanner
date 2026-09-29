import { useState, useMemo } from "react";
import { LuX, LuTriangleAlert } from "react-icons/lu";
import { conflitoDaTurma, descreverConflito, aulasDaTurma, formatarHora, nomeDocente } from "../lib/grade";

function LinhaAula({ aula }) {
  return (
    <div className="dialog-aula">
      <span className={`dialog-tag tag-${aula.tipo === "teoria" ? "teoria" : "pratica"}`}>{aula.tipo}</span>
      <span className="dialog-aula-horario">
        {aula.dia} {formatarHora(aula.inicio)}–{formatarHora(aula.fim)}
        {aula.frequencia !== "semanal" && <em> · {aula.frequencia}</em>}
      </span>
      {aula.docentes.map((docente, i) => (
        <span className="dialog-aula-docente" key={i}>
          {nomeDocente(docente)}
          {/* a nota do docente da prática costuma ser o que decide a escolha */}
          {docente.a_percent != null && <strong> {docente.a_percent}% A</strong>}
        </span>
      ))}
    </div>
  );
}

export default function DialogTurma({ prof, grade, aoFechar, aoConfirmar }) {
  // Cada turma já vem com o choque calculado, pra pessoa ver antes de escolher
  // em vez de descobrir depois que confirmou.
  const opcoes = useMemo(
    () =>
      (prof.turmas || []).map((turma) => ({
        turma,
        aulas: aulasDaTurma(turma),
        conflito: conflitoDaTurma(grade, turma),
      })),
    [prof, grade]
  );

  const primeiraLivre = opcoes.find((o) => !o.conflito);
  const [escolhida, setEscolhida] = useState(primeiraLivre ? primeiraLivre.turma.codigo : null);

  const selecionada = opcoes.find((o) => o.turma.codigo === escolhida);
  const todasEmConflito = opcoes.length > 0 && opcoes.every((o) => o.conflito);

  return (
    <div className="dialog-overlay" onClick={aoFechar}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-topo">
          <div>
            <h3>Escolha a turma</h3>
            <p className="subtitle">
              {prof.materia} · {prof.professor}
            </p>
          </div>
          <button className="dialog-fechar" onClick={aoFechar} title="Fechar">
            <LuX />
          </button>
        </div>

        {opcoes.length === 0 ? (
          <p className="subtitle">Esse professor não tem turmas com horário nessa matéria.</p>
        ) : (
          <div className="dialog-lista">
            {opcoes.map(({ turma, aulas, conflito }) => (
              <label
                key={turma.codigo}
                className={`dialog-opcao ${escolhida === turma.codigo ? "selecionada" : ""} ${conflito ? "em-conflito" : ""}`}
              >
                <input
                  type="radio"
                  name="turma"
                  value={turma.codigo}
                  checked={escolhida === turma.codigo}
                  disabled={!!conflito}
                  onChange={() => setEscolhida(turma.codigo)}
                />

                <div className="dialog-opcao-corpo">
                  <div className="dialog-opcao-titulo">
                    {turma.turma}
                    <span className="dialog-codigo">{turma.codigo}</span>
                  </div>
                  <div className="dialog-opcao-meta">
                    {[turma.campus, turma.turno].filter(Boolean).join(" · ")}
                  </div>

                  {aulas.length === 0 ? (
                    <div className="dialog-aula">
                      <span className="dialog-aula-horario">Sem horário no PDF</span>
                    </div>
                  ) : (
                    aulas.map((aula, i) => <LinhaAula key={i} aula={aula} />)
                  )}

                  {conflito && (
                    <div className="dialog-conflito">
                      <LuTriangleAlert /> Choca com {descreverConflito(conflito)}
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}

        {todasEmConflito && (
          <p className="erro-msg">
            Todas as turmas desse professor batem com algo que já está na sua grade.
          </p>
        )}

        <div className="dialog-acoes">
          <button className="btn-secundario" onClick={aoFechar}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            disabled={!selecionada}
            onClick={() => aoConfirmar(selecionada.turma)}
          >
            Adicionar à grade
          </button>
        </div>
      </div>
    </div>
  );
}
