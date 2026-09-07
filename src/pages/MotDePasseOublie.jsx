import { useState } from "react";
import { useTranslation } from "react-i18next";
import { auth } from "../firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { useNavigate } from "react-router-dom";

function MotDePasseOublie() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);
  const navigate = useNavigate();

  const envoyer = async () => {
    setErreur("");
    setMessage("");
    if (!email.trim()) {
      setErreur(t("mdpOublie.entrerEmail"));
      return;
    }
    setChargement(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessage(t("mdpOublie.emailEnvoye"));
    } catch (e) {
      if (e.code === "auth/user-not-found") {
        setErreur(t("mdpOublie.aucunCompte"));
      } else {
        setErreur(t("mdpOublie.erreurGenerale"));
      }
    }
    setChargement(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1 className="auth-titre">Zink</h1>
        <p className="auth-sous-titre">{t("mdpOublie.titre")}</p>

        <input
          className="auth-input"
          type="email"
          placeholder={t("mdpOublie.emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {message && <p className="auth-succes">{message}</p>}
        {erreur && <p className="auth-erreur">{erreur}</p>}

        <button
          className="auth-btn"
          onClick={envoyer}
          disabled={chargement}
        >
          {chargement ? t("mdpOublie.envoiEnCours") : t("mdpOublie.envoyerLien")}
        </button>

        <p className="auth-lien" onClick={() => navigate("/login")}>
          {t("mdpOublie.retourConnexion")}
        </p>
      </div>
    </div>
  );
}

export default MotDePasseOublie;