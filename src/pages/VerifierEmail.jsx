import { useState, useEffect } from "react";
import { auth } from "../firebase";
import { sendEmailVerification, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

function VerifierEmail() {
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
      setMessage("✅ Email renvoyé ! Vérifie ta boîte mail et tes spams.");
    } catch (e) {
      setMessage("⏳ Attends un peu avant de redemander un email.");
    }
    setEnvoiEnCours(false);
  };

  const verifierMaintenant = async () => {
    setVerification(true);
    await user.reload();
    if (user.emailVerified) {
      window.location.href = "/";
    } else {
      setMessage("Ton email n'est pas encore vérifié. Vérifie ta boîte mail.");
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
        <p className="auth-sous-titre">Vérifie ton email</p>

        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <span style={{ fontSize: "48px" }}>📧</span>
        </div>

        <p style={{ color: "#dddddd", fontSize: "14px", textAlign: "center", lineHeight: "1.6" }}>
          Nous avons envoyé un email de vérification à <strong>{user?.email}</strong>.
          Clique sur le lien dans l'email (vérifie aussi tes spams) pour activer ton compte.
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
          {verification ? "Vérification..." : "✅ J'ai vérifié mon email"}
        </button>

        <button
          className="profil-btn-annuler"
          onClick={renvoyerEmail}
          disabled={envoiEnCours}
        >
          {envoiEnCours ? "Envoi..." : "📤 Renvoyer l'email"}
        </button>

        <p className="auth-lien" onClick={deconnexion}>
          🚪 Se déconnecter
        </p>
      </div>
    </div>
  );
}

export default VerifierEmail;