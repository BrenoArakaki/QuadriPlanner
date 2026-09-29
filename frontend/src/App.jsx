import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Sidebar, TopbarMobile } from "./componentes/Componentes";
import PaginaToken from "./paginas/PaginaToken";
import PaginaRanking from "./paginas/PaginaRanking";
import PaginaMaterias from "./paginas/PaginaMaterias";
import PaginaFavoritos from "./paginas/PaginaFavoritos";
import PaginaGrade from "./paginas/PaginaGrade";
import PaginaSobre from "./paginas/PaginaSobre";
import "./estilos/styles.css";

export default function App() {
  const [tema, setTema] = useState("dark");
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = tema;
  }, [tema]);

  return (
    <BrowserRouter>
      <div className="app-shell" data-theme={tema}>
        <Sidebar
          aberto={menuAberto}
          aoFechar={() => setMenuAberto(false)}
          tema={tema}
          aoAlternarTema={setTema}
        />

        <div className="conteudo">
          <TopbarMobile aoAbrirMenu={() => setMenuAberto(true)} />

          <main className="main">
            <Routes>
              <Route path="/" element={<PaginaToken />} />
              <Route path="/ranking" element={<PaginaRanking />} />
              <Route path="/materias" element={<PaginaMaterias />} />
              <Route path="/favoritos" element={<PaginaFavoritos />} />
              <Route path="/grade" element={<PaginaGrade />} />
              <Route path="/sobre" element={<PaginaSobre />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}