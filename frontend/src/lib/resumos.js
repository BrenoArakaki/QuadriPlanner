import { useState } from "react";
import { apiFetch } from "./token";

// Guarda o resumo de cada professor por teacher_id, junto com carregando/erro
// e se o box está aberto. A requisição só acontece na primeira vez que o
// resumo é aberto; depois é só alternar a visibilidade do que já veio.
export function useResumos() {
  const [resumos, setResumos] = useState({});

  async function alternarResumo(teacherId) {
    const atual = resumos[teacherId];

    if (atual && atual.aberto) {
      setResumos((prev) => ({ ...prev, [teacherId]: { ...atual, aberto: false } }));
      return;
    }
    if (atual && atual.dados) {
      setResumos((prev) => ({ ...prev, [teacherId]: { ...atual, aberto: true } }));
      return;
    }

    setResumos((prev) => ({ ...prev, [teacherId]: { carregando: true, aberto: true } }));

    try {
      const r = await apiFetch(`/api/resumo?teacher_id=${encodeURIComponent(teacherId)}`);
      const data = await r.json();
      if (data.erro) {
        setResumos((prev) => ({ ...prev, [teacherId]: { erro: data.erro, aberto: true } }));
      } else {
        setResumos((prev) => ({ ...prev, [teacherId]: { dados: data, aberto: true } }));
      }
    } catch {
      setResumos((prev) => ({ ...prev, [teacherId]: { erro: "Falha ao buscar resumo.", aberto: true } }));
    }
  }

  return { resumos, alternarResumo };
}
