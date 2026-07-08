import { useState, useEffect, useRef } from "react";
import { db, auth } from "../firebase";
import {
  collection, query, where, onSnapshot,
  getDoc, doc, deleteDoc, updateDoc
} from "firebase/firestore";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Chat from "../components/Chat";

function Messages() {
  const [conversations, setConversations] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [menuConv, setMenuConv] = useState(null);
  const [menuConvVersHaut, setMenuConvVersHaut] = useState(false);
  useEffect(() => {
    const handleClick = () => setMenuConv(null);
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  const { convId: convIdParam } = useParams();
  const [convActiveData, setConvActiveData] = useState(null);
  const user = auth.currentUser;
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.convId) {
      setConvActiveData({
        id: location.state.convId,
        autreId: location.state.autreId,
        autre: location.state.autre
      });
      navigate(`/messages/${location.state.convId}`, { replace: true, state: null });
    } else if (convIdParam) {
      const chargerConv = async () => {
        const { getDoc, doc } = await import("firebase/firestore");
        const convSnap = await getDoc(doc(db, "conversations", convIdParam));
        if (convSnap.exists()) {
          const data = convSnap.data();
          const autreId = data.membres.find((m) => m !== user.uid);
          const autreSnap = await getDoc(doc(db, "utilisateurs", autreId));
          setConvActiveData({
            id: convIdParam,
            autreId,
            autre: autreSnap.exists() ? autreSnap.data() : { pseudo: "Inconnu" }
          });
        } else {
          const ids = convIdParam.split("_");
          const autreId = ids.find((id) => id !== user.uid);
          if (autreId) {
            const autreSnap = await getDoc(doc(db, "utilisateurs", autreId));
            if (autreSnap.exists()) {
              setConvActiveData({
                id: convIdParam,
                autreId,
                autre: autreSnap.data()
              });
            }
          }
        }
      };
      chargerConv();
    }
  }, [convIdParam]);

  useEffect(() => {
    if (!user) return;
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

  const ouvrirConv = (conv) => {
    setConvActiveData(conv);
    navigate(`/messages/${conv.id}`);
  };

  const fermerConv = () => {
    setConvActiveData(null);
    navigate("/messages");
  };

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


  if (convIdParam && convActiveData) {
    return (
      <Chat
        convId={convActiveData.id}
        autre={convActiveData.autre}
        autreId={convActiveData.autreId}
        onRetour={fermerConv}
        onVoirProfil={(userId) => navigate(`/profil/${userId}`)}
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
                onClick={() => ouvrirConv(conv)}
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
                    if (menuConv !== conv.id) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const espaceEnBas = window.innerHeight - rect.bottom;
                      setMenuConvVersHaut(espaceEnBas < 250);
                    }
                    setMenuConv(menuConv === conv.id ? null : conv.id);
                  }}
                >
                  ⋯
                </button>
                {menuConv === conv.id && (
                  <div
                    className={`conv-menu ${menuConvVersHaut ? "vers-haut" : ""}`}
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