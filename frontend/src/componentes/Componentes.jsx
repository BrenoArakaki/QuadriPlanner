import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { aulasDaTurma, formatarHora, nomeDocente } from "../lib/grade";
import { temToken } from "../lib/token";
import {
  LuGraduationCap,
  LuHouse,
  LuStar,
  LuInfo,
  LuSun,
  LuMoon,
  LuChevronDown,
  LuMenu,
  LuX,
  LuCalendarPlus,
  LuCalendarCheck,
  LuClock,
  LuCalendarDays,
  LuBookOpen,
  LuTarget,
} from "react-icons/lu";

export const ORDEM_CONCEITOS = ["A", "B", "C", "D", "F", "O"];
export const CORES_CONCEITOS = {
  A: "#2ecc87",
  B: "#a8e063",
  C: "#f7b955",
  D: "#f79320",
  F: "#f2545b",
  O: "#8c8c8c",
};

export function iniciais(nome) {
  const partes = nome.trim().split(/\s+/);
  return partes.slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("");
}

// Mostra se já existe token salvo, pra pessoa não descobrir que esqueceu
// só quando o ranking vier vazio. Ouve o evento disparado por salvarToken().
function IndicadorToken() {
  const [tem, setTem] = useState(() => temToken());

  useEffect(() => {
    function atualizar() {
      setTem(temToken());
    }
    window.addEventListener("ufabc-token", atualizar);
    window.addEventListener("storage", atualizar);
    return () => {
      window.removeEventListener("ufabc-token", atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, []);

  return (
    <Link to="/" className={`token-indicador ${tem ? "ativo" : ""}`}>
      <span className="status-dot" />
      {tem ? "Token configurado" : "Configurar token"}
    </Link>
  );
}

export function Sidebar({ aberto, aoFechar, tema, aoAlternarTema }) {
  const location = useLocation();

  return (
    <>
      {aberto && <div className="sidebar-overlay" onClick={aoFechar} />}

      <aside className={`sidebar ${aberto ? "sidebar-aberta" : ""}`}>
        <div className="sidebar-logo">
          <span className="icon"><LuGraduationCap /></span>
          <div>
            <div className="title">QuadriPlanner</div>
            <div className="subtitle">UFABC</div>
          </div>
          <button className="sidebar-fechar" onClick={aoFechar}>
            <LuX />
          </button>
        </div>

        <nav className="sidebar-nav">
          <Link to="/" className={`nav-item ${location.pathname === "/" ? "active" : ""}`} onClick={aoFechar}>
            <LuHouse /> Início
          </Link>
          <Link to="/ranking" className={`nav-item ${location.pathname === "/ranking" ? "active" : ""}`} onClick={aoFechar}>
            <LuTarget /> Ranking
          </Link>
          <Link to="/materias" className={`nav-item ${location.pathname === "/materias" ? "active" : ""}`} onClick={aoFechar}>
            <LuBookOpen /> Matérias
          </Link>
          <Link to="/favoritos" className={`nav-item ${location.pathname === "/favoritos" ? "active" : ""}`} onClick={aoFechar}>
            <LuStar /> Professores Favoritos
          </Link>
          <Link to="/grade" className={`nav-item ${location.pathname === "/grade" ? "active" : ""}`} onClick={aoFechar}>
            <LuCalendarDays /> Minha Grade
          </Link>
          <Link to="/sobre" className={`nav-item ${location.pathname === "/sobre" ? "active" : ""}`} onClick={aoFechar}>
            <LuInfo /> Sobre
          </Link>
        </nav>

        <div className="sidebar-footer">
          <IndicadorToken />

          <div className="theme-toggle">
            <LuSun className={tema === "light" ? "icon-on" : "icon-off"} />
            <div
              className={`switch ${tema === "dark" ? "is-dark" : "is-light"}`}
              onClick={() => aoAlternarTema(tema === "dark" ? "light" : "dark")}
            >
              <div className="knob" />
            </div>
            <LuMoon className={tema === "dark" ? "icon-on" : "icon-off"} />
          </div>
        </div>
      </aside>
    </>
  );
}

// Barra que aparece só no topo em telas pequenas, com o botão de hambúrguer
export function TopbarMobile({ aoAbrirMenu }) {
  return (
    <div className="topbar-mobile">
      <button className="hamburguer-btn" onClick={aoAbrirMenu}>
        <LuMenu />
      </button>
      <div className="topbar-logo">
        <LuGraduationCap /> QuadriPlanner
      </div>
    </div>
  );
}

export function Header({ titulo, subtitulo, acoes }) {
  return (
    <div className="main-header">
      <div>
        <h1>{titulo}</h1>
        <p className="subtitle">{subtitulo}</p>
      </div>

      {acoes && <div className="main-header-acoes">{acoes}</div>}
    </div>
  );
}

// Dropdown customizado (substitui o <select> nativo, que fica feio e
// difere muito de navegador pra navegador).
export function FiltroDropdown({ icon, valor, opcoes, rotuloTodos, aoMudar }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function aoClicarFora(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  return (
    <div className="filtro-dropdown" ref={ref}>
      <button type="button" className="filtro-btn" onClick={() => setAberto(!aberto)}>
        {icon}
        <span>{valor === "Todos" ? rotuloTodos : valor}</span>
        <LuChevronDown className={`filtro-chevron ${aberto ? "open" : ""}`} />
      </button>

      {aberto && (
        <div className="filtro-lista">
          {opcoes.map((op) => (
            <div
              key={op}
              className={`filtro-opcao ${valor === op ? "selecionada" : ""}`}
              onClick={() => {
                aoMudar(op);
                setAberto(false);
              }}
            >
              {op === "Todos" ? rotuloTodos : op}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function BarraConceitos({ distribuicao }) {
  if (!distribuicao || Object.keys(distribuicao).length === 0) {
    return <div className="barra" />;
  }

  const total = ORDEM_CONCEITOS.reduce((soma, c) => soma + (distribuicao[c] || 0), 0) || 1;

  return (
    <div className="barra">
      {ORDEM_CONCEITOS.map((conceito) => {
        const quantidade = distribuicao[conceito] || 0;
        if (quantidade === 0) return null;
        return (
          <div
            key={conceito}
            title={`${conceito}: ${quantidade}`}
            style={{ width: `${(quantidade / total) * 100}%`, background: CORES_CONCEITOS[conceito] || "#ccc" }}
          />
        );
      })}
    </div>
  );
}

export function ResumoProfessor({ resumo }) {
  if (resumo.carregando) return <p className="subtitle">Carregando resumo...</p>;
  if (resumo.erro) return <p className="erro-msg">{resumo.erro}</p>;

  const d = resumo.dados;
  if (!d) return null;

  return (
    <>
      <p className="quote">❝ {d.summary}</p>
      <div className="resumo-meta">
        {d.didacticQuality != null && <span>Nota didática: <strong>{d.didacticQuality}</strong></span>}
        {d.commentsCount != null && <span>{d.commentsCount} comentários</span>}
        {d.takesAttendance != null && <span>{d.takesAttendance ? "Faz chamada" : "Não faz chamada"}</span>}
        {d.usesSigaa != null && <span>{d.usesSigaa ? "Usa SIGAA" : "Não usa SIGAA"}</span>}
        {d.usesMoodle != null && <span>{d.usesMoodle ? "Usa Moodle" : "Não usa Moodle"}</span>}
      </div>
    </>
  );
}

function unicos(lista) {
  return [...new Set(lista.filter(Boolean))];
}

// No ranking o card representa o professor, que pode dar várias turmas da
// mesma matéria; aí resumimos em vez de fingir que existe uma turma única.
// Na grade o card representa a turma já escolhida, então mostramos o detalhe.
function MetaDoProf({ prof }) {
  if (prof.turma) {
    // prof.aulas vem preenchido quando o card é de um docente específico da
    // turma (ex.: o da prática), pra mostrar só as aulas que ele dá.
    const aulas = prof.aulas || aulasDaTurma(prof.turma);
    return (
      <>
        <div className="meta">
          {prof.turma.turma}
          {(prof.turma.campus || prof.turma.turno) && (
            <> · {[prof.turma.campus, prof.turma.turno].filter(Boolean).join(" ")}</>
          )}
        </div>
        {aulas.map((aula, i) => (
          <div className="meta prof-horario" key={i}>
            <LuClock /> {aula.tipo} · {aula.dia} {formatarHora(aula.inicio)}–{formatarHora(aula.fim)}
            {aula.frequencia !== "semanal" && <> ({aula.frequencia})</>}
            {aula.docentes.length > 0 && <> · {aula.docentes.map(nomeDocente).join(", ")}</>}
          </div>
        ))}
      </>
    );
  }

  const turmas = prof.turmas || [];
  const papeis = unicos(turmas.flatMap((t) => t.papeis || []));
  const campi = unicos(turmas.map((t) => t.campus));
  const turnos = unicos(turmas.map((t) => t.turno));

  return (
    <>
      <div className="meta">
        {papeis.length > 0 && <>Docente de {papeis.join(" e ")} · </>}
        {turmas.length} {turmas.length === 1 ? "turma" : "turmas"}
      </div>
      {(campi.length > 0 || turnos.length > 0) && (
        <div className="meta">{[campi.join(", "), turnos.join(", ")].filter(Boolean).join(" · ")}</div>
      )}
    </>
  );
}

export function ProfCard({ prof, resumo, aoAlternarResumo, favoritado, aoAlternarFavorito, naGrade, aoAlternarGrade }) {
  return (
    <div className="prof-card">
      <div className="prof-row">
        <div className="avatar">{iniciais(prof.professor)}</div>

        <div className="prof-info">
          <h4>{prof.professor}</h4>
          <MetaDoProf prof={prof} />
          {prof.teacher_id ? (
            <div className="prof-links">
              <a href={prof.url} target="_blank" rel="noreferrer">Ver reviews →</a>
              <span className="sep">|</span>
              <button onClick={() => aoAlternarResumo(prof.teacher_id)}>
                {resumo?.aberto ? "Ocultar resumo" : "Ver resumo"}
              </button>
            </div>
          ) : (
            <div className="prof-links">
              <span className="sem-dados">Sem avaliações na UFABCnext</span>
            </div>
          )}
        </div>

        <div className="barra-wrap">
          <BarraConceitos distribuicao={prof.distribuicao} />
          <span className="amostras">{prof.amostras}</span>
        </div>

        <div className="prof-acoes">
          {aoAlternarGrade && (
            <button
              className={`grade-btn ${naGrade ? "ativa" : ""}`}
              onClick={() => aoAlternarGrade(prof)}
              title={naGrade ? "Remover da grade" : "Adicionar à grade"}
            >
              {naGrade ? <LuCalendarCheck /> : <LuCalendarPlus />}
            </button>
          )}

          <button
            className={`estrela-btn ${favoritado ? "ativa" : ""}`}
            onClick={() => aoAlternarFavorito(prof)}
            title={favoritado ? "Remover dos favoritos" : "Favoritar professor"}
          >
            <LuStar fill={favoritado ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      {resumo?.aberto && (
        <div className="resumo-box">
          <ResumoProfessor resumo={resumo} />
        </div>
      )}
    </div>
  );
}
