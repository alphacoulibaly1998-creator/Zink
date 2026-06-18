import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import NavBar from "./components/NavBar";
import Accueil from "./pages/Accueil";
import Profil from "./pages/Profil";
import Amis from "./pages/Amis";
import Messages from "./pages/Messages";
import Jeux from "./pages/Jeux";
import Decouvrir from "./pages/Decouvrir";
import AttaquesSonores from "./pages/AttaquesSonores";
import ProfilPublic from "./pages/ProfilPublic";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MotDePasseOublie from "./pages/MotDePasseOublie";
import "./App.css";

function App() {
  const [utilisateur, setUtilisateur] = useState(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setUtilisateur(user);
      setChargement(false);

      if (user) {
        const ref = doc(db, "utilisateurs", user.uid);
        await updateDoc(ref, {
          enLigne: true,
          dernièreVue: serverTimestamp()
        });

        const handleOffline = async () => {
          await updateDoc(ref, {
            enLigne: false,
            dernièreVue: serverTimestamp()
          });
        };

        const handleVisibility = async () => {
          if (document.visibilityState === "hidden") {
            await updateDoc(ref, {
              enLigne: false,
              dernièreVue: serverTimestamp()
            });
          } else {
            await updateDoc(ref, {
              enLigne: true,
              dernièreVue: serverTimestamp()
            });
          }
        };

        window.addEventListener("beforeunload", handleOffline);
        document.addEventListener("visibilitychange", handleVisibility);
        return () => {
          window.removeEventListener("beforeunload", handleOffline);
          document.removeEventListener("visibilitychange", handleVisibility);
        };
      } else {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const ref = doc(db, "utilisateurs", currentUser.uid);
          await updateDoc(ref, {
            enLigne: false,
            dernièreVue: serverTimestamp()
          });
        }
      }
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
           <Route path="/mot-de-passe-oublie" element={!utilisateur ? <MotDePasseOublie /> : <Navigate to="/" />} />
            <Route path="/" element={utilisateur ? <Accueil /> : <Navigate to="/login" />} />
            <Route path="/profil" element={utilisateur ? <Profil /> : <Navigate to="/login" />} />
            <Route path="/amis" element={utilisateur ? <Amis /> : <Navigate to="/login" />} />
            <Route path="/messages" element={utilisateur ? <Messages /> : <Navigate to="/login" />} />
            <Route path="/jeux" element={utilisateur ? <Jeux /> : <Navigate to="/login" />} />
            <Route path="/decouvrir" element={utilisateur ? <Decouvrir /> : <Navigate to="/login" />} />
            <Route path="/attaques" element={utilisateur ? <AttaquesSonores /> : <Navigate to="/login" />} />
            <Route path="/profil/:userId" element={utilisateur ? <ProfilPublic /> : <Navigate to="/login" />} />
          </Routes>
        </div>
        {utilisateur && <NavBar />}
      </div>
    </BrowserRouter>
  );
}

export default App;