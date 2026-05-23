import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { paysList } from "../indicatifs";

function Profil() {
  const [profil, setProfil] = useState(null);
  const [edition, setEdition] = useState(false);
  const [pseudo, setPseudo] = useState("");
  const [statut, setStatut] = useState("");
  const [telephone, setTelephone] = useState("");
  const [telephoneMasque, setTelephoneMasque] = useState(false);
  const [erreurTel, setErreurTel] = useState("");
  const [chargement, setChargement] = useState(true);
  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    const chargerProfil = async () => {
      const ref = doc(db, "utilisateurs", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setProfil(data);
        setPseudo(data.pseudo);
        setStatut(data.statut);
        setTelephoneMasque(data.telephoneMasque);
        const numero = data.telephone || "";
        const indicatif = data.indicatif || "";
        const sansIndicatif = numero.startsWith(indicatif)
          ? numero.slice(indicatif.length)
          : numero;
        setTelephone(sansIndicatif);
      }
      setChargement(false);
    };
    chargerProfil();
  }, []);

  const getPaysInfo = () => {
    return paysList.find((p) => p.nom === profil?.pays) || null;
  };

  const validerTelephone = () => {
    if (!telephone) return true;
    const chiffres = telephone.replace(/\s/g, "");
    if (!/^\d+$/.test(chiffres)) return false;
    const paysInfo = getPaysInfo();
    if (paysInfo && chiffres.length !== paysInfo.chiffres) return false;
    return true;
  };

  const sauvegarder = async () => {
    setErreurTel("");
    if (!validerTelephone()) {
      const paysInfo = getPaysInfo();
      setErreurTel(
        `Numéro invalide. Le ${profil?.pays} nécessite exactement ${paysInfo?.chiffres} chiffres.`
      );
      return;
    }
    const indicatif = profil?.indicatif || "";
    const numeroComplet = telephone
      ? `${indicatif}${telephone.replace(/\s/g, "")}`
      : "";
    const ref = doc(db, "utilisateurs", user.uid);
    await updateDoc(ref, {
      pseudo,
      statut,
      telephone: numeroComplet,
      telephoneMasque
    });
    setProfil({ ...profil, pseudo, statut, telephone: numeroComplet, telephoneMasque });
    setEdition(false);
  };

  const deconnexion = async () => {
    await signOut(auth);
    navigate("/login");
  };

  if (chargement) return <div className="chargement">Chargement...</div>;

  const afficherTelephone = () => {
    if (!profil?.telephone) return "Non renseigné";
    if (telephoneMasque) return "Masqué 🔒";
    return profil.telephone;
  };

  return (
    <div className="profil-container">
      <div className="profil-header">
        <div className="profil-avatar">
          {profil?.photoURL ? (
            <img src={profil.photoURL} alt="avatar" />
          ) : (
            <div className="profil-avatar-placeholder">
              {profil?.pseudo?.[0]?.toUpperCase() || "?"}
            </div>
          )}
        </div>

        {edition ? (
          <input
            className="auth-input"
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            placeholder="Pseudo"
          />
        ) : (
          <h2 className="profil-pseudo">{profil?.pseudo}</h2>
        )}

        <p className="profil-pays">🌍 {profil?.pays}</p>

        {edition ? (
          <input
            className="auth-input"
            value={statut}
            onChange={(e) => setStatut(e.target.value)}
            placeholder="Statut"
          />
        ) : (
          <p className="profil-statut">"{profil?.statut}"</p>
        )}
      </div>

      <div className="profil-infos">
        <div className="profil-info-card">
          <span className="profil-info-label">⭐ Points</span>
          <span className="profil-info-valeur">{profil?.points || 0}</span>
        </div>
        <div className="profil-info-card">
          <span className="profil-info-label">🏆 Badges</span>
          <span className="profil-info-valeur">{profil?.badges?.length || 0}</span>
        </div>
        <div className="profil-info-card">
          <span className="profil-info-label">📱 Téléphone</span>
          <span className="profil-info-valeur">{afficherTelephone()}</span>
        </div>
      </div>

      {edition && (
        <div className="profil-tel-edition">
          <div className="tel-container">
            <input
              className="auth-input tel-indicatif"
              type="text"
              value={profil?.indicatif || ""}
              readOnly
            />
            <input
              className="auth-input tel-numero"
              type="tel"
              placeholder={
                getPaysInfo()
                  ? `${getPaysInfo().chiffres} chiffres (optionnel)`
                  : "Numéro (optionnel)"
              }
              value={telephone}
              onChange={(e) => {
                setErreurTel("");
                setTelephone(e.target.value);
              }}
            />
          </div>
          {erreurTel && <p className="auth-erreur">{erreurTel}</p>}
          {telephone && (
            <label className="auth-checkbox" style={{ marginTop: "10px" }}>
              <input
                type="checkbox"
                checked={telephoneMasque}
                onChange={(e) => setTelephoneMasque(e.target.checked)}
              />
              Masquer mon numéro de téléphone
            </label>
          )}
        </div>
      )}

      <div className="profil-actions">
        {edition ? (
          <>
            <button className="auth-btn" onClick={sauvegarder}>
              💾 Sauvegarder
            </button>
            <button className="profil-btn-annuler" onClick={() => setEdition(false)}>
              Annuler
            </button>
          </>
        ) : (
          <button className="auth-btn" onClick={() => setEdition(true)}>
            ✏️ Modifier le profil
          </button>
        )}
        <button className="profil-btn-deconnexion" onClick={deconnexion}>
          🚪 Se déconnecter
        </button>
      </div>
    </div>
  );
}

export default Profil;