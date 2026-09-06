import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { auth } from "../firebase";
import { sendEmailVerification, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

function VerifierEmail() {
  const { t } = useTranslation();
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [message, setMessage] = useState("");
  const [verification, setVerification] = useState(false);
  const user = auth.currentUser;
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(async () => {
      await user.reload();
      if (user.emailVerified) {
        clearInterval(interval);
        navigate("/");
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const renvoyerEmail = async () => {
    setEnvoiEnCours(true);
    setMessage("");
    try {
      await sendEmailVerification(user);
      setMessage(t("verifierEmail.emailRenvoye"));
    } catch (e) {
      setMessage(t("verifierEmail.attendsUnPeu"));
    }
    setEnvoiEnCours(false);
  };

  const verifierMaintenant = async () => {
    setVerification(true);
    await user.reload();
    if (user.emailVerified) {
      window.location.href = "/";
    } else {
      setMessage(t("verifierEmail.pasEncoreVerifie"));
    }
    setVerification(false);
  };

  const deconnexion = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1 className="auth-titre">Zink</h1>
        <p className="auth-sous-titre">{t("verifierEmail.titre")}</p>

        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <span style={{ fontSize: "48px" }}>📧</span>
        </div>

        <p style={{ color: "#dddddd", fontSize: "14px", textAlign: "center", lineHeight: "1.6" }}>
          {t("verifierEmail.texteIntro", { email: user?.email })}
        </p>

        {message && (
          <p className={message.includes("✅") ? "auth-succes" : "auth-erreur"}>
            {message}
          </p>
        )}

        <button
          className="auth-btn"
          onClick={verifierMaintenant}
          disabled={verification}
        >
          {verification ? t("verifierEmail.verificationEnCours") : t("verifierEmail.jaiVerifie")}
        </button>

        <button
          className="profil-btn-annuler"
          onClick={renvoyerEmail}
          disabled={envoiEnCours}
        >
          {envoiEnCours ? t("verifierEmail.envoiEnCours") : t("verifierEmail.renvoyerEmail")}
        </button>

        <p className="auth-lien" onClick={deconnexion}>
          {t("verifierEmail.seDeconnecter")}
        </p>
      </div>
    </div>
  );
}

export default VerifierEmail;