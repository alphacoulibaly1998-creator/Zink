import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import {
  collection, query, where, onSnapshot,
  getDoc, doc, deleteDoc, updateDoc
} from "firebase/firestore";
import Chat from "../components/Chat";

function Messages() {
  const [conversations, setConversations] = useState([]);
  const [convActive, setConvActive] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [menuConv, setMenuConv] = useState(null);
  const user = auth.currentUser;

  useEffect(() => {
    const q = query(
      collection(db, "conversations"),
      where("membres", "array-contains", user.uid)
    );
    const unsub = onSnapshot(q, async (snap) => {
      const convs = await Promise.all(
        snap.docs.map(async (d) => {
          const data = { id: d.id, ...d.data() };
          const autreId = data.membres.find((m) => m !== user.uid);
          const autreSnap = await getDoc(doc(db, "utilisateurs", autreId));
          data.autre = autreSnap.exists()
            ? autreSnap.data()
            : { pseudo: "Inconnu", photoURL: "" };
          data.autreId = autreId;
          return data;
        })
      );
      convs.sort((a, b) => {
        const dateA = a.dernierMessage?.createdAt?.toDate?.() || new Date(a.dernierMessage?.createdAt) || 0;
        const dateB = b.dernierMessage?.createdAt?.toDate?.() || new Date(b.dernierMessage?.createdAt) || 0;
        return dateB - dateA;
      });
      setConversations(convs);
      setChargement(false);
    });
    return () => unsub();
  }, []);

  const supprimerConversation = async (convId) => {
    setMenuConv(null);
    if (window.confirm("Supprimer cette conversation ?")) {
      await deleteDoc(doc(db, "conversations", convId));
    }
  };

  const bloquerUtilisateur = async (conv) => {
    setMenuConv(null);
    const userSnap = await getDoc(doc(db, "utilisateurs", user.uid));
    const bloques = userSnap.data()?.bloques || [];
    const estBloque = bloques.includes(conv.autreId);

    if (estBloque) {
      if (window.confirm(`Débloquer ${conv.autre?.pseudo} ?`)) {
        await updateDoc(doc(db, "utilisateurs", user.uid), {
          bloques: bloques.filter((id) => id !== conv.autreId)
        });
        alert(`${conv.autre?.pseudo} a été débloqué.`);
      }
    } else {
      if (window.confirm(`Bloquer ${conv.autre?.pseudo} ?`)) {
        await updateDoc(doc(db, "utilisateurs", user.uid), {
          bloques: [...bloques, conv.autreId]
        });
        alert(`${conv.autre?.pseudo} a été bloqué.`);
      }
    }
  };

  const formaterDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return "À l'instant";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  if (convActive) {
    return (
      <Chat
        convId={convActive.id}
        autre={convActive.autre}
        autreId={convActive.autreId}
        onRetour={() => setConvActive(null)}
      />
    );
  }

  return (
    <div className="messages-container" onClick={() => setMenuConv(null)}>
      <h1 className="accueil-titre">💬 Messages</h1>

      {chargement ? (
        <div className="chargement">Chargement...</div>
      ) : conversations.length === 0 ? (
        <div className="feed-vide">
          <p>Aucune conversation pour l'instant.</p>
          <p>Va dans Découvrir pour trouver des amis ! 😊</p>
        </div>
      ) : (
        <div className="conv-liste">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conv-item ${conv.nonLu?.[user.uid] ? "non-lu" : ""}`}
            >
              <div
                className="conv-item-contenu"
                onClick={() => setConvActive(conv)}
              >
                <div className="conv-avatar">
                  {conv.autre?.photoURL ? (
                    <img src={conv.autre.photoURL} alt="avatar" />
                  ) : (
                    <div className="conv-avatar-placeholder">
                      {conv.autre?.pseudo?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                </div>
                <div className="conv-infos">
                  <span className="conv-pseudo">{conv.autre?.pseudo}</span>
                  <span className="conv-dernier">
                    {conv.dernierMessage?.texte || "Nouvelle conversation"}
                  </span>
                </div>
                <div className="conv-meta">
                  <span className="conv-date">
                    {formaterDate(conv.dernierMessage?.createdAt)}
                  </span>
                  {conv.nonLu?.[user.uid] > 0 && (
                    <span className="conv-badge">
                      {conv.nonLu[user.uid]}
                    </span>
                  )}
                </div>
              </div>

              <div className="conv-menu-container">
                <button
                  className="conv-btn-menu"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuConv(menuConv === conv.id ? null : conv.id);
                  }}
                >
                  ⋯
                </button>
                {menuConv === conv.id && (
                  <div
                    className="conv-menu"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button onClick={() => supprimerConversation(conv.id)}>
                      🗑️ Supprimer
                    </button>
                    <button
                      className="menu-suppr"
                      onClick={() => bloquerUtilisateur(conv)}
                    >
                      🚫 Bloquer / Débloquer
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Messages;