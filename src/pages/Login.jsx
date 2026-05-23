import { useState } from "react";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function Login() {
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setErreur("");
    setChargement(true);

    if (!identifiant.trim() || !motDePasse.trim()) {
      setErreur("Remplis tous les champs.");
      setChargement(false);
      return;
    }

    try {
      let emailAUtiliser = identifiant.trim();

      // Si c'est pas un email, on cherche le numéro dans Firestore
      if (!identifiant.includes("@")) {
        const numero = identifiant.replace(/\s/g, "");
        const q = query(
          collection(db, "utilisateurs"),
          where("telephone", "==", numero)
        );
        const snap = await getDocs(q);
        if (snap.empty) {
          setErreur("Aucun compte trouvé avec ce numéro.");
          setChargement(false);
          return;
        }
        emailAUtiliser = snap.docs[0].data().email;
      }

      await signInWithEmailAndPassword(auth, emailAUtiliser, motDePasse);
      navigate("/");
    } catch (e) {
      if (e.code === "auth/user-not-found" || e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        setErreur("Email, numéro ou mot de passe incorrect.");
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
        <p className="auth-sous-titre">Connecte-toi</p>

        <input
          className="auth-input"
          type="text"
          placeholder="Email ou numéro de téléphone"
          value={identifiant}
          onChange={(e) => setIdentifiant(e.target.value)}
        />
        <input
          className="auth-input"
          type="password"
          placeholder="Mot de passe"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
        />

        {erreur && <p className="auth-erreur">{erreur}</p>}

        <button
          className="auth-btn"
          onClick={handleLogin}
          disabled={chargement}
        >
          {chargement ? "Connexion..." : "Se connecter"}
        </button>

        <p className="auth-lien" onClick={() => navigate("/register")}>
          Pas encore de compte ? <span>Inscris-toi</span>
        </p>
      </div>
    </div>
  );
}

export default Login;