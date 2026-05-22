import { BrowserRouter, Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import Accueil from "./pages/Accueil";
import Profil from "./pages/Profil";
import Amis from "./pages/Amis";
import Messages from "./pages/Messages";
import Jeux from "./pages/Jeux";
import Decouvrir from "./pages/Decouvrir";
import AttaquesSonores from "./pages/AttaquesSonores";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <div className="page-content">
          <Routes>
            <Route path="/" element={<Accueil />} />
            <Route path="/profil" element={<Profil />} />
            <Route path="/amis" element={<Amis />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/jeux" element={<Jeux />} />
            <Route path="/decouvrir" element={<Decouvrir />} />
            <Route path="/attaques" element={<AttaquesSonores />} />
          </Routes>
        </div>
        <NavBar />
      </div>
    </BrowserRouter>
  );
}

export default App;