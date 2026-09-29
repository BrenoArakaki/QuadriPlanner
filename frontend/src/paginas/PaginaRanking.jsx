import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { LuFlaskConical, LuChevronRight, LuTarget, LuLayers } from "react-icons/lu";
import { Header, FiltroDropdown, ProfCard } from "../componentes/Componentes";
import { useResumos } from "../lib/resumos";
import { lerFavoritos, ehFavorito, alternarFavorito } from "../lib/favoritos";
import DialogTurma from "../componentes/DialogTurma";
import { apiFetch, temToken } from "../lib/token";
import {
  lerGrade,
  itemDoProfNaGrade,
  materiaJaNaGrade,
  adicionarNaGrade,
  removerDaGrade,
  montarItemGrade,
} from "../lib/grade";


export default function PaginaRanking() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [termo, setTermo] = useState("");
  const [opcoes, setOpcoes] = useState([]);
  const [materiaEscolha, setMateriaEscolha] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [avisos, setAvisos] = useState([]);
  const [carregandoBusca, setCarregandoBusca] = useState(false);
  const [carregandoRanking, setCarregandoRanking] = useState(false);
  const [erro, setErro] = useState("");

  const { resumos, alternarResumo } = useResumos();

  const [filtroCampus, setFiltroCampus] = useState("Todos");
  const [filtroTurno, setFiltroTurno] = useState("Todos");

  const [seletorAberto, setSeletorAberto] = useState(true);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const debounceRef = useRef(null);

  const [favoritos, setFavoritos] = useState(() => lerFavoritos());
  const [grade, setGrade] = useState(() => lerGrade());
  const [erroGrade, setErroGrade] = useState("");
  const [profEscolhendoTurma, setProfEscolhendoTurma] = useState(null);

  useEffect(() => {
    if (!termo.trim()) {
      setOpcoes([]);
      setDropdownAberto(false);
      return;
    }

    clearTimeout(debounceRef.current);
    setCarregandoBusca(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const r = await apiFetch(`/api/materias?q=${encodeURIComponent(termo)}`);
        const data = await r.json();
        setOpcoes(data.opcoes || []);
        setDropdownAberto(true);
        setErro("");
      } catch (err) {
        setErro("Não foi possível conectar ao backend. Ele está rodando em localhost:5000?");
      } finally {
        setCarregandoBusca(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [termo]);

  const selecionarMateria = useCallback(async function selecionarMateria(nomeMateria) {
    setMateriaEscolha(nomeMateria);
    setCarregandoRanking(true);
    setRanking([]);
    setAvisos([]);
    setErro("");
    setFiltroCampus("Todos");
    setFiltroTurno("Todos");
    setTermo(nomeMateria);
    setDropdownAberto(false);
    setSeletorAberto(false);

    try {
      const r = await apiFetch(`/api/ranking?materia=${encodeURIComponent(nomeMateria)}`);
      const data = await r.json();
      setRanking(data.ranking || []);
      setAvisos(data.avisos || []);
    } catch (err) {
      setErro("Erro ao buscar o ranking de professores.");
    } finally {
      setCarregandoRanking(false);
    }
  }, []);

  // A aba "Matérias" manda pra cá com ?materia=<nome>: já busca o ranking
  // dela e limpa o parâmetro, pra um F5 depois não refazer a busca sozinho.
  useEffect(() => {
    const daUrl = searchParams.get("materia");
    if (!daUrl) return;

    setSearchParams({}, { replace: true });
    selecionarMateria(daUrl);
  }, [searchParams, setSearchParams, selecionarMateria]);

  function handleAlternarFavorito(prof) {
    setFavoritos((atual) => alternarFavorito(atual, prof));
  }

  // Clicar no botão do card nunca adiciona direto: ou remove o que já está
  // na grade, ou abre o dialog pra pessoa escolher a turma (e ver com quem é
  // a prática, que pode ser outro professor).
  function handleAlternarGrade(prof) {
    const jaEscolhida = itemDoProfNaGrade(grade, prof);
    if (jaEscolhida) {
      setErroGrade("");
      setGrade((atual) => removerDaGrade(atual, jaEscolhida));
      return;
    }

    const duplicada = materiaJaNaGrade(grade, prof.materia);
    if (duplicada) {
      setErroGrade(
        `Você já tem "${prof.materia}" na grade com ${duplicada.professor}. Remova essa turma antes de adicionar outra da mesma matéria.`
      );
      return;
    }

    setErroGrade("");
    setProfEscolhendoTurma(prof);
  }

  function confirmarTurma(turma) {
    setGrade((atual) => adicionarNaGrade(atual, montarItemGrade(profEscolhendoTurma, turma)));
    setProfEscolhendoTurma(null);
  }

  // Campus e turno são da turma, não do professor: quem dá aula nos dois
  // campi aparece nos dois filtros, e basta uma turma bater pra ele ficar.
  const camposCampus = ["Todos", ...new Set(ranking.flatMap((p) => p.turmas.map((t) => t.campus)).filter(Boolean))];
  const camposTurno = ["Todos", ...new Set(ranking.flatMap((p) => p.turmas.map((t) => t.turno)).filter(Boolean))];

  const rankingFiltrado = ranking.filter((p) =>
    p.turmas.some(
      (t) =>
        (filtroCampus === "Todos" || t.campus === filtroCampus) &&
        (filtroTurno === "Todos" || t.turno === filtroTurno)
    )
  );

  return (
    <>
      <Header
        titulo={<>Ranking <span className="accent">de professores</span> por matéria</>}
        subtitulo="Baseado nas turmas ofertadas e na distribuição de conceitos das reviews."
      />

      <div className="card">
        <div className="materia-toggle" onClick={() => setSeletorAberto(!seletorAberto)}>
          <div className="left">
            <LuFlaskConical /> {materiaEscolha || "Escolha uma matéria"}
          </div>
          <LuChevronRight className={`chevron ${seletorAberto ? "open" : ""}`} />
        </div>

        {seletorAberto && (
          <div className="combobox-wrap">
            <input
              type="text"
              placeholder="Digite o nome da matéria"
              value={termo}
              onChange={(e) => { setTermo(e.target.value); setMateriaEscolha(null); }}
              onFocus={() => opcoes.length > 0 && setDropdownAberto(true)}
              onBlur={() => setTimeout(() => setDropdownAberto(false), 150)}
            />
            {carregandoBusca && <span className="combobox-loading">buscando...</span>}
            {dropdownAberto && opcoes.length > 0 && (
              <div className="combobox-dropdown">
                {opcoes.map((mat) => (
                  <div
                    key={mat}
                    className={`combobox-option ${materiaEscolha === mat ? "selected" : ""}`}
                    onMouseDown={() => selecionarMateria(mat)}
                  >
                    {mat}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!temToken() && (
        <div className="aviso-box">
          <p>
            Você ainda não salvou o token da UFABCnext, então o ranking vem vazio.{" "}
            <Link to="/" className="accent">Configurar agora →</Link>
          </p>
        </div>
      )}

      {erro && <p className="erro-msg">{erro}</p>}
      {erroGrade && <p className="erro-msg">{erroGrade}</p>}

      {carregandoRanking && (
        <div className="card carregando-card">
          <span className="spinner" />
          <div>
            <strong>Procurando os professores de {materiaEscolha}...</strong>
            <p className="subtitle">
              Buscando cada docente e as notas das reviews no UFABCNext. Pode levar alguns segundos.
            </p>
          </div>
        </div>
      )}

      {materiaEscolha && !carregandoRanking && (
        <div>
          <h3 className="ranking-title">Ranking — <span className="accent">{materiaEscolha}</span></h3>

          {ranking.length === 0 ? (
            <p className="subtitle">Nenhum professor encontrado com dados suficientes.</p>
          ) : (
            <>
              <div className="filtros">
                <FiltroDropdown
                  icon={<LuTarget />}
                  valor={filtroCampus}
                  opcoes={camposCampus}
                  rotuloTodos="Todos os campi"
                  aoMudar={setFiltroCampus}
                />
                <FiltroDropdown
                  icon={<LuLayers />}
                  valor={filtroTurno}
                  opcoes={camposTurno}
                  rotuloTodos="Todos os turnos"
                  aoMudar={setFiltroTurno}
                />
              </div>

              {avisos.length > 0 && (
                <div className="aviso-box">
                  {avisos.map((a, i) => <p key={i}>{a}</p>)}
                </div>
              )}

              {rankingFiltrado.length === 0 ? (
                <p className="subtitle">Nenhum professor bate com esse filtro.</p>
              ) : (
                rankingFiltrado.map((prof) => (
                  <ProfCard
                    key={prof.teacher_id}
                    prof={prof}
                    resumo={resumos[prof.teacher_id]}
                    aoAlternarResumo={alternarResumo}
                    favoritado={ehFavorito(favoritos, prof.teacher_id)}
                    aoAlternarFavorito={handleAlternarFavorito}
                    naGrade={!!itemDoProfNaGrade(grade, prof)}
                    aoAlternarGrade={handleAlternarGrade}
                  />
                ))
              )}
            </>
          )}
        </div>
      )}

      {profEscolhendoTurma && (
        <DialogTurma
          prof={profEscolhendoTurma}
          grade={grade}
          aoFechar={() => setProfEscolhendoTurma(null)}
          aoConfirmar={confirmarTurma}
        />
      )}
    </>
  );
}