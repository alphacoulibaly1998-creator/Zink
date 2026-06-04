import { useState } from "react";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function Login() {
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [voirMdp, setVoirMdp] = useState(false);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);
  const [tentatives, setTentatives] = useState(0);
  const [bloque, setBloque] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setErreur("");

    if (bloque) {
      setErreur("Trop de tentatives. Réessaie dans 5 minutes.");
      return;
    }

    setChargement(true);

    if (!identifiant.trim() || !motDePasse.trim()) {
      setErreur("Remplis tous les champs.");
      setChargement(false);
      return;
    }

    try {
      let emailAUtiliser = identifiant.trim();

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
        const nouvellesTentatives = tentatives + 1;
        setTentatives(nouvellesTentatives);
        if (nouvellesTentatives >= 5) {
          setBloque(true);
          setErreur("Trop de tentatives (5/5). Réessaie dans 5 minutes.");
          setTimeout(() => {
            setBloque(false);
            setTentatives(0);
          }, 5 * 60 * 1000);
        } else {
          setErreur(`Email, numéro ou mot de passe incorrect. (${nouvellesTentatives}/5 tentatives)`);
        }
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

        <div className="mdp-container">
          <input
            className="auth-input"
            type={voirMdp ? "text" : "password"}
            placeholder="Mot de passe"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
          />
          <button
            className="mdp-oeil"
            onClick={() => setVoirMdp(!voirMdp)}
          >
            {voirMdp ? "🙈" : "👁️"}
          </button>
        </div>

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
        <p className="auth-lien" onClick={() => navigate("/mot-de-passe-oublie")}>
          Mot de passe oublié ? <span>Réinitialiser</span>
        </p>
      </div>
    </div>
  );
}

export default Login;