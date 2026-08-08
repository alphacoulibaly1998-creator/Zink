import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import {
  doc, getDoc, updateDoc, arrayUnion, arrayRemove, setDoc
} from "firebase/firestore";
import { creerNotification } from "../notifications";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

function ProfilPublic({ userId: userIdProp, onRetour }) {
  const { t } = useTranslation();
  const [profil, setProfil] = useState(null);
  const [monProfil, setMonProfil] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [menuOuvertVersHaut, setMenuOuvertVersHaut] = useState(false);
  useEffect(() => {
    const handleClick = (e) => {
      if (e.target.closest(".pub-menu-container")) return;
      setMenuOuvert(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  const { userId: userIdParam } = useParams();
  const userId = userIdProp || userIdParam;
  const user = auth.currentUser;
  const navigate = useNavigate();

  useEffect(() => {
    const charger = async () => {
      const [snapAutre, snapMoi] = await Promise.all([
        getDoc(doc(db, "utilisateurs", userId)),
        getDoc(doc(db, "utilisateurs", user.uid))
      ]);
      if (snapAutre.exists()) setProfil({ id: userId, ...snapAutre.data() });
      if (snapMoi.exists()) setMonProfil(snapMoi.data());
      setChargement(false);
    };
    charger();
  }, [userId]);

  const getStatutRelation = () => {
    const amis = monProfil?.amis || [];
    const envoyes = monProfil?.demandesEnvoyees || [];
    const recus = monProfil?.demandesRecues || [];
    if (amis.includes(userId)) return "ami";
    if (envoyes.includes(userId)) return "envoye";
    if (recus.includes(userId)) return "recu";
    return "aucun";
  };

  const envoyerDemande = async () => {
    await updateDoc(doc(db, "utilisateurs", user.uid), {
      demandesEnvoyees: arrayUnion(userId)
    });
    await updateDoc(doc(db, "utilisateurs", userId), {
      demandesRecues: arrayUnion(user.uid)
    });
    await creerNotification(userId, user.uid, "demande_ami");
    setMonProfil((prev) => ({
      ...prev,
      demandesEnvoyees: [...(prev?.demandesEnvoyees || []), userId]
    }));
  };

  const accepterDemande = async () => {
    await updateDoc(doc(db, "utilisateurs", user.uid), {
      amis: arrayUnion(userId),
      demandesRecues: arrayRemove(userId)
    });
    await updateDoc(doc(db, "utilisateurs", userId), {
      amis: arrayUnion(user.uid),
      demandesEnvoyees: arrayRemove(user.uid)
    });
    setMonProfil((prev) => ({
      ...prev,
      amis: [...(prev?.amis || []), userId],
      demandesRecues: (prev?.demandesRecues || []).filter((id) => id !== userId)
    }));
  };

  const ouvrirChat = async () => {
    const membres = [user.uid, userId].sort();
    const convId = membres.join("_");
    navigate("/messages", {
      state: {
        convId,
        autreId: userId,
        autre: profil
      }
    });
  };

  const partagerProfil = async () => {
    const url = `${window.location.origin}/profil/${userId}`;
    if (navigator.share) {
      await navigator.share({ title: `${profil?.pseudo} - Zink`, url });
    } else {
      navigator.clipboard.writeText(url);
      alert(t("profilPublic.lienCopie"));
    }
  };

  const signalerProfil = () => {
    console.log("signalerProfil appelé", userId);
    setMenuOuvert(false);
    navigate(`/signalement?type=profil&cibleId=${userId}`);
  };

  const retirerAmi = async () => {
    setMenuOuvert(false);
    if (!window.confirm(t("profilPublic.confirmerRetirerAmi", { pseudo: profil?.pseudo }))) return;
    await updateDoc(doc(db, "utilisateurs", user.uid), {
      amis: arrayRemove(userId)
    });
    await updateDoc(doc(db, "utilisateurs", userId), {
      amis: arrayRemove(user.uid)
    });
    setMonProfil((prev) => ({
      ...prev,
      amis: (prev?.amis || []).filter((id) => id !== userId)
    }));
    alert(t("profilPublic.amiRetireAlert", { pseudo: profil?.pseudo }));
  };

  const bloquerUtilisateur = async () => {
    setMenuOuvert(false);
    const bloques = monProfil?.bloques || [];
    const estBloque = bloques.includes(userId);
    if (estBloque) {
      if (!window.confirm(t("profilPublic.confirmerDebloquer", { pseudo: profil?.pseudo }))) return;
      await updateDoc(doc(db, "utilisateurs", user.uid), {
        bloques: arrayRemove(userId)
      });
      setMonProfil((prev) => ({
        ...prev,
        bloques: (prev?.bloques || []).filter((id) => id !== userId)
      }));
      alert(t("profilPublic.debloqueAlert", { pseudo: profil?.pseudo }));
    } else {
      if (!window.confirm(t("profilPublic.confirmerBloquer", { pseudo: profil?.pseudo }))) return;
      await updateDoc(doc(db, "utilisateurs", user.uid), {
        bloques: arrayUnion(userId),
        amis: arrayRemove(userId)
      });
      await updateDoc(doc(db, "utilisateurs", userId), {
        amis: arrayRemove(user.uid)
      });
      setMonProfil((prev) => ({
        ...prev,
        bloques: [...(prev?.bloques || []), userId],
        amis: (prev?.amis || []).filter((id) => id !== userId)
      }));
      alert(t("profilPublic.bloqueRetireAlert", { pseudo: profil?.pseudo }));
    }
  };

  const afficherSexe = (s) => {
    const map = {
      homme: t("profilPublic.homme"),
      femme: t("profilPublic.femme"),
      autre: t("profilPublic.autre"),
      "non-precise": t("profilPublic.nonPrecise")
    };
    return map[s] || null;
  };

  if (chargement) return <div className="chargement">{t("profilPublic.chargement")}</div>;
  if (!profil) return <div className="chargement">{t("profilPublic.profilIntrouvable")}</div>;

  const statut = getStatutRelation();

  return (
    <div className="profil-container">
      <div className="jeu-header">
        <button className="chat-retour" onClick={onRetour || (() => navigate(-1))}>←</button>
        <h2 className="jeu-titre">{t("profilPublic.titre")}</h2>
        <div className="pub-menu-container">
          <button
            className="pub-btn-menu"
            onClick={(e) => {
              if (!menuOuvert) {
                const rect = e.currentTarget.getBoundingClientRect();
                const espaceEnBas = window.innerHeight - rect.bottom;
                setMenuOuvertVersHaut(espaceEnBas < 250);
              }
              setMenuOuvert(!menuOuvert);
            }}
          >
            ⋯
          </button>
          {menuOuvert && (
            <div className={`pub-menu ${menuOuvertVersHaut ? "vers-haut" : ""}`}>
              <button onClick={() => { partagerProfil(); setMenuOuvert(false); }}>
                {t("profilPublic.partagerProfil")}
              </button>
              {getStatutRelation() === "ami" && (
                <button onClick={retirerAmi}>
                  {t("profilPublic.retirerAmis")}
                </button>
              )}
              <button onClick={bloquerUtilisateur}>
                {monProfil?.bloques?.includes(userId) ? t("profilPublic.debloquer") : t("profilPublic.bloquer")}
              </button>
              <button className="menu-suppr" onClick={() => { signalerProfil(); setMenuOuvert(false); }}>
                {t("profilPublic.signaler")}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="profil-header">
        <div className="profil-photo-container">
          {profil.photoURL ? (
            <img src={profil.photoURL} alt="avatar" className="profil-avatar" />
          ) : (
            <div className="profil-avatar-placeholder">
              {profil.avatar || profil.pseudo?.[0]?.toUpperCase() || "?"}
            </div>
          )}
        </div>

        <h2 className="profil-pseudo">{profil.pseudo}</h2>
        <p className="profil-pays">🌍 {i18n.language === "en" ? (profil.paysEn || profil.pays) : profil.pays}</p>
        <p className="profil-statut">"{profil.statut}"</p>

        <div className="profil-public-actions">
          {statut === "ami" && (
            <button className="decouvrir-btn-ami deja-ami">{t("profilPublic.dejaAmi")}</button>
          )}
          {statut === "envoye" && (
            <button className="decouvrir-btn-ami en-attente">{t("profilPublic.demandeEnvoyee")}</button>
          )}
           {statut === "recu" && (
            <button className="decouvrir-btn-ami recu" onClick={accepterDemande}>
              {t("profilPublic.accepter")}
            </button>
          )}
          {statut === "aucun" && (
            <button className="decouvrir-btn-ami" onClick={envoyerDemande}>
              {t("profilPublic.ajouter")}
            </button>
          )}
          <button className="ami-btn-msg" onClick={ouvrirChat}>💬</button>
        </div>
      </div>

      <div className="profil-infos">
        <div className="profil-info-card">
          <span className="profil-info-label">{t("profilPublic.points")}</span>
          <span className="profil-info-valeur">{profil.points || 0}</span>
        </div>
        <div className="profil-info-card">
          <span className="profil-info-label">{t("profilPublic.badges")}</span>
          <span className="profil-info-valeur">{profil.badges?.length || 0}</span>
        </div>
        {profil.sexe && (
          <div className="profil-info-card">
            <span className="profil-info-label">{t("profilPublic.sexe")}</span>
            <span className="profil-info-valeur">{afficherSexe(profil.sexe)}</span>
          </div>
        )}
        {profil.dateNaissance && !profil.dateMasquee && (
          <div className="profil-info-card">
            <span className="profil-info-label">{t("profilPublic.age")}</span>
            <span className="profil-info-valeur">{profil.age} {t("profilPublic.ans")}</span>
          </div>
        )}
        <div className="profil-info-card">
          <span className="profil-info-label">{t("profilPublic.telephone")}</span>
          <span className="profil-info-valeur">
            {profil.telephone && !profil.telephoneMasque
              ? profil.telephone
              : t("profilPublic.masque")}
          </span>
        </div>
        <div className="profil-info-card">
          <span className="profil-info-label">{t("profilPublic.statutConnexion")}</span>
          <span className={`profil-info-valeur ${profil.enLigne ? "en-ligne" : "hors-ligne"}`}>
            {profil.enLigne ? t("profilPublic.enLigne") : t("profilPublic.horsLigne")}
          </span>
        </div>
      </div>
    
    </div>
  );
}

export default ProfilPublic;