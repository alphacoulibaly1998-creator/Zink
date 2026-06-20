import { useState, useEffect, useRef } from "react";
import { db, auth } from "../firebase";
import {
  collection, query, where, getDocs, limit,
  doc, setDoc, getDoc, updateDoc, arrayUnion
} from "firebase/firestore";
import { creerNotification } from "../notifications";
import { useNavigate } from "react-router-dom";

function Decouvrir({ suggestionsGlobales, setSuggestionsGlobales }) {
  const [recherche, setRecherche] = useState("");
  const [resultats, setResultats] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [monProfil, setMonProfil] = useState(null);
  const [chargementSuggestions, setChargementSuggestions] = useState(!suggestionsGlobales);
  const user = auth.currentUser;
  const navigate = useNavigate();

  useEffect(() => {
    const charger = async () => {
      const snap = await getDoc(doc(db, "utilisateurs", user.uid));
      if (snap.exists()) setMonProfil(snap.data());
    };
    charger();
  }, []);

  useEffect(() => {
    const chargerSuggestions = async () => {
      if (!monProfil || suggestionsGlobales) {
        setChargementSuggestions(false);
        return;
      }
      setChargementSuggestions(true);
      try {
        const amis = monProfil?.amis || [];
        const q = query(collection(db, "utilisateurs"), limit(30));
        const snap = await getDocs(q);
        const tous = snap.docs
          .filter((d) => d.id !== user.uid && !amis.includes(d.id))
          .map((d) => ({ id: d.id, ...d.data() }));
        const melanges = tous.sort(() => Math.random() - 0.5).slice(0, 6);
        setSuggestionsGlobales(melanges);
      } catch (e) {}
      setChargementSuggestions(false);
    };
    chargerSuggestions();
  }, [monProfil]);

  const chargerPlusSuggestions = async () => {
    setChargementSuggestions(true);
    try {
      const amis = monProfil?.amis || [];
      const dejaAffiches = (suggestionsGlobales || []).map((s) => s.id);
      const q = query(collection(db, "utilisateurs"), limit(50));
      const snap = await getDocs(q);
      const tous = snap.docs
        .filter((d) => d.id !== user.uid && !amis.includes(d.id) && !dejaAffiches.includes(d.id))
        .map((d) => ({ id: d.id, ...d.data() }));
      const melanges = tous.sort(() => Math.random() - 0.5).slice(0, 6);
      setSuggestionsGlobales(melanges.length > 0 ? melanges : suggestionsGlobales);
    } catch (e) {}
    setChargementSuggestions(false);
  };

  useEffect(() => {
    if (!recherche.trim() || recherche.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const rechercheLower = recherche.trim().toLowerCase();
      const q1 = query(
        collection(db, "utilisateurs"),
        where("pseudoLower", ">=", rechercheLower),
        where("pseudoLower", "<=", rechercheLower + "\uf8ff")
      );
      const q2 = query(
        collection(db, "utilisateurs"),
        where("pseudo", ">=", recherche.trim()),
        where("pseudo", "<=", recherche.trim() + "\uf8ff")
      );
      const q3 = query(
        collection(db, "utilisateurs"),
        where("pseudo", ">=", rechercheLower),
        where("pseudo", "<=", rechercheLower + "\uf8ff")
      );
      const [snap1, snap2, snap3] = await Promise.all([getDocs(q1), getDocs(q2), getDocs(q3)]);
      const map = new Map();
      [...snap1.docs, ...snap2.docs, ...snap3.docs].forEach((d) => {
        if (d.id !== user.uid) map.set(d.id, { id: d.id, ...d.data() });
      });
      setSuggestions([...map.values()].slice(0, 5));
    }, 300);
    return () => clearTimeout(timer);
  }, [recherche]);

  const chercher = async () => {
    setErreur("");
    setResultats([]);
    setSuggestions([]);
    if (!recherche.trim()) {
      setErreur("Tape un pseudo.");
      return;
    }
    setChargement(true);
    try {
      const rechercheLower = recherche.trim().toLowerCase();
      const q1 = query(
        collection(db, "utilisateurs"),
        where("pseudoLower", ">=", rechercheLower),
        where("pseudoLower", "<=", rechercheLower + "\uf8ff")
      );
      const q2 = query(
        collection(db, "utilisateurs"),
        where("pseudo", ">=", recherche.trim()),
        where("pseudo", "<=", recherche.trim() + "\uf8ff")
      );
      const q3 = query(
        collection(db, "utilisateurs"),
        where("pseudo", ">=", rechercheLower),
        where("pseudo", "<=", rechercheLower + "\uf8ff")
      );
      const [snap1, snap2, snap3] = await Promise.all([getDocs(q1), getDocs(q2), getDocs(q3)]);
      const map = new Map();
      [...snap1.docs, ...snap2.docs, ...snap3.docs].forEach((d) => {
        if (d.id !== user.uid) map.set(d.id, { id: d.id, ...d.data() });
      });
      const res = [...map.values()];
      setResultats(res);
      if (res.length === 0) setErreur("Aucun utilisateur trouvé.");
    } catch (e) {
      setErreur("Erreur lors de la recherche.");
    }
    setChargement(false);
  };

 const choisirSuggestion = async (u) => {
    setRecherche("");
    setSuggestions([]);
    setErreur("");
    navigate(`/profil/${u.id}`);
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
    await updateDoc(monRef, { demandesEnvoyees: arrayUnion(autreUser.id) });
    await updateDoc(autreRef, { demandesRecues: arrayUnion(user.uid) });
    await creerNotification(autreUser.id, user.uid, "demande_ami");
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
    if (statut === "ami") return (
      <button className="decouvrir-btn-ami deja-ami">✓ Ami</button>
    );
    if (statut === "envoye") return (
      <button className="decouvrir-btn-ami en-attente">⏳ Envoyée</button>
    );
    if (statut === "recu") return (
      <button className="decouvrir-btn-ami recu" onClick={() => envoyerDemande(u)}>
        👥 Accepter
      </button>
    );
    return (
      <button className="decouvrir-btn-ami" onClick={() => envoyerDemande(u)}>
        👥 Ajouter
      </button>
    );
  };


  return (
    <div className="decouvrir-container">
      <h1 className="accueil-titre">🔍 Découvrir</h1>

      <div className="decouvrir-recherche">
        <div className="decouvrir-input-container">
          <input
            className="auth-input"
            type="text"
            placeholder="Rechercher par pseudo..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && chercher()}
          />
          {suggestions.length > 0 && (
            <div className="decouvrir-suggestions">
              {suggestions.map((u) => (
                <div
                  key={u.id}
                  className="decouvrir-suggestion"
                  onClick={() => choisirSuggestion(u)}
                >
                  <div className="conv-avatar-placeholder" style={{ width: 32, height: 32, fontSize: 14 }}>
                    {u.pseudo?.[0]?.toUpperCase() || "?"}
                  </div>
                  <span>{u.pseudo}</span>
                  <span className="suggestion-pays">🌍 {u.pays}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <button className="auth-btn" onClick={chercher} disabled={chargement}>
          {chargement ? "..." : "🔍"}
        </button>
      </div>

      {erreur && <p className="auth-erreur">{erreur}</p>}

      {!recherche.trim() && resultats.length === 0 && (
        <div className="decouvrir-suggestions-section">
          <p className="attaques-titre">✨ Suggestions pour toi</p>
          {chargementSuggestions ? (
            <div className="chargement">Chargement...</div>
          ) : (
            <>
              <div className="decouvrir-resultats">
                {(suggestionsGlobales || []).map((u) => (
                  <div key={u.id} className="decouvrir-user">
                    <div
                      className="conv-avatar"
                      onClick={() => navigate(`/profil/${u.id}`)}
                      style={{ cursor: "pointer" }}
                    >
                      {u.photoURL ? (
                        <img src={u.photoURL} alt="avatar" />
                      ) : (
                        <div className="conv-avatar-placeholder">
                          {u.pseudo?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                    </div>
                    <div
                      className="decouvrir-infos"
                      onClick={() => navigate(`/profil/${u.id}`)}
                      style={{ cursor: "pointer" }}
                    >
                      <span className="conv-pseudo">{u.pseudo}</span>
                      <span className="conv-dernier">🌍 {u.pays}</span>
                    </div>
                    <div className="decouvrir-btns">
                      {renderBouton(u)}
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="voir-plus-commentaires"
                onClick={chargerPlusSuggestions}
              >
                🔄 Voir d'autres suggestions
              </button>
            </>
          )}
        </div>
      )}

      <div className="decouvrir-resultats">
        {resultats.map((u) => (
          <div key={u.id} className="decouvrir-user">
            <div
              className="conv-avatar"
              onClick={() => navigate(`/profil/${u.id}`)}
              style={{ cursor: "pointer" }}
            >
              {u.photoURL ? (
                <img src={u.photoURL} alt="avatar" />
              ) : (
                <div className="conv-avatar-placeholder">
                  {u.pseudo?.[0]?.toUpperCase() || "?"}
                </div>
              )}
            </div>
            <div
              className="decouvrir-infos"
              onClick={() => navigate(`/profil/${u.id}`)}
              style={{ cursor: "pointer" }}
            >
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