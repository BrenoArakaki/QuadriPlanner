import { useState, useEffect } from "react";
import { Header, ProfCard } from "../componentes/Componentes";
import { useResumos } from "../lib/resumos";
import { lerFavoritos, ehFavorito, alternarFavorito } from "../lib/favoritos";
import DialogTurma from "../componentes/DialogTurma";
import {
  lerGrade,
  itemDoProfNaGrade,
  materiaJaNaGrade,
  adicionarNaGrade,
  removerDaGrade,
  montarItemGrade,
} from "../lib/grade";

export default function PaginaFavoritos() {
  const [favoritos, setFavoritos] = useState([]);
  const [grade, setGrade] = useState([]);
  const [erroGrade, setErroGrade] = useState("");
  const [profEscolhendoTurma, setProfEscolhendoTurma] = useState(null);
  const { resumos, alternarResumo } = useResumos();

  useEffect(() => {
    setFavoritos(lerFavoritos());
    setGrade(lerGrade());
  }, []);

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

  return (
    <>
      <Header
        titulo={<>Meus <span className="accent">professores</span> favoritos</>}
        subtitulo="Professores que você marcou com a estrela, salvos neste navegador."
      />

      {erroGrade && <p className="erro-msg">{erroGrade}</p>}

      {favoritos.length === 0 ? (
        <p className="subtitle">Você ainda não favoritou nenhum professor. Clique na estrela num professor no ranking pra ele aparecer aqui.</p>
      ) : (
        favoritos.map((prof) => (
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