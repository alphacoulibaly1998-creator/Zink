import { useState } from "react";
import { db, auth } from "../firebase";
import {
  collection, query, where, getDocs,
  doc, setDoc, getDoc
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function Decouvrir() {
  const [recherche, setRecherche] = useState("");
  const [resultats, setResultats] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const user = auth.currentUser;
  const navigate = useNavigate();

  const chercher = async () => {
    setErreur("");
    setResultats([]);
    if (!recherche.trim()) {
      setErreur("Tape un pseudo ou un pays.");
      return;
    }
    setChargement(true);
    try {
      const parPseudo = query(
        collection(db, "utilisateurs"),
        where("pseudo", ">=", recherche.trim()),
        where("pseudo", "<=", recherche.trim() + "\uf8ff")
      );
      const parPays = query(
        collection(db, "utilisateurs"),
        where("pays", "==", recherche.trim())
      );
      const [snapPseudo, snapPays] = await Promise.all([
        getDocs(parPseudo),
        getDocs(parPays)
      ]);
      const resultatsMap = new Map();
      [...snapPseudo.docs, ...snapPays.docs].forEach((d) => {
        if (d.id !== user.uid) {
          resultatsMap.set(d.id, { id: d.id, ...d.data() });
        }
      });
      setResultats([...resultatsMap.values()]);
      if (resultatsMap.size === 0) setErreur("Aucun utilisateur trouvé.");
    } catch (e) {
      setErreur("Erreur lors de la recherche.");
    }
    setChargement(false);
  };

  const ouvrirConversation = async (autreUser) => {
    const membres = [user.uid, autreUser.id].sort();
    const convId = membres.join("_");
    const convRef = doc(db, "conversations", convId);
    const convSnap = await getDoc(convRef);
    if (!convSnap.exists()) {
      await setDoc(convRef, {
        membres,
        dernierMessage: { texte: "", createdAt: new Date() },
        nonLu: { [user.uid]: 0, [autreUser.id]: 0 },
        createdAt: new Date()
      });
    }
    navigate("/messages");
  };

  return (
    <div className="decouvrir-container">
      <h1 className="accueil-titre">🔍 Découvrir</h1>

      <div className="decouvrir-recherche">
        <input
          className="auth-input"
          type="text"
          placeholder="Rechercher par pseudo ou pays..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && chercher()}
        />
        <button className="auth-btn" onClick={chercher} disabled={chargement}>
          {chargement ? "..." : "🔍"}
        </button>
      </div>

      {erreur && <p className="auth-erreur">{erreur}</p>}

      <div className="decouvrir-resultats">
        {resultats.map((u) => (
          <div key={u.id} className="decouvrir-user">
            <div className="conv-avatar">
              {u.photoURL ? (
                <img src={u.photoURL} alt="avatar" />
              ) : (
                <div className="conv-avatar-placeholder">
                  {u.pseudo?.[0]?.toUpperCase() || "?"}
                </div>
              )}
            </div>
            <div className="decouvrir-infos">
              <span className="conv-pseudo">{u.pseudo}</span>
              <span className="conv-dernier">🌍 {u.pays}</span>
            </div>
            <button
              className="decouvrir-btn-msg"
              onClick={() => ouvrirConversation(u)}
            >
              💬
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Decouvrir;