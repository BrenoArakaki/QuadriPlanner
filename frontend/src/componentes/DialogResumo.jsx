import { useEffect } from "react";
import { LuX } from "react-icons/lu";

// As recomendações vêm num campo de texto só: às vezes é uma lista de
// disciplinas separada por ";", às vezes é frase corrida ("É recomendado que
// o aluno..."). Lista virando <ul> fica muito mais legível, então separamos
// quando os pedaços têm cara de nome de matéria — curtos e mais de um.
function listaDeRecomendacoes(texto) {
  const partes = (texto || "").split(";").map((p) => p.trim()).filter(Boolean);
  const eLista = partes.length > 1 && partes.every((p) => p.length <= 70);
  return eLista ? partes : null;
}

function Corpo({ estado }) {
  if (estado.carregando) return <p className="subtitle">Carregando resumo...</p>;
  if (estado.erro) return <p className="subtitle">{estado.erro}</p>;

  const { objetivos, recomendacoes } = estado.dados;
  const recomendadas = listaDeRecomendacoes(recomendacoes);

  return (
    <>
      {objetivos?.trim() && (
        <div className="materia-resumo-bloco">
          <h5>Objetivos</h5>
          <p>{objetivos}</p>
        </div>
      )}

      {recomendacoes?.trim() && (
        <div className="materia-resumo-bloco">
          <h5>Recomendações</h5>
          {recomendadas ? (
            <ul className="materia-recomendacoes">
              {recomendadas.map((rec) => <li key={rec}>{rec}</li>)}
            </ul>
          ) : (
            <p>{recomendacoes}</p>
          )}
        </div>
      )}
    </>
  );
}

export default function DialogResumo({ materia, estado, aoFechar }) {
  // Esc fecha: o dialog cobre a página inteira e é só leitura, então sair
  // dele tem que ser mais fácil que acertar o X.
  useEffect(() => {
    function aoTeclar(e) {
      if (e.key === "Escape") aoFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aoFechar]);

  return (
    <div className="dialog-overlay" onClick={aoFechar}>
      <div className="dialog dialog-resumo" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-topo">
          <div>
            <h3>{materia.nome}</h3>
            <p className="subtitle">
              {[materia.codigos.join(" · "), materia.tpi && `T-P-E-I ${materia.tpi}`]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <button className="dialog-fechar" onClick={aoFechar} title="Fechar">
            <LuX />
          </button>
        </div>

        <div className="dialog-resumo-corpo">
          <Corpo estado={estado} />
        </div>

        <div className="dialog-acoes">
          <button className="btn-secundario" onClick={aoFechar}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
