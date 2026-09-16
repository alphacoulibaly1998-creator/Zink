import { useState } from "react";
import { useTranslation } from "react-i18next";
import { db, auth } from "../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

const RAISONS_CLES = {
  profil: [
    "profilFausseIdentite",
    "profilContenuInapproprie",
    "harcelement",
    "spamArnaque",
    "contenuHaineux",
    "autreRaison",
  ],
  publication: [
    "pubContenuViolent",
    "pubContenuSexuel",
    "harcelement",
    "faussesInfos",
    "spamPublicite",
    "contenuHaineux",
    "autreRaison",
  ],
  commentaire: [
    "harcelement",
    "contenuHaineux",
    "spam",
    "langageAbusif",
    "faussesInfos",
    "autreRaison",
  ],
  message: [
    "harcelement",
    "msgContenuInapproprie",
    "spamArnaque",
    "menaces",
    "contenuHaineux",
    "autreRaison",
  ],
};

function FormulaireSignalement({ type, cibleId, onFermer }) {
  const { t } = useTranslation();
  const [raisonChoisie, setRaisonChoisie] = useState("");
  const [details, setDetails] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const [chargement, setChargement] = useState(false);
  const user = auth.currentUser;

  const envoyer = async () => {
    if (!raisonChoisie) return;
    if (raisonChoisie === "autreRaison" && !details.trim()) return;
    setChargement(true);
    try {
      await addDoc(collection(db, "signalements"), {
        type,
        cibleId,
        auteurId: user.uid,
        raison: t(`signalement.${raisonChoisie}`),
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
          <h3>{t("signalement.succesTitre")}</h3>
          <p>{t("signalement.succesTexte")}</p>
          <button className="auth-btn" onClick={onFermer}>
            {t("signalement.retour")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="signalement-container">
      <div className="signalement-header">
        <h3 className="signalement-titre">{t("signalement.titre")}</h3>
        <button className="signalement-fermer" onClick={onFermer}>✕</button>
      </div>

      <p className="signalement-sous-titre">
        {t("signalement.sousTitre")}
      </p>

      <div className="signalement-raisons">
        {RAISONS_CLES[type]?.map((cle) => (
          <button
            key={cle}
            className={`signalement-raison ${raisonChoisie === cle ? "actif" : ""}`}
            onClick={() => setRaisonChoisie(cle)}
          >
            {raisonChoisie === cle ? "✓ " : ""}{t(`signalement.${cle}`)}
          </button>
        ))}
      </div>

      {raisonChoisie === "autreRaison" && (
        <textarea
          className="pub-textarea"
          placeholder={t("signalement.detailsPlaceholder")}
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
        {chargement ? t("signalement.envoiEnCours") : t("signalement.envoyerSignalement")}
      </button>
    </div>
  );
}

export default FormulaireSignalement;