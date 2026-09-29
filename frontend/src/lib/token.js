// Token da UFABCnext: a pessoa cola o dela na página inicial e ele fica
// guardado no localStorage do navegador. O backend não tem mais token
// próprio (nem variável de ambiente): cada requisição que precisa da API
// da UFABCnext leva este token no cabeçalho X-UFABC-Token.

const CHAVE = "ufabcToken";

export const API_BASE = "http://localhost:5000";

export function lerToken() {
  try {
    return localStorage.getItem(CHAVE) || "";
  } catch {
    return "";
  }
}

export function salvarToken(token) {
  const limpo = token.trim();
  try {
    if (limpo) localStorage.setItem(CHAVE, limpo);
    else localStorage.removeItem(CHAVE);
  } catch {
    // navegador com storage bloqueado: segue sem persistir
  }
  // Avisa quem estiver ouvindo (ex.: o indicador na sidebar) que mudou.
  window.dispatchEvent(new CustomEvent("ufabc-token", { detail: limpo }));
  return limpo;
}

export function limparToken() {
  return salvarToken("");
}

export function temToken() {
  return lerToken().length > 0;
}

// Todo fetch pro backend passa por aqui, pra nunca esquecer o cabeçalho.
export function apiFetch(caminho, opcoes = {}) {
  const token = lerToken();
  return fetch(`${API_BASE}${caminho}`, {
    ...opcoes,
    headers: {
      ...(opcoes.headers || {}),
      ...(token ? { "X-UFABC-Token": token } : {}),
    },
  });
}
