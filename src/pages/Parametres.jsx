import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import {
  updatePassword, verifyBeforeUpdateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider, deleteUser
} from "firebase/auth";
import { doc, deleteDoc, getDoc, updateDoc, arrayRemove } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import APropos from "./APropos";
import Admin from "./Admin";
import { auth as authAdmin } from "../firebase";

const EMAIL_ADMIN = "alphacoulibaly1998@gmail.com";

function Parametres({ onRetour }) {
  const [section, setSection] = useState(null);
  const [mdpActuel, setMdpActuel] = useState("");
  const [nouveauMdp, setNouveauMdp] = useState("");
  const [nouvelEmail, setNouvelEmail] = useState("");
  const [voirMdp, setVoirMdp] = useState(false);
  const [voirNouveauMdp, setVoirNouveauMdp] = useState(false);
 const [message, setMessage] = useState("");
 const [afficherAPropos, setAfficherAPropos] = useState(false);
  const [afficherAdmin, setAfficherAdmin] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackEnvoye, setFeedbackEnvoye] = useState(false);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [message]);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);
  const [bloques, setBloques] = useState([]);
  const user = auth.currentUser;
  const navigate = useNavigate();

  useEffect(() => {
    const chargerBloques = async () => {
      const snap = await getDoc(doc(db, "utilisateurs", user.uid));
      if (!snap.exists()) return;
      const bloquesIds = snap.data().bloques || [];
      const bloquesData = await Promise.all(
        bloquesIds.map(async (id) => {
          const s = await getDoc(doc(db, "utilisateurs", id));
          return s.exists() ? { id, ...s.data() } : null;
        })
      );
      setBloques(bloquesData.filter(Boolean));
    };
    chargerBloques();
  }, []);

  const debloquer = async (autreId, pseudo) => {
    if (!window.confirm(`Débloquer ${pseudo} ?`)) return;
    await updateDoc(doc(db, "utilisateurs", user.uid), {
      bloques: arrayRemove(autreId)
    });
    setBloques((prev) => prev.filter((b) => b.id !== autreId));
  };

  const reinitialiser = () => {
    setMdpActuel("");
    setNouveauMdp("");
    setNouvelEmail("");
    setMessage("");
    setErreur("");
  };

  const reauthenthifier = async () => {
    const credential = EmailAuthProvider.credential(user.email, mdpActuel);
    await reauthenticateWithCredential(user, credential);
  };

  const changerMdp = async () => {
    setErreur("");
    setMessage("");
    if (!mdpActuel || !nouveauMdp) {
      setErreur("Remplis tous les champs.");
      return;
    }
    const mdpRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!mdpRegex.test(nouveauMdp)) {
      setErreur("Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre.");
      return;
    }
    setChargement(true);
    try {
      await reauthenthifier();
      await updatePassword(user, nouveauMdp);
      setMessage("✅ Mot de passe changé avec succès !");
      reinitialiser();
      setSection(null);
    } catch (e) {
      if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        setErreur("Mot de passe actuel incorrect.");
      } else {
        setErreur("Une erreur est survenue. Réessaie.");
      }
    }
    setChargement(false);
  };

  const changerEmail = async () => {
    setErreur("");
    setMessage("");
    if (!mdpActuel || !nouvelEmail) {
      setErreur("Remplis tous les champs.");
      return;
    }
    if (nouvelEmail === user.email) {
      setErreur("C'est déjà ton email actuel.");
      return;
    }
    setChargement(true);
    try {
      await reauthenthifier();
      await verifyBeforeUpdateEmail(user, nouvelEmail);
      setMessage("✅ Un email de vérification a été envoyé à " + nouvelEmail + ". Vérifie ta boîte mail pour confirmer le changement.");
      setMdpActuel("");
      setNouvelEmail("");
      setSection(null);
    } catch (e) {
      if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        setErreur("Mot de passe actuel incorrect.");
      } else if (e.code === "auth/email-already-in-use") {
        setErreur("Cet email est déjà utilisé par un autre compte.");
      } else if (e.code === "auth/invalid-email") {
        setErreur("L'adresse email n'est pas valide.");
      } else if (e.code === "auth/requires-recent-login") {
        setErreur("Session expirée. Déconnecte-toi et reconnecte-toi avant de changer l'email.");
      } else {
        setErreur("Une erreur est survenue. Réessaie.");
      }
    }
    setChargement(false);
  };

  const supprimerCompte = async () => {
    setErreur("");
    if (!mdpActuel) {
      setErreur("Entre ton mot de passe pour confirmer.");
      return;
    }
    if (!window.confirm("Supprimer définitivement ton compte ? Cette action est irréversible.")) return;
    setChargement(true);
    try {
      await reauthenthifier();
      await deleteDoc(doc(db, "utilisateurs", user.uid));
      await deleteUser(user);
      navigate("/login");
    } catch (e) {
      if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        setErreur("Mot de passe incorrect.");
      } else {
        setErreur("Une erreur est survenue. Réessaie.");
      }
    }
    setChargement(false);
  };

  if (afficherAPropos) return <APropos onRetour={() => setAfficherAPropos(false)} />;
  if (afficherAdmin) return <Admin onRetour={() => setAfficherAdmin(false)} />;

  return (
    <div className="parametres-container">
      <div className="jeu-header">
        <button className="chat-retour" onClick={onRetour}>←</button>
        <h2 className="jeu-titre">⚙️ Paramètres</h2>
      </div>

      {message && <p className="auth-succes">{message}</p>}

      <div className="parametres-liste">

        <div
          className={`param-item ${section === "mdp" ? "actif" : ""}`}
          onClick={() => { setSection(section === "mdp" ? null : "mdp"); reinitialiser(); }}
        >
          <span className="param-icon">🔑</span>
          <span className="param-label">Changer le mot de passe</span>
          <span className="param-fleche">{section === "mdp" ? "▲" : "▼"}</span>
        </div>

        {section === "mdp" && (
          <div className="param-form">
            <div className="mdp-container">
              <input
                className="auth-input"
                type={voirMdp ? "text" : "password"}
                placeholder="Mot de passe actuel"
                value={mdpActuel}
                onChange={(e) => setMdpActuel(e.target.value)}
              />
              <button className="mdp-oeil" onClick={() => setVoirMdp(!voirMdp)}>
                {voirMdp ? "🙈" : "👁️"}
              </button>
            </div>
            <div className="mdp-container">
              <input
                className="auth-input"
                type={voirNouveauMdp ? "text" : "password"}
                placeholder="Nouveau mot de passe"
                value={nouveauMdp}
                onChange={(e) => setNouveauMdp(e.target.value)}
              />
              <button className="mdp-oeil" onClick={() => setVoirNouveauMdp(!voirNouveauMdp)}>
                {voirNouveauMdp ? "🙈" : "👁️"}
              </button>
            </div>
            {erreur && <p className="auth-erreur">{erreur}</p>}
            <button className="auth-btn" onClick={changerMdp} disabled={chargement}>
              {chargement ? "..." : "💾 Sauvegarder"}
            </button>
          </div>
        )}

        <div
          className={`param-item ${section === "email" ? "actif" : ""}`}
          onClick={() => { setSection(section === "email" ? null : "email"); reinitialiser(); }}
        >
          <span className="param-icon">📧</span>
          <span className="param-label">Changer l'email</span>
          <span className="param-fleche">{section === "email" ? "▲" : "▼"}</span>
        </div>

        {section === "email" && (
          <div className="param-form">
            <p className="param-info">Email actuel : <strong>{user.email}</strong></p>
            <div className="mdp-container">
              <input
                className="auth-input"
                type={voirMdp ? "text" : "password"}
                placeholder="Mot de passe actuel"
                value={mdpActuel}
                onChange={(e) => setMdpActuel(e.target.value)}
              />
              <button className="mdp-oeil" onClick={() => setVoirMdp(!voirMdp)}>
                {voirMdp ? "🙈" : "👁️"}
              </button>
            </div>
            <input
              className="auth-input"
              type="email"
              placeholder="Nouvel email"
              value={nouvelEmail}
              onChange={(e) => setNouvelEmail(e.target.value)}
            />
            {erreur && <p className="auth-erreur">{erreur}</p>}
            <button className="auth-btn" onClick={changerEmail} disabled={chargement}>
              {chargement ? "..." : "💾 Sauvegarder"}
            </button>
          </div>
        )}

        <div
          className={`param-item danger ${section === "supprimer" ? "actif" : ""}`}
          onClick={() => { setSection(section === "supprimer" ? null : "supprimer"); reinitialiser(); }}
        >
          <span className="param-icon">🗑️</span>
          <span className="param-label">Supprimer mon compte</span>
          <span className="param-fleche">{section === "supprimer" ? "▲" : "▼"}</span>
        </div>

        {section === "supprimer" && (
          <div className="param-form">
            <p className="param-info danger-txt">⚠️ Cette action est irréversible !</p>
            <div className="mdp-container">
              <input
                className="auth-input"
                type={voirMdp ? "text" : "password"}
                placeholder="Confirme ton mot de passe"
                value={mdpActuel}
                onChange={(e) => setMdpActuel(e.target.value)}
              />
              <button className="mdp-oeil" onClick={() => setVoirMdp(!voirMdp)}>
                {voirMdp ? "🙈" : "👁️"}
              </button>
            </div>
            {erreur && <p className="auth-erreur">{erreur}</p>}
            <button
              className="profil-btn-deconnexion"
              onClick={supprimerCompte}
              disabled={chargement}
            >
              {chargement ? "..." : "🗑️ Supprimer définitivement"}
            </button>
          </div>
        )}

        <div
          className={`param-item ${section === "bloques" ? "actif" : ""}`}
          onClick={() => setSection(section === "bloques" ? null : "bloques")}
        >
          <span className="param-icon">🚫</span>
          <span className="param-label">Personnes bloquées</span>
          <span className="param-fleche">{section === "bloques" ? "▲" : "▼"}</span>
        </div>

        {section === "bloques" && (
          <div className="param-form">
            {bloques.length === 0 ? (
              <p className="param-info">Aucune personne bloquée.</p>
            ) : (
              bloques.map((b) => (
                <div key={b.id} className="ami-item">
                  <div className="conv-avatar-placeholder" style={{ width: 40, height: 40 }}>
                    {b.avatar || b.pseudo?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="ami-infos">
                    <span className="conv-pseudo">{b.pseudo}</span>
                  </div>
                  <button className="ami-btn-suppr" onClick={() => debloquer(b.id, b.pseudo)}>
                    Débloquer
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        <div
          className="param-item"
          onClick={() => setSection(section === "feedback" ? null : "feedback")}
        >
          <span className="param-icon">💬</span>
          <span className="param-label">Envoyer un feedback</span>
          <span className="param-fleche">{section === "feedback" ? "▲" : "▼"}</span>
        </div>

        {section === "feedback" && (
          <div className="param-form">
            {feedbackEnvoye ? (
              <p className="auth-succes">✅ Merci pour ton retour !</p>
            ) : (
              <>
                <p className="param-info">
                  Dis-nous ce que tu penses de Zink, un bug rencontré,
                  ou une idée d'amélioration.
                </p>
                <textarea
                  className="pub-textarea"
                  placeholder="Ton message..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                />
                <button
                  className="auth-btn"
                  onClick={async () => {
                    if (!feedback.trim()) return;
                    const { addDoc, collection: col, serverTimestamp: ts } = await import("firebase/firestore");
                    await addDoc(col(db, "feedbacks"), {
                      userId: user.uid,
                      email: user.email,
                      message: feedback.trim(),
                      createdAt: ts()
                    });
                    setFeedback("");
                    setFeedbackEnvoye(true);
                  }}
                  disabled={!feedback.trim()}
                >
                  📤 Envoyer
                </button>
              </>
            )}
          </div>
        )}

        <div
          className="param-item"
          onClick={() => setAfficherAPropos(true)}
        >
          <span className="param-icon">ℹ️</span>
          <span className="param-label">À propos de Zink</span>
          <span className="param-fleche">→</span>
        </div>

        {authAdmin.currentUser?.email === EMAIL_ADMIN && (
          <div
            className="param-item"
            onClick={() => setAfficherAdmin(true)}
          >
            <span className="param-icon">🛠️</span>
            <span className="param-label">Admin</span>
            <span className="param-fleche">→</span>
          </div>
        )}

      </div>
    </div>
  );
}

export default Parametres;