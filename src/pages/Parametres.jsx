import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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

function Parametres() {
  const { t, i18n } = useTranslation();
  const [section, setSection] = useState(null);
  const [estAdmin, setEstAdmin] = useState(false);
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
      setEstAdmin(snap.data().role === "admin");
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
    if (!window.confirm(t("parametres.confirmerDebloquer", { pseudo }))) return;
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
      setErreur(t("parametres.remplirChamps"));
      return;
    }
    const mdpRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!mdpRegex.test(nouveauMdp)) {
      setErreur(t("parametres.mdpTropFaible"));
      return;
    }
    setChargement(true);
    try {
      await reauthenthifier();
      await updatePassword(user, nouveauMdp);
      setMessage(t("parametres.mdpChangeSucces"));
      reinitialiser();
      setSection(null);
    } catch (e) {
      if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        setErreur(t("parametres.mdpActuelIncorrect"));
      } else {
        setErreur(t("parametres.erreurGenerale"));
      }
    }
    setChargement(false);
  };

  const changerEmail = async () => {
    setErreur("");
    setMessage("");
    if (!mdpActuel || !nouvelEmail) {
      setErreur(t("parametres.remplirChamps"));
      return;
    }
    if (nouvelEmail === user.email) {
      setErreur(t("parametres.emailDejaActuel"));
      return;
    }
    setChargement(true);
    try {
      await reauthenthifier();
      await verifyBeforeUpdateEmail(user, nouvelEmail);
      setMessage(t("parametres.emailVerifEnvoye", { email: nouvelEmail }));
      setMdpActuel("");
      setNouvelEmail("");
      setSection(null);
    } catch (e) {
      if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        setErreur(t("parametres.mdpActuelIncorrect"));
      } else if (e.code === "auth/email-already-in-use") {
        setErreur(t("parametres.emailDejaUtilise"));
      } else if (e.code === "auth/invalid-email") {
        setErreur(t("parametres.emailInvalide"));
      } else if (e.code === "auth/requires-recent-login") {
        setErreur(t("parametres.sessionExpiree"));
      } else {
        setErreur(t("parametres.erreurGenerale"));
      }
    }
    setChargement(false);
  };

  const supprimerCompte = async () => {
    setErreur("");
    if (!mdpActuel) {
      setErreur(t("parametres.entrerMdpConfirmer"));
      return;
    }
    if (!window.confirm(t("parametres.confirmerSuppression"))) return;
    setChargement(true);
    try {
      await reauthenthifier();
      await deleteDoc(doc(db, "utilisateurs", user.uid));
      await deleteUser(user);
      navigate("/login");
    } catch (e) {
      if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        setErreur(t("parametres.mdpIncorrect"));
      } else {
        setErreur(t("parametres.erreurGenerale"));
      }
    }
    setChargement(false);
  };

  if (afficherAPropos) return <APropos onRetour={() => setAfficherAPropos(false)} />;
  if (afficherAdmin) return <Admin onRetour={() => setAfficherAdmin(false)} />;

  return (
    <div className="parametres-container">
      <div className="jeu-header">
        <button className="chat-retour" onClick={() => navigate(-1)}>←</button>
        <h2 className="jeu-titre">{t("parametres.titre")}</h2>
      </div>

      {message && <p className="auth-succes">{message}</p>}

      <div className="parametres-liste">

        <div
          className={`param-item ${section === "langue" ? "actif" : ""}`}
          onClick={() => setSection(section === "langue" ? null : "langue")}
        >
          <span className="param-icon">🌐</span>
          <span className="param-label">{t("parametres.langue")}</span>
          <span className="param-fleche">{section === "langue" ? "▲" : "▼"}</span>
        </div>

        {section === "langue" && (
          <div className="param-form" style={{ display: "flex", gap: "8px" }}>
            <button
              className="auth-btn"
              style={{ opacity: i18n.language === "fr" ? 1 : 0.5 }}
              onClick={() => i18n.changeLanguage("fr")}
            >
              🇫🇷 Français
            </button>
            <button
              className="auth-btn"
              style={{ opacity: i18n.language === "en" ? 1 : 0.5 }}
              onClick={() => i18n.changeLanguage("en")}
            >
              🇬🇧 English
            </button>
          </div>
        )}

        <div
          className={`param-item ${section === "mdp" ? "actif" : ""}`}
          onClick={() => { setSection(section === "mdp" ? null : "mdp"); reinitialiser(); }}
        >
          <span className="param-icon">🔑</span>
          <span className="param-label">{t("parametres.changerMdp")}</span>
          <span className="param-fleche">{section === "mdp" ? "▲" : "▼"}</span>
        </div>

        {section === "mdp" && (
          <div className="param-form">
            <div className="mdp-container">
              <input
                className="auth-input"
                type={voirMdp ? "text" : "password"}
                placeholder={t("parametres.mdpActuelPlaceholder")}
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
                placeholder={t("parametres.nouveauMdpPlaceholder")}
                value={nouveauMdp}
                onChange={(e) => setNouveauMdp(e.target.value)}
              />
              <button className="mdp-oeil" onClick={() => setVoirNouveauMdp(!voirNouveauMdp)}>
                {voirNouveauMdp ? "🙈" : "👁️"}
              </button>
            </div>
            {erreur && <p className="auth-erreur">{erreur}</p>}
            <button className="auth-btn" onClick={changerMdp} disabled={chargement}>
              {chargement ? "..." : t("parametres.sauvegarder")}
            </button>
          </div>
        )}

        <div
          className={`param-item ${section === "email" ? "actif" : ""}`}
          onClick={() => { setSection(section === "email" ? null : "email"); reinitialiser(); }}
        >
          <span className="param-icon">📧</span>
          <span className="param-label">{t("parametres.changerEmail")}</span>
          <span className="param-fleche">{section === "email" ? "▲" : "▼"}</span>
        </div>

        {section === "email" && (
          <div className="param-form">
            <p className="param-info">{t("parametres.emailActuel")} <strong>{user.email}</strong></p>
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
              placeholder={t("parametres.nouvelEmailPlaceholder")}
              value={nouvelEmail}
              onChange={(e) => setNouvelEmail(e.target.value)}
            />
            {erreur && <p className="auth-erreur">{erreur}</p>}
            <button className="auth-btn" onClick={changerEmail} disabled={chargement}>
              {chargement ? "..." : t("parametres.sauvegarder")}
            </button>
          </div>
        )}

        <div
          className={`param-item danger ${section === "supprimer" ? "actif" : ""}`}
          onClick={() => { setSection(section === "supprimer" ? null : "supprimer"); reinitialiser(); }}
        >
          <span className="param-icon">🗑️</span>
          <span className="param-label">{t("parametres.supprimerCompte")}</span>
          <span className="param-fleche">{section === "supprimer" ? "▲" : "▼"}</span>
        </div>

        {section === "supprimer" && (
          <div className="param-form">
            <p className="param-info danger-txt">{t("parametres.irreversible")}</p>
            <div className="mdp-container">
              <input
                className="auth-input"
                type={voirMdp ? "text" : "password"}
                placeholder={t("parametres.confirmeMdp")}
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
              {chargement ? "..." : t("parametres.supprimerDefinitivement")}
            </button>
          </div>
        )}

        <div
          className={`param-item ${section === "bloques" ? "actif" : ""}`}
          onClick={() => setSection(section === "bloques" ? null : "bloques")}
        >
          <span className="param-icon">🚫</span>
          <span className="param-label">{t("parametres.personnesBloquees")}</span>
          <span className="param-fleche">{section === "bloques" ? "▲" : "▼"}</span>
        </div>

        {section === "bloques" && (
          <div className="param-form">
            {bloques.length === 0 ? (
              <p className="param-info">{t("parametres.aucunePersonneBloquee")}</p>
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
                    {t("parametres.debloquer")}
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
          <span className="param-label">{t("parametres.envoyerFeedback")}</span>
          <span className="param-fleche">{section === "feedback" ? "▲" : "▼"}</span>
        </div>

        {section === "feedback" && (
          <div className="param-form">
            {feedbackEnvoye ? (
              <p className="auth-succes">{t("parametres.feedbackMerci")}</p>
            ) : (
              <>
                <p className="param-info">
                  {t("parametres.feedbackIntro")}
                </p>
                <textarea
                  className="pub-textarea"
                  placeholder={t("parametres.feedbackPlaceholder")}
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
                  {t("parametres.envoyer")}
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
          <span className="param-label">{t("parametres.aPropos")}</span>
          <span className="param-fleche">→</span>
        </div>

        {estAdmin && (
          <div
            className="param-item"
            onClick={() => setAfficherAdmin(true)}
          >
            <span className="param-icon">🛠️</span>
            <span className="param-label">{t("parametres.admin")}</span>
            <span className="param-fleche">→</span>
          </div>
        )}

      </div>
    </div>
  );
}

export default Parametres;