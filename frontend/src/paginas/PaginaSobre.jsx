import { LuGraduationCap, LuDatabase, LuHeart } from "react-icons/lu";
import { Header } from "../componentes/Componentes";

export default function PaginaSobre() {
  return (
    <div className="sobre-container">
      <Header
              titulo={<>Sobre o <span className="accent">QuadriPlanner</span></>}
            />
      <div className="card sobre-bloco">
        <span className="sobre-bloco-icon"><LuGraduationCap /></span>
        <p className="sobre-lead">
          O QuadriPlanner é uma ferramenta desenvolvida para ajudar os alunos da UFABC a tomarem decisões mais estratégicas na hora de montar a grade e escolher as disciplinas.
        </p>
      </div>

      <div className="card sobre-bloco">
        <span className="sobre-bloco-icon"><LuDatabase /></span>
        <p>
          Todos os dados de turmas, avaliações de professores e distribuição de conceitos utilizados nesta aplicação são consumidos diretamente da API do{' '}
          <a href="https://www.ufabcnext.com/app/" target="_blank" rel="noopener noreferrer" className="accent">
            UFABC Next
          </a>.
        </p>
      </div>

      <div className="card sobre-bloco sobre-bloco">
        <span className="sobre-bloco-icon"><LuHeart /></span>
        <p>
          Deixamos aqui os nossos agradecimentos e todos os créditos à equipe do{' '}
          <a href="https://www.ufabcnext.com/app/" target="_blank" rel="noopener noreferrer" className="accent">
            UFABC Next
          </a>{' '}
          por manter esse ecossistema incrível e por disponibilizar os dados que tornam projetos como este possíveis!
        </p>
      </div>
    </div>
  );
}
