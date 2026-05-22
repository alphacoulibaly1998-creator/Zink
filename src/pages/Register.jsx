import { useState } from "react";
import { auth } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";

function Register() {
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, motDePasse);
      navigate("/");
    } catch (e) {
      setErreur("Erreur : vérifie ton email et mot de passe (6 caractères min).");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1 className="auth-titre">Zink</h1>
        <p className="auth-sous-titre">Crée ton compte</p>

        <input
          className="auth-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="auth-input"
          type="password"
          placeholder="Mot de passe (6 caractères min)"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
        />

        {erreur && <p className="auth-erreur">{erreur}</p>}

        <button className="auth-btn" onClick={handleRegister}>
          S'inscrire
        </button>

        <p className="auth-lien" onClick={() => navigate("/login")}>
          Déjà un compte ? <span>Connecte-toi</span>
        </p>
      </div>
    </div>
  );
}

export default Register;