import { useState } from "react";
import { Link } from "react-router-dom";
import { LuKey, LuCheck, LuTrash2, LuArrowRight } from "react-icons/lu";
import { Header } from "../componentes/Componentes";
import { lerToken, salvarToken, limparToken, API_BASE } from "../lib/token";

export default function PaginaToken() {
  const [token, setToken] = useState(() => lerToken());
  const [salvo, setSalvo] = useState(() => lerToken());
  const [checando, setChecando] = useState(false);
  const [status, setStatus] = useState(null); // {ok: bool, msg: string}

  // Salvar e validar andam juntos: não adianta guardar um token que a API
  // recusa, e a validação é uma requisição só (uma busca qualquer).
  async function salvarEValidar() {
    const limpo = salvarToken(token);
    setSalvo(limpo);
    setStatus(null);

    if (!limpo) {
      setStatus({ ok: false, msg: "Cole um token antes de salvar." });
      return;
    }

    setChecando(true);
    try {
      const r = await fetch(`${API_BASE}/api/token/validar`, {
        headers: { "X-UFABC-Token": limpo },
      });
      const data = await r.json();
      setStatus(
        data.valido
          ? { ok: true, msg: "Token salvo e validado. As buscas já funcionam." }
          : { ok: false, msg: data.erro || "A UFABCnext recusou este token." }
      );
    } catch {
      setStatus({
        ok: false,
        msg: "Token salvo, mas não deu pra validar: o backend está rodando em localhost:5000?",
      });
    } finally {
      setChecando(false);
    }
  }

  function apagar() {
    limparToken();
    setToken("");
    setSalvo("");
    setStatus({ ok: false, msg: "Token apagado deste navegador." });
  }

  return (
    <>
      <Header
        titulo="Início"
        subtitulo="Configure seu token da UFABCnext pra liberar o ranking de professores."
      />

      <div className="card">
        <div className="token-topo">
          <span className="token-icon"><LuKey /></span>
          <div>
            <h3>Token da UFABCnext</h3>
            <p className="subtitle">
              Ele fica guardado só no seu navegador e vai junto em cada busca.
            </p>
          </div>
        </div>

        {/* O token só dá acesso de leitura às reviews públicas da UFABCnext,
            não é senha: fica à vista pra facilitar conferir o que foi colado. */}
        <input
          className="token-input"
          type="text"
          value={token}
          placeholder="Cole aqui o token da UFABCnext"
          autoComplete="off"
          spellCheck="false"
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && salvarEValidar()}
        />

        <div className="token-acoes">
          <button className="btn-primary" onClick={salvarEValidar} disabled={checando}>
            {checando ? "Validando..." : "Salvar token"}
          </button>

          {salvo && (
            <button className="token-apagar" onClick={apagar}>
              <LuTrash2 /> Apagar
            </button>
          )}

          <span className={`token-status ${salvo ? "ativo" : ""}`}>
            <span className="status-dot" />
            {salvo ? "Token salvo neste navegador" : "Nenhum token salvo"}
          </span>
        </div>

        {status && (
          <p className={status.ok ? "token-msg-ok" : "erro-msg"}>
            {status.ok && <LuCheck />} {status.msg}
          </p>
        )}

        {salvo && (
          <Link to="/ranking" className="token-ir">
            Buscar professores <LuArrowRight />
          </Link>
        )}
      </div>

      <div className="card">
        <h3 className="token-ajuda-titulo">Como pegar o token</h3>
        <ol className="token-ajuda">
          <li>Entre no <a href="https://ufabcnext.com" target="_blank" rel="noreferrer" className="accent">ufabcnext.com</a> com sua conta.</li>
          <li>Abra as ferramentas de desenvolvedor do navegador (F12).</li>
          <li>Abra a aba <strong>Rede</strong>, escreva algo no campo de procurar professor.</li>
          <li>Clique no search? (GET), desça na aba da direita até encontrar authorization.</li> 
          <li>Copie o valor depois do "Bearer" e cole no campo acima.</li>
        </ol>
        <p className="subtitle">
          Sem token, as abas Matérias e Minha Grade continuam funcionando — só o
          ranking e os resumos de professores dependem da API.
        </p>
      </div>
    </>
  );
}
