import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import {
  doc, getDoc, updateDoc, arrayUnion, arrayRemove, setDoc
} from "firebase/firestore";
import { creerNotification } from "../notifications";
import { useNavigate } from "react-router-dom";

function ProfilPublic({ userId, onRetour }) {
  const [profil, setProfil] = useState(null);
  const [monProfil, setMonProfil] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [menuOuvert, setMenuOuvert] = useState(false);
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
      await navigator.share({ title: `Profil de ${profil?.pseudo} sur Zink`, url });
    } else {
      navigator.clipboard.writeText(url);
      alert("Lien copié !");
    }
  };

  const signalerProfil = () => {
    alert(`Profil de ${profil?.pseudo} signalé. Merci pour ton retour !`);
  };

  const retirerAmi = async () => {
    setMenuOuvert(false);
    if (!window.confirm(`Retirer ${profil?.pseudo} de tes amis ?`)) return;
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
    alert(`${profil?.pseudo} a été retiré de tes amis.`);
  };

  const bloquerUtilisateur = async () => {
    setMenuOuvert(false);
    const bloques = monProfil?.bloques || [];
    const estBloque = bloques.includes(userId);
    if (estBloque) {
      if (!window.confirm(`Débloquer ${profil?.pseudo} ?`)) return;
      await updateDoc(doc(db, "utilisateurs", user.uid), {
        bloques: arrayRemove(userId)
      });
      setMonProfil((prev) => ({
        ...prev,
        bloques: (prev?.bloques || []).filter((id) => id !== userId)
      }));
      alert(`${profil?.pseudo} a été débloqué.`);
    } else {
      if (!window.confirm(`Bloquer ${profil?.pseudo} ? Il sera retiré de tes amis.`)) return;
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
      alert(`${profil?.pseudo} a été bloqué et retiré de tes amis.`);
    }
  };

  const afficherSexe = (s) => {
    const map = { homme: "Homme", femme: "Femme", autre: "Autre", "non-precise": "Non précisé" };
    return map[s] || null;
  };

  if (chargement) return <div className="chargement">Chargement...</div>;
  if (!profil) return <div className="chargement">Profil introuvable.</div>;

  const statut = getStatutRelation();

  return (
    <div className="profil-container">
      <div className="jeu-header">
        <button className="chat-retour" onClick={onRetour}>←</button>
        <h2 className="jeu-titre">👤 Profil</h2>
        <div className="pub-menu-container">
          <button
            className="pub-btn-menu"
            onClick={() => setMenuOuvert(!menuOuvert)}
          >
            ⋯
          </button>
          {menuOuvert && (
            <div className="pub-menu">
              <button onClick={() => { partagerProfil(); setMenuOuvert(false); }}>
                🔗 Partager le profil
              </button>
              {getStatutRelation() === "ami" && (
                <button onClick={retirerAmi}>
                  👥 Retirer des amis
                </button>
              )}
              <button onClick={bloquerUtilisateur}>
                🚫 {monProfil?.bloques?.includes(userId) ? "Débloquer" : "Bloquer"}
              </button>
              <button className="menu-suppr" onClick={() => { signalerProfil(); setMenuOuvert(false); }}>
                🚩 Signaler
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
        <p className="profil-pays">🌍 {profil.pays}</p>
        <p className="profil-statut">"{profil.statut}"</p>

        <div className="profil-public-actions">
          {statut === "ami" && (
            <button className="decouvrir-btn-ami deja-ami">✓ Ami</button>
          )}
          {statut === "envoye" && (
            <button className="decouvrir-btn-ami en-attente">⏳ Demande envoyée</button>
          )}
           {statut === "recu" && (
            <button className="decouvrir-btn-ami recu" onClick={accepterDemande}>
              👥 Accepter
            </button>
          )}
          {statut === "aucun" && (
            <button className="decouvrir-btn-ami" onClick={envoyerDemande}>
              👥 Ajouter
            </button>
          )}
          <button className="ami-btn-msg" onClick={ouvrirChat}>💬</button>
        </div>
      </div>

      <div className="profil-infos">
        <div className="profil-info-card">
          <span className="profil-info-label">⭐ Points</span>
          <span className="profil-info-valeur">{profil.points || 0}</span>
        </div>
        <div className="profil-info-card">
          <span className="profil-info-label">🏆 Badges</span>
          <span className="profil-info-valeur">{profil.badges?.length || 0}</span>
        </div>
        {profil.sexe && (
          <div className="profil-info-card">
            <span className="profil-info-label">👤 Sexe</span>
            <span className="profil-info-valeur">{afficherSexe(profil.sexe)}</span>
          </div>
        )}
        {profil.dateNaissance && !profil.dateMasquee && (
          <div className="profil-info-card">
            <span className="profil-info-label">🎂 Âge</span>
            <span className="profil-info-valeur">{profil.age} ans</span>
          </div>
        )}
        <div className="profil-info-card">
          <span className="profil-info-label">📱 Téléphone</span>
          <span className="profil-info-valeur">
            {profil.telephone && !profil.telephoneMasque
              ? profil.telephone
              : "Masqué 🔒"}
          </span>
        </div>
        <div className="profil-info-card">
          <span className="profil-info-label">🌐 Statut</span>
          <span className={`profil-info-valeur ${profil.enLigne ? "en-ligne" : "hors-ligne"}`}>
            {profil.enLigne ? "● En ligne" : "● Hors ligne"}
          </span>
        </div>
      </div>
    </div>
  );
}

export default ProfilPublic;