import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, where, onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate, Navigate } from "react-router-dom";
import { paysList } from "../indicatifs";
import axios from "axios";
import { BADGES_INFO } from "../jeuxStats";
import { nettoyerTexte } from "../sanitize";

const AVATARS = ["🐶","🐱","🦊","🐼","🐨","🦁","🐯","🐸","🐙","🦋","🌸","⭐","🔥","🎮","🎵","🌈","💎","🚀","🎯","👑"];

function Profil() {
  const { t } = useTranslation();
  const [profil, setProfil] = useState(null);
  const [edition, setEdition] = useState(false);
  const [pseudo, setPseudo] = useState("");
  const [statut, setStatut] = useState("");
  const [telephone, setTelephone] = useState("");
  const [telephoneMasque, setTelephoneMasque] = useState(false);
  const [age, setAge] = useState("");
  const [dateMasquee, setDateMasquee] = useState(false);
  const [sexe, setSexe] = useState("");
  const [erreurTel, setErreurTel] = useState("");
  const [chargement, setChargement] = useState(true);
  const [uploadPhoto, setUploadPhoto] = useState(false);
  const [afficherAvatars, setAfficherAvatars] = useState(false);
  const [nbNotifs, setNbNotifs] = useState(0);
  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notifications"),
      where("cibleId", "==", user.uid),
      where("lu", "==", false)
    );
    const unsub = onSnapshot(q, (snap) => {
      setNbNotifs(snap.docs.length);
    });
    return () => unsub();
  }, []);

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
        setAge(data.dateNaissance || "");
        setDateMasquee(data.dateMasquee || false);
        setSexe(data.sexe || "");
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

  const changerPhoto = async (e) => {
    const fichier = e.target.files[0];
    if (!fichier) return;
    if (fichier.size > 5 * 1024 * 1024) {
      alert("L'image ne doit pas dépasser 5MB.");
      return;
    }
    setUploadPhoto(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(fichier);
      });
      const res = await axios.post("/api/upload-image", { imageBase64: base64 });
      const photoURL = res.data.url;
      await updateDoc(doc(db, "utilisateurs", user.uid), { photoURL });
      setProfil({ ...profil, photoURL });
    } catch {
      alert("Erreur lors du chargement de la photo.");
    }
    setUploadPhoto(false);
  };

  const choisirAvatar = async (avatar) => {
    await updateDoc(doc(db, "utilisateurs", user.uid), {
      photoURL: "",
      avatar
    });
    setProfil({ ...profil, photoURL: "", avatar });
    setAfficherAvatars(false);
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
    if (age) {
      const dateNaissance = new Date(age);
      const ageCalcule = Math.floor((new Date() - dateNaissance) / (365.25 * 24 * 60 * 60 * 1000));
      if (ageCalcule < 0 || ageCalcule > 120) {
        alert("Date de naissance invalide.");
        return;
      }
    }
    const indicatif = profil?.indicatif || "";
    const numeroComplet = telephone
      ? `${indicatif}${telephone.replace(/\s/g, "")}`
      : "";
    const ageCalculeFinal = age
      ? Math.floor((new Date() - new Date(age)) / (365.25 * 24 * 60 * 60 * 1000))
      : "";
    const ref = doc(db, "utilisateurs", user.uid);
    await updateDoc(ref, {
      pseudo: nettoyerTexte(pseudo),
      statut: nettoyerTexte(statut),
      telephone: numeroComplet,
      telephoneMasque,
      dateNaissance: age || "",
      dateMasquee,
      age: ageCalculeFinal,
      sexe
    });
    setProfil({
      ...profil,
      pseudo,
      statut,
      telephone: numeroComplet,
      telephoneMasque,
      dateNaissance: age || "",
      dateMasquee,
      age: ageCalculeFinal,
      sexe
    });
    setEdition(false);
  };

  const deconnexion = async () => {
    try {
      const ref = doc(db, "utilisateurs", user.uid);
      await updateDoc(ref, {
        enLigne: false,
        dernièreVue: serverTimestamp()
      });
    } catch (e) {}
    await signOut(auth);
    navigate("/login");
  };

  const afficherTelephone = () => {
    if (!profil?.telephone) return t("profil.nonRenseigne");
    if (telephoneMasque) return t("profil.masque");
    return profil.telephone;
  };

  const afficherSexe = (s) => {
    const map = {
      homme: t("inscription.homme"),
      femme: t("inscription.femme"),
      autre: t("inscription.autre"),
      "non-precise": t("inscription.nonPrecise")
    };
    return map[s] || t("profil.nonRenseigne");
  };

  if (chargement) return <div className="chargement">Chargement...</div>;

  return (
    <div className="profil-container">
      <div className="profil-top">
        <h1 className="accueil-titre">{t("profil.titre")}</h1>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className="profil-btn-parametres"
            style={{ position: "relative" }}
            onClick={() => navigate("/notifications")}
          >
            🔔
            {nbNotifs > 0 && (
              <span className="nav-badge" style={{ top: -6, right: -6 }}>
                {nbNotifs}
              </span>
            )}
          </button>
          <button
            className="profil-btn-parametres"
            onClick={() => navigate("/parametres")}
          >
            ⚙️
          </button>
        </div>
      </div>

      <div className="profil-header">
        <div className="profil-photo-container">
          {profil?.photoURL ? (
            <img src={profil.photoURL} alt="avatar" className="profil-avatar" />
          ) : (
            <div className="profil-avatar-placeholder">
              {profil?.avatar || profil?.pseudo?.[0]?.toUpperCase() || "?"}
            </div>
          )}
          <label className="profil-btn-photo">
            {uploadPhoto ? "⏳" : "📷"}
            <input
              type="file"
              accept="image/*"
              onChange={changerPhoto}
              style={{ display: "none" }}
            />
          </label>
        </div>

        <button
          className="profil-btn-avatar"
          onClick={() => setAfficherAvatars(!afficherAvatars)}
        >
          {t("profil.choisirAvatar")}
        </button>

        {afficherAvatars && (
          <div className="avatars-grid">
            {AVATARS.map((a) => (
              <button
                key={a}
                className={`avatar-btn ${profil?.avatar === a ? "actif" : ""}`}
                onClick={() => choisirAvatar(a)}
              >
                {a}
              </button>
            ))}
          </div>
        )}

        {edition ? (
          <input
            className="auth-input"
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            placeholder={t("profil.pseudoPlaceholder")}
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
            placeholder={t("profil.statutPlaceholder")}
          />
        ) : (
          <p className="profil-statut">"{profil?.statut}"</p>
        )}
      </div>

      <div className="profil-infos">
        <div className="profil-info-card">
          <span className="profil-info-label">{t("profil.age")}</span>
          <span className="profil-info-valeur">
            {edition ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <input
                  type="date"
                  className="auth-input"
                  value={age}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setAge(e.target.value)}
                  style={{ padding: "6px" }}
                />
                {age && (
                  <label className="auth-checkbox">
                    <input
                      type="checkbox"
                      checked={dateMasquee}
                      onChange={(e) => setDateMasquee(e.target.checked)}
                    />
                    {t("profil.masquerDate")}
                  </label>
                )}
              </div>
            ) : (
              profil?.dateMasquee
                ? t("profil.masque")
                : profil?.dateNaissance
                ? `${new Date(profil.dateNaissance).toLocaleDateString(i18n.language === "en" ? "en-US" : "fr-FR", { day: "numeric", month: "long", year: "numeric" })} (${profil.age} ${t("profil.ans")})`
                : t("profil.nonRenseigne")
            )}
          </span>
        </div>
        <div className="profil-info-card">
          <span className="profil-info-label">{t("profil.sexe")}</span>
          <span className="profil-info-valeur">
            {edition ? (
              <select
                className="auth-input"
                value={sexe}
                onChange={(e) => setSexe(e.target.value)}
                style={{ padding: "6px" }}
              >
                <option value="">{t("inscription.choisirSexe")}</option>
                <option value="homme">{t("inscription.homme")}</option>
                <option value="femme">{t("inscription.femme")}</option>
                <option value="autre">{t("inscription.autre")}</option>
                <option value="non-precise">{t("inscription.nonPrecise")}</option>
              </select>
            ) : (
              afficherSexe(profil?.sexe)
            )}
          </span>
        </div>
        <div className="profil-info-card">
          <span className="profil-info-label">{t("profil.telephone")}</span>
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
                  ? `${getPaysInfo().chiffres} ${i18n.language === "en" ? "digits (optional)" : "chiffres (optionnel)"}`
                  : t("inscription.telephone")
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
              {t("profil.masquerNumero")}
            </label>
          )}
        </div>
      )}

      <div className="profil-infos">
        <div className="profil-info-card">
          <span className="profil-info-label">{t("profil.points")}</span>
          <span className="profil-info-valeur">{profil?.points || 0}</span>
        </div>
        <div className="profil-info-card">
          <span className="profil-info-label">{t("profil.badges")}</span>
          <span className="profil-info-valeur">{profil?.badges?.length || 0}</span>
        </div>
        <div className="profil-info-card">
          <span className="profil-info-label">{t("profil.serieActuelle")}</span>
          <span className="profil-info-valeur">{profil?.serieVictoires || 0}</span>
        </div>
      </div>

      {profil?.badges?.length > 0 && (
        <div className="badges-section">
          <p className="attaques-titre">{t("profil.tesBadges")}</p>
          <div className="badges-grid">
            {(() => {
              const badges = [...profil.badges];
              const seriesPossedees = badges.filter((b) => b.startsWith("serie_"));
              if (seriesPossedees.length > 1) {
                const ordre = ["serie_10", "serie_6", "serie_3"];
                const meilleureSerie = ordre.find((s) => seriesPossedees.includes(s));
                const aSupprimer = seriesPossedees.filter((s) => s !== meilleureSerie);
                return badges.filter((b) => !aSupprimer.includes(b));
              }
              return badges;
            })().map((badgeId) => {
              const badge = BADGES_INFO[badgeId];
              if (!badge) return null;
              return (
                <div key={badgeId} className="badge-card">
                  <span className="badge-icon">{badge.icon}</span>
                  <span className="badge-nom">{badge.nom}</span>
                  <span className="badge-desc">{badge.description}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="profil-actions">
        {edition ? (
          <>
            <button className="auth-btn" onClick={sauvegarder}>
              {t("profil.sauvegarder")}
            </button>
            <button className="profil-btn-annuler" onClick={() => setEdition(false)}>
              {t("profil.annuler")}
            </button>
          </>
        ) : (
          <button className="auth-btn" onClick={() => setEdition(true)}>
            {t("profil.modifier")}
          </button>
        )}
        <button className="profil-btn-deconnexion" onClick={deconnexion}>
          {t("profil.deconnexion")}
        </button>
      </div>
    </div>
  );
}

export default Profil;