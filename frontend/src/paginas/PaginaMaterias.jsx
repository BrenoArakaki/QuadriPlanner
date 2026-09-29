import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { LuSearch, LuTarget, LuLayers, LuGraduationCap, LuUsers, LuBookOpen, LuFileText } from "react-icons/lu";
import { Header, FiltroDropdown } from "../componentes/Componentes";
import DialogResumo from "../componentes/DialogResumo";
import { apiFetch } from "../lib/token";


// A lista inteira (400+ matérias) vem de uma vez do backend, então a busca e
// os filtros rodam aqui no cliente — sem uma requisição por tecla digitada.
const POR_PAGINA = 60;

function normalizar(texto) {
  return (texto || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .trim();
}

export default function PaginaMaterias() {
  const navigate = useNavigate();

  const [materias, setMaterias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [busca, setBusca] = useState("");
  const [filtroCurso, setFiltroCurso] = useState("Todos");
  const [filtroCampus, setFiltroCampus] = useState("Todos");
  const [filtroTurno, setFiltroTurno] = useState("Todos");
  const [limite, setLimite] = useState(POR_PAGINA);

  // ementas[nome] = { carregando, dados, erro } — uma por matéria, buscada na
  // primeira vez que abrem o resumo dela e guardada pra reabrir sem pedir de
  // novo. Qual dialog está aberto é estado separado: só um por vez.
  const [ementas, setEmentas] = useState({});
  const [materiaResumo, setMateriaResumo] = useState(null);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const r = await apiFetch("/api/todas-materias");
        const data = await r.json();
        if (!cancelado) setMaterias(data.materias || []);
      } catch (err) {
        if (!cancelado) setErro("Não foi possível conectar ao backend. Ele está rodando em localhost:5000?");
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();

    return () => { cancelado = true; };
  }, []);

  const cursos = useMemo(
    () => ["Todos", ...[...new Set(materias.flatMap((m) => m.cursos))].sort()],
    [materias]
  );
  const campi = useMemo(
    () => ["Todos", ...[...new Set(materias.flatMap((m) => m.campi))].sort()],
    [materias]
  );
  const turnos = useMemo(
    () => ["Todos", ...[...new Set(materias.flatMap((m) => m.turnos))].sort()],
    [materias]
  );

  const filtradas = useMemo(() => {
    const termo = normalizar(busca);

    return materias.filter((m) => {
      if (termo && !normalizar(m.nome).includes(termo) && !normalizar(m.codigos.join(" ")).includes(termo)) {
        return false;
      }
      if (filtroCurso !== "Todos" && !m.cursos.includes(filtroCurso)) return false;
      if (filtroCampus !== "Todos" && !m.campi.includes(filtroCampus)) return false;
      if (filtroTurno !== "Todos" && !m.turnos.includes(filtroTurno)) return false;
      return true;
    });
  }, [materias, busca, filtroCurso, filtroCampus, filtroTurno]);

  // Mexer na busca ou num filtro recomeça a lista do começo, senão o
  // "Mostrar mais" de uma busca anterior continua valendo pra outra.
  function comReset(setter) {
    return (valor) => {
      setter(valor);
      setLimite(POR_PAGINA);
    };
  }

  // A página de ranking lê ?materia= e já dispara a busca dos professores.
  function buscarProfessores(nome) {
    navigate(`/ranking?materia=${encodeURIComponent(nome)}`);
  }

  async function abrirResumo(materia) {
    setMateriaResumo(materia);

    // já buscada antes (ou buscando agora): o dialog abre com o que tem
    if (ementas[materia.nome]) return;

    setEmentas((e) => ({ ...e, [materia.nome]: { carregando: true } }));

    try {
      const res = await apiFetch(`/api/ementa?materia=${encodeURIComponent(materia.nome)}`);
      const data = await res.json();
      setEmentas((e) => ({
        ...e,
        [materia.nome]: { carregando: false, dados: data.erro ? null : data, erro: data.erro },
      }));
    } catch {
      setEmentas((e) => ({
        ...e,
        [materia.nome]: { carregando: false, erro: "Falha ao conectar com o backend." },
      }));
    }
  }

  return (
    <>
      <Header
        titulo={<>Matérias <span className="accent">ofertadas</span></>}
        subtitulo="Todas as disciplinas com turma no PDF de matrículas deste quadrimestre."
      />

      <div className="card">
        <div className="combobox-wrap materias-busca">
          <LuSearch className="materias-busca-icon" />
          <input
            type="text"
            placeholder="Buscar por nome ou código da disciplina"
            value={busca}
            onChange={(e) => comReset(setBusca)(e.target.value)}
          />
        </div>

        <div className="filtros">
          <FiltroDropdown
            icon={<LuGraduationCap />}
            valor={filtroCurso}
            opcoes={cursos}
            rotuloTodos="Todos os cursos"
            aoMudar={comReset(setFiltroCurso)}
          />
          <FiltroDropdown
            icon={<LuTarget />}
            valor={filtroCampus}
            opcoes={campi}
            rotuloTodos="Todos os campi"
            aoMudar={comReset(setFiltroCampus)}
          />
          <FiltroDropdown
            icon={<LuLayers />}
            valor={filtroTurno}
            opcoes={turnos}
            rotuloTodos="Todos os turnos"
            aoMudar={comReset(setFiltroTurno)}
          />
        </div>
      </div>

      {erro && <p className="erro-msg">{erro}</p>}

      {carregando && (
        <div className="card carregando-card">
          <span className="spinner" />
          <div>
            <strong>Carregando as matérias do PDF...</strong>
            <p className="subtitle">Lendo as turmas ofertadas.</p>
          </div>
        </div>
      )}

      {!carregando && !erro && (
        <>
          <h3 className="ranking-title">
            {filtradas.length} {filtradas.length === 1 ? "matéria" : "matérias"}
            {filtradas.length !== materias.length && <> de {materias.length}</>}
          </h3>

          {filtradas.length === 0 ? (
            <p className="subtitle">Nenhuma matéria bate com essa busca.</p>
          ) : (
            <>
              <div className="materias-grid">
                {filtradas.slice(0, limite).map((materia) => (
                  <div className="materia-card" key={materia.nome}>
                    <div className="materia-card-topo">
                      <h4>{materia.nome}</h4>
                      {materia.codigos.length > 0 && (
                        <span className="materia-codigo">{materia.codigos.join(" · ")}</span>
                      )}
                    </div>

                    <div className="materia-card-meta">
                      <span><LuUsers /> {materia.turmas} {materia.turmas === 1 ? "turma" : "turmas"}</span>
                      {materia.tpi && <span><LuBookOpen /> {materia.tpi}</span>}
                      {materia.campi.length > 0 && <span><LuTarget /> {materia.campi.join(", ")}</span>}
                      {materia.turnos.length > 0 && <span><LuLayers /> {materia.turnos.join(", ")}</span>}
                    </div>

                    <div className="materia-card-cursos" title={materia.cursos.join("\n")}>
                      {materia.cursos.join(" • ")}
                    </div>

                    <div className="materia-card-acoes">
                      <button className="btn-primary materia-card-btn" onClick={() => buscarProfessores(materia.nome)}>
                        Buscar professores
                      </button>
                      <button className="btn-resumo" onClick={() => abrirResumo(materia)}>
                        <LuFileText /> Ver resumo
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {limite < filtradas.length && (
                <button
                  className="btn-primary materias-mais"
                  onClick={() => setLimite((atual) => atual + POR_PAGINA)}
                >
                  Mostrar mais ({filtradas.length - limite} restantes)
                </button>
              )}
            </>
          )}
        </>
      )}

      {materiaResumo && (
        <DialogResumo
          materia={materiaResumo}
          estado={ementas[materiaResumo.nome] || { carregando: true }}
          aoFechar={() => setMateriaResumo(null)}
        />
      )}
    </>
  );
}
