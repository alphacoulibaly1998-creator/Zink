import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import {
  collection, query, where, onSnapshot,
  doc, getDoc, updateDoc
} from "firebase/firestore";
import ProfilPublic from "./ProfilPublic";
import { useNavigate } from "react-router-dom";

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [profilOuvert, setProfilOuvert] = useState(null);
  const user = auth.currentUser;
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(
      collection(db, "notifications"),
      where("cibleId", "==", user.uid),
      where("lu", "==", false)
    );
    const unsub = onSnapshot(q, async (snap) => {
      const notifs = await Promise.all(
        snap.docs.map(async (d) => {
          const data = { id: d.id, ...d.data() };
          if (data.auteurId) {
            const auteurSnap = await getDoc(doc(db, "utilisateurs", data.auteurId));
            data.auteur = auteurSnap.exists() ? auteurSnap.data() : { pseudo: "Inconnu" };
          }
          return data;
        })
      );
      notifs.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
      setNotifications(notifs);
      setChargement(false);
    });
    return () => unsub();
  }, []);

  const marquerLu = async (notif) => {
    await updateDoc(doc(db, "notifications", notif.id), { lu: true });
    if (notif.type === "demande_ami" || notif.type === "ami_accepte") {
      setProfilOuvert(notif.auteurId);
    }
    if (notif.type === "like" || notif.type === "commentaire") {
      onRetour();
      navigate("/");
    }
  };

  const marquerToutLu = async () => {
    await Promise.all(
      notifications.map((n) =>
        updateDoc(doc(db, "notifications", n.id), { lu: true })
      )
    );
  };

  const getIcone = (type) => {
    const icones = {
      ami_accepte: "👥",
      demande_ami: "👤",
      message: "💬",
      attaque: "💥",
      like: "❤️",
      commentaire: "💬",
    };
    return icones[type] || "🔔";
  };

  const getMessage = (notif) => {
    const pseudo = notif.auteur?.pseudo || "Quelqu'un";
    switch (notif.type) {
      case "demande_ami": return `${pseudo} t'a envoyé une demande d'ami`;
      case "ami_accepte": return `${pseudo} a accepté ta demande d'ami`;
      case "message": return `${pseudo} t'a envoyé un message`;
      case "attaque": return `${pseudo} t'a envoyé une attaque sonore`;
      case "like": return `${pseudo} a aimé ta publication`;
      case "commentaire": return `${pseudo} a commenté ta publication`;
      default: return "Nouvelle notification";
    }
  };

  const formaterDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return "À l'instant";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  if (profilOuvert) return (
    <ProfilPublic
      userId={profilOuvert}
      onRetour={() => setProfilOuvert(null)}
    />
  );
  
  return (
    <div className="notifs-container">
      <div className="jeu-header">
        <button className="chat-retour" onClick={() => navigate(-1)}>←</button>
        <h2 className="jeu-titre">🔔 Notifications</h2>
        {notifications.length > 0 && (
          <button className="notif-tout-lu" onClick={marquerToutLu}>
            Tout marquer lu
          </button>
        )}
      </div>

      {chargement ? (
        <div className="chargement">Chargement...</div>
      ) : notifications.length === 0 ? (
        <div className="feed-vide">
          <p>Aucune nouvelle notification 🔔</p>
          <p>Tu es à jour !</p>
        </div>
      ) : (
        <div className="notifs-liste">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="notif-item"
              onClick={() => marquerLu(notif)}
            >
              <div className="notif-icone">{getIcone(notif.type)}</div>
              <div className="notif-infos">
                <div className="notif-avatar">
                  {notif.auteur?.photoURL ? (
                    <img src={notif.auteur.photoURL} alt="avatar" />
                  ) : (
                    <div className="notif-avatar-placeholder">
                      {notif.auteur?.avatar || notif.auteur?.pseudo?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                </div>
                <div className="notif-texte">
                  <p className="notif-message">{getMessage(notif)}</p>
                  <span className="notif-date">{formaterDate(notif.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Notifications;