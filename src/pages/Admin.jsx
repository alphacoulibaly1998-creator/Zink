import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { collection, query, orderBy, getDocs, doc, getDoc } from "firebase/firestore";

const EMAIL_ADMIN = "alphacoulibaly1998@gmail.com";

function Admin({ onRetour }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [signalements, setSignalements] = useState([]);
  const [onglet, setOnglet] = useState("feedbacks");
  const [chargement, setChargement] = useState(true);
  const user = auth.currentUser;

  const chargerContenuSignale = async (signalement) => {
    try {
      const auteurSnap = await getDoc(doc(db, "utilisateurs", signalement.auteurId));
      const auteur = auteurSnap.exists() ? auteurSnap.data().pseudo : "Inconnu";

      let contenu = "Contenu introuvable";
      let contexte = "";

      if (signalement.type === "profil") {
        const profilSnap = await getDoc(doc(db, "utilisateurs", signalement.cibleId));
        if (profilSnap.exists()) {
          contenu = `Profil : ${profilSnap.data().pseudo}`;
          contexte = profilSnap.data().statut || "";
        }
      } else if (signalement.type === "publication") {
        const pubSnap = await getDoc(doc(db, "publications", signalement.cibleId));
        if (pubSnap.exists()) {
          contenu = pubSnap.data().description || "(Publication avec média uniquement)";
          contexte = pubSnap.data().imageUrl ? "📷 Contient une image" : pubSnap.data().videoUrl ? "🎥 Contient une vidéo" : "";
        }
      }

      return { auteurSignaleur: auteur, contenu, contexte };
    } catch (e) {
      return { auteurSignaleur: "Inconnu", contenu: "Erreur de chargement", contexte: "" };
    }
  };

  useEffect(() => {
    const charger = async () => {
      const qFeedbacks = query(collection(db, "feedbacks"), orderBy("createdAt", "desc"));
      const snapFeedbacks = await getDocs(qFeedbacks);
      setFeedbacks(snapFeedbacks.docs.map((d) => ({ id: d.id, ...d.data() })));

      const qSignalements = query(collection(db, "signalements"), orderBy("createdAt", "desc"));
      const snapSignalements = await getDocs(qSignalements);
      const signalementsData = await Promise.all(
        snapSignalements.docs.map(async (d) => {
          const data = { id: d.id, ...d.data() };
          const details = await chargerContenuSignale(data);
          return { ...data, ...details };
        })
      );
      setSignalements(signalementsData);

      setChargement(false);
    };
    charger();
  }, []);

  const formaterDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return date.toLocaleDateString("fr-FR", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  };

  if (user?.email !== EMAIL_ADMIN) {
    return (
      <div className="jeu-container">
        <div className="jeu-header">
          <button className="chat-retour" onClick={onRetour}>←</button>
          <h2 className="jeu-titre">🔒 Accès refusé</h2>
        </div>
        <p style={{ color: "#888", textAlign: "center" }}>
          Cette page est réservée à l'administrateur.
        </p>
      </div>
    );
  }

  return (
    <div className="parametres-container">
      <div className="jeu-header">
        <button className="chat-retour" onClick={onRetour}>←</button>
        <h2 className="jeu-titre">🛠️ Admin</h2>
      </div>

      <div className="amis-onglets">
        <button
          className={`onglet-btn ${onglet === "feedbacks" ? "actif" : ""}`}
          onClick={() => setOnglet("feedbacks")}
        >
          💬 Feedbacks {feedbacks.length > 0 && <span className="onglet-badge">{feedbacks.length}</span>}
        </button>
        <button
          className={`onglet-btn ${onglet === "signalements" ? "actif" : ""}`}
          onClick={() => setOnglet("signalements")}
        >
          🚩 Signalements {signalements.length > 0 && <span className="onglet-badge">{signalements.length}</span>}
        </button>
      </div>

      {chargement ? (
        <div className="chargement">Chargement...</div>
      ) : onglet === "feedbacks" ? (
        <div className="notifs-liste">
          {feedbacks.length === 0 ? (
            <p className="param-info">Aucun feedback pour l'instant.</p>
          ) : (
            feedbacks.map((f) => (
              <div key={f.id} className="notif-item" style={{ cursor: "default" }}>
                <div className="notif-texte" style={{ width: "100%" }}>
                  <p className="notif-message">{f.message}</p>
                  <span className="notif-date">{f.email} — {formaterDate(f.createdAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="notifs-liste">
          {signalements.length === 0 ? (
            <p className="param-info">Aucun signalement pour l'instant.</p>
          ) : (
            signalements.map((s) => (
              <div key={s.id} className="notif-item" style={{ cursor: "default", flexDirection: "column", alignItems: "flex-start" }}>
                <div className="notif-texte" style={{ width: "100%" }}>
                  <p className="notif-message">
                    <strong>{s.type.toUpperCase()}</strong> — {s.raison}
                  </p>
                  {s.details && (
                    <p style={{ color: "#888", fontSize: "12px", fontStyle: "italic" }}>
                      "{s.details}"
                    </p>
                  )}
                  <div style={{ background: "#0f0f1a", borderRadius: "8px", padding: "10px", marginTop: "8px" }}>
                    <p style={{ color: "#a855f7", fontSize: "12px", margin: "0 0 4px 0" }}>Contenu signalé :</p>
                    <p style={{ color: "#ffffff", fontSize: "13px", margin: 0 }}>{s.contenu}</p>
                    {s.contexte && (
                      <p style={{ color: "#888", fontSize: "12px", margin: "4px 0 0 0" }}>{s.contexte}</p>
                    )}
                  </div>
                  <span className="notif-date">Signalé par {s.auteurSignaleur} — {formaterDate(s.createdAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default Admin;