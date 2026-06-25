import { useState } from "react";
import { db, auth } from "../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

const RAISONS = {
  profil: [
    "Fausse identité / Usurpation",
    "Contenu inapproprié sur le profil",
    "Harcèlement ou intimidation",
    "Spam ou arnaque",
    "Contenu haineux",
    "Autre raison",
  ],
  publication: [
    "Contenu violent ou choquant",
    "Contenu sexuel inapproprié",
    "Harcèlement ou intimidation",
    "Fausses informations",
    "Spam ou publicité",
    "Contenu haineux",
    "Autre raison",
  ],
  commentaire: [
    "Harcèlement ou intimidation",
    "Contenu haineux",
    "Spam",
    "Langage abusif",
    "Fausses informations",
    "Autre raison",
  ],
  message: [
    "Harcèlement ou intimidation",
    "Contenu inapproprié",
    "Spam ou arnaque",
    "Menaces",
    "Contenu haineux",
    "Autre raison",
  ],
};

function FormulaireSignalement({ type, cibleId, onFermer }) {
  const [raisonChoisie, setRaisonChoisie] = useState("");
  const [details, setDetails] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const [chargement, setChargement] = useState(false);
  const user = auth.currentUser;

  const envoyer = async () => {
    if (!raisonChoisie) return;
    if (raisonChoisie === "Autre raison" && !details.trim()) return;
    setChargement(true);
    try {
      await addDoc(collection(db, "signalements"), {
        type,
        cibleId,
        auteurId: user.uid,
        raison: raisonChoisie,
        details: details.trim(),
        createdAt: serverTimestamp(),
        traite: false
      });
      setEnvoye(true);
    } catch (e) {
      console.error("Erreur signalement:", e);
    }
    setChargement(false);
  };

  if (envoye) {
    return (
      <div className="signalement-container">
        <div className="signalement-succes">
          <span className="signalement-succes-icon">✅</span>
          <h3>Signalement envoyé</h3>
          <p>Merci pour ton retour. Nous allons examiner ce contenu.</p>
          <button className="auth-btn" onClick={onFermer}>
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="signalement-container">
      <div className="signalement-header">
        <h3 className="signalement-titre">🚩 Signaler</h3>
        <button className="signalement-fermer" onClick={onFermer}>✕</button>
      </div>

      <p className="signalement-sous-titre">
        Pourquoi tu signales ce contenu ?
      </p>

      <div className="signalement-raisons">
        {RAISONS[type]?.map((raison) => (
          <button
            key={raison}
            className={`signalement-raison ${raisonChoisie === raison ? "actif" : ""}`}
            onClick={() => setRaisonChoisie(raison)}
          >
            {raisonChoisie === raison ? "✓ " : ""}{raison}
          </button>
        ))}
      </div>

      {raisonChoisie === "Autre raison" && (
        <textarea
          className="pub-textarea"
          placeholder="Décris le problème en détail..."
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
        />
      )}

      <button
        className="auth-btn"
        onClick={envoyer}
        disabled={!raisonChoisie || chargement}
      >
        {chargement ? "Envoi..." : "🚩 Envoyer le signalement"}
      </button>
    </div>
  );
}

export default FormulaireSignalement;