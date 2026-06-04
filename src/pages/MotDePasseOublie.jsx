import { useState } from "react";
import { auth } from "../firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { useNavigate } from "react-router-dom";

function MotDePasseOublie() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);
  const navigate = useNavigate();

  const envoyer = async () => {
    setErreur("");
    setMessage("");
    if (!email.trim()) {
      setErreur("Entre ton email.");
      return;
    }
    setChargement(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessage("✅ Email de réinitialisation envoyé ! Vérifie ta boîte mail.");
    } catch (e) {
      if (e.code === "auth/user-not-found") {
        setErreur("Aucun compte trouvé avec cet email.");
      } else {
        setErreur("Une erreur est survenue. Réessaie.");
      }
    }
    setChargement(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1 className="auth-titre">Zink</h1>
        <p className="auth-sous-titre">Réinitialiser le mot de passe</p>

        <input
          className="auth-input"
          type="email"
          placeholder="Ton email"
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
          {chargement ? "Envoi..." : "📧 Envoyer le lien"}
        </button>

        <p className="auth-lien" onClick={() => navigate("/login")}>
          ← Retour à la connexion
        </p>
      </div>
    </div>
  );
}

export default MotDePasseOublie;