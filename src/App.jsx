import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import NavBar from "./components/NavBar";
import Accueil from "./pages/Accueil";
import Profil from "./pages/Profil";
import Amis from "./pages/Amis";
import Messages from "./pages/Messages";
import Jeux from "./pages/Jeux";
import Decouvrir from "./pages/Decouvrir";
import AttaquesSonores from "./pages/AttaquesSonores";
import Login from "./pages/Login";
import Register from "./pages/Register";
import "./App.css";

function App() {
  const [utilisateur, setUtilisateur] = useState(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUtilisateur(user);
      setChargement(false);
    });
    return () => unsub();
  }, []);

  if (chargement) return <div className="chargement">Chargement...</div>;

  return (
    <BrowserRouter>
      <div className="app-container">
        <div className="page-content">
          <Routes>
            <Route path="/login" element={!utilisateur ? <Login /> : <Navigate to="/" />} />
            <Route path="/register" element={!utilisateur ? <Register /> : <Navigate to="/" />} />
            <Route path="/" element={utilisateur ? <Accueil /> : <Navigate to="/login" />} />
            <Route path="/profil" element={utilisateur ? <Profil /> : <Navigate to="/login" />} />
            <Route path="/amis" element={utilisateur ? <Amis /> : <Navigate to="/login" />} />
            <Route path="/messages" element={utilisateur ? <Messages /> : <Navigate to="/login" />} />
            <Route path="/jeux" element={utilisateur ? <Jeux /> : <Navigate to="/login" />} />
            <Route path="/decouvrir" element={utilisateur ? <Decouvrir /> : <Navigate to="/login" />} />
            <Route path="/attaques" element={utilisateur ? <AttaquesSonores /> : <Navigate to="/login" />} />
          </Routes>
        </div>
        {utilisateur && <NavBar />}
      </div>
    </BrowserRouter>
  );
}

export default App;