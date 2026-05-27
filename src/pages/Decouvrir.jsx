import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import {
  collection, query, where, getDocs,
  doc, setDoc, getDoc, updateDoc, arrayUnion
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function Decouvrir() {
  const [recherche, setRecherche] = useState("");
  const [resultats, setResultats] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [monProfil, setMonProfil] = useState(null);
  const user = auth.currentUser;
  const navigate = useNavigate();

  useEffect(() => {
    const charger = async () => {
      const snap = await getDoc(doc(db, "utilisateurs", user.uid));
      if (snap.exists()) setMonProfil(snap.data());
    };
    charger();
  }, []);

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

  const getStatutRelation = (autreUser) => {
    const amis = monProfil?.amis || [];
    const envoyes = monProfil?.demandesEnvoyees || [];
    const recus = monProfil?.demandesRecues || [];
    if (amis.includes(autreUser.id)) return "ami";
    if (envoyes.includes(autreUser.id)) return "envoye";
    if (recus.includes(autreUser.id)) return "recu";
    return "aucun";
  };

  const envoyerDemande = async (autreUser) => {
    const monRef = doc(db, "utilisateurs", user.uid);
    const autreRef = doc(db, "utilisateurs", autreUser.id);
    await updateDoc(monRef, {
      demandesEnvoyees: arrayUnion(autreUser.id)
    });
    await updateDoc(autreRef, {
      demandesRecues: arrayUnion(user.uid)
    });
    setMonProfil((prev) => ({
      ...prev,
      demandesEnvoyees: [...(prev?.demandesEnvoyees || []), autreUser.id]
    }));
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

  const renderBouton = (u) => {
    const statut = getStatutRelation(u);
    if (statut === "ami") {
      return (
        <button className="decouvrir-btn-ami deja-ami">
          ✓ Ami
        </button>
      );
    }
    if (statut === "envoye") {
      return (
        <button className="decouvrir-btn-ami en-attente">
          ⏳ Envoyée
        </button>
      );
    }
    if (statut === "recu") {
      return (
        <button
          className="decouvrir-btn-ami recu"
          onClick={() => envoyerDemande(u)}
        >
          👥 Accepter
        </button>
      );
    }
    return (
      <button
        className="decouvrir-btn-ami"
        onClick={() => envoyerDemande(u)}
      >
        👥 Ajouter
      </button>
    );
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
            <div className="decouvrir-btns">
              {renderBouton(u)}
              <button
                className="decouvrir-btn-msg"
                onClick={() => ouvrirConversation(u)}
              >
                💬
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Decouvrir;