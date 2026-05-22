import { useState } from "react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, motDePasse);
      navigate("/");
    } catch (e) {
      setErreur("Email ou mot de passe incorrect.");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1 className="auth-titre">Zink</h1>
        <p className="auth-sous-titre">Connecte-toi</p>

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
          placeholder="Mot de passe"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
        />

        {erreur && <p className="auth-erreur">{erreur}</p>}

        <button className="auth-btn" onClick={handleLogin}>
          Se connecter
        </button>

        <p className="auth-lien" onClick={() => navigate("/register")}>
          Pas encore de compte ? <span>Inscris-toi</span>
        </p>
      </div>
    </div>
  );
}

export default Login;