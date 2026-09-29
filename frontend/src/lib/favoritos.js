const CHAVE = "professoresFavoritos";

export function lerFavoritos() {
  try {
    const bruto = localStorage.getItem(CHAVE);
    return bruto ? JSON.parse(bruto) : [];
  } catch {
    return [];
  }
}

function salvar(lista) {
  localStorage.setItem(CHAVE, JSON.stringify(lista));
  return lista;
}

export function ehFavorito(favoritos, teacherId) {
  return favoritos.some((f) => f.teacher_id === teacherId);
}

// Alterna o professor na lista de favoritos e já persiste no localStorage.
// Guardamos o objeto do professor inteiro (não só o id) pra página de
// favoritos conseguir exibir tudo sem precisar de uma nova requisição.
export function alternarFavorito(favoritos, prof) {
  const jaEsta = ehFavorito(favoritos, prof.teacher_id);
  const novaLista = jaEsta
    ? favoritos.filter((f) => f.teacher_id !== prof.teacher_id)
    : [...favoritos, prof];
  return salvar(novaLista);
}