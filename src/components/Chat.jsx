import { useState, useEffect, useRef } from "react";
import { db, auth } from "../firebase";
import {
  collection, addDoc, serverTimestamp, onSnapshot,
  query, orderBy, doc, updateDoc, getDoc, setDoc, getDocs
} from "firebase/firestore";
import { IMGBB_API_KEY } from "../config";
import axios from "axios";

const EMOJIS = ["😀","😂","😍","🥰","😎","😭","😱","🤔","👍","❤️","🔥","🎉","💯","🙏","😴","🤣","😊","🥺","😅","💪","🎮","👀","💬","✨","🌍","🎵","🍕","😋","🤩","👋"];

function Chat({ convId, autre, autreId, onRetour }) {
  const [messages, setMessages] = useState([]);
  const [texte, setTexte] = useState("");
  const [chargement, setChargement] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [afficherEmojis, setAfficherEmojis] = useState(false);
  const [menuMessage, setMenuMessage] = useState(null);
  const basRef = useRef(null);
  const user = auth.currentUser;

  useEffect(() => {
    const q = query(
      collection(db, "conversations", convId, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setTimeout(() => basRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    marquerLu();
    return () => unsub();
  }, [convId]);

  const marquerLu = async () => {
    const ref = doc(db, "conversations", convId);
    await updateDoc(ref, { [`nonLu.${user.uid}`]: 0 });
  };

  const envoyerMessage = async (type = "texte", contenu = "") => {
    const valeur = type === "texte" ? texte.trim() : contenu;
    if (!valeur) return;
    setChargement(true);

    const autreSnap = await getDoc(doc(db, "utilisateurs", autreId));
    const bloquesParlAutre = autreSnap.data()?.bloques || [];
    const monSnap = await getDoc(doc(db, "utilisateurs", user.uid));
    const mesBlockes = monSnap.data()?.bloques || [];

    if (bloquesParlAutre.includes(user.uid) || mesBlockes.includes(autreId)) {
      alert("Impossible d'envoyer un message à cet utilisateur.");
      setChargement(false);
      return;
    }

    const msgData = {
      userId: user.uid,
      type,
      texte: type === "texte" ? valeur : "",
      mediaUrl: type !== "texte" ? valeur : "",
      createdAt: serverTimestamp(),
      supprimePour: [],
      supprimePourTous: false
    };

    await addDoc(collection(db, "conversations", convId, "messages"), msgData);
    const convRef = doc(db, "conversations", convId);
    const convSnap = await getDoc(convRef);
    const nonLuActuel = convSnap.data()?.nonLu?.[autreId] || 0;
    await updateDoc(convRef, {
      dernierMessage: {
        texte: type === "texte" ? valeur : type === "photo" ? "📷 Photo" : type === "video" ? "🎥 Vidéo" : "🎤 Vocal",
        createdAt: new Date()
      },
      [`nonLu.${autreId}`]: nonLuActuel + 1
    });

    if (type === "texte") setTexte("");
    setChargement(false);
  };

  const envoyerMedia = async (e, type) => {
    const fichier = e.target.files[0];
    if (!fichier) return;
    if (type === "video" && fichier.size > 50 * 1024 * 1024) {
      alert("La vidéo ne doit pas dépasser 50MB.");
      return;
    }
    setChargement(true);
    try {
      const formData = new FormData();
      formData.append("image", fichier);
      formData.append("key", IMGBB_API_KEY);
      const res = await axios.post("https://api.imgbb.com/1/upload", formData);
      await envoyerMessage(type, res.data.data.url);
    } catch {
      alert(`Erreur lors de l'envoi.`);
    }
    setChargement(false);
  };

  const demarrerVocal = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
     recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result;
          await envoyerMessage("vocal", base64);
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setEnregistrement(true);
    } catch {
      alert("Impossible d'accéder au microphone.");
    }
  };

  const arreterVocal = () => {
    mediaRecorder?.stop();
    setEnregistrement(false);
    setMediaRecorder(null);
  };

  const supprimerMessage = async (msg, pourTous = false) => {
    setMenuMessage(null);
    const ref = doc(db, "conversations", convId, "messages", msg.id);
    const now = new Date();
    const createdAt = msg.createdAt?.toDate();
    const diff = createdAt ? now - createdAt : 0;

    if (pourTous && diff > 24 * 60 * 60 * 1000) {
      alert("Tu ne peux supprimer pour tout le monde que dans les 24h.");
      return;
    }

    if (pourTous) {
      await updateDoc(ref, { supprimePourTous: true, texte: "Message supprimé" });
      await updateDoc(doc(db, "conversations", convId), {
        "dernierMessage.texte": "Message supprimé"
      });
    } else {
      await updateDoc(ref, {
        supprimePour: [...(msg.supprimePour || []), user.uid]
      });
      const convRef = doc(db, "conversations", convId);
      const convSnap = await getDoc(convRef);
      if (convSnap.data()?.dernierMessage?.texte === msg.texte) {
        const msgsSnap = await getDocs(
          query(
            collection(db, "conversations", convId, "messages"),
            orderBy("createdAt", "desc")
          )
        );
        const precedent = msgsSnap.docs.find((d) => {
          const data = d.data();
          return d.id !== msg.id &&
            !data.supprimePour?.includes(user.uid) &&
            !data.supprimePourTous;
        });
        await updateDoc(convRef, {
          "dernierMessage.texte": precedent
            ? precedent.data().texte || "📷 Photo"
            : "Aucun message"
        });
      }
    }
  };

  const signalerMessage = (msg) => {
    setMenuMessage(null);
    alert("Message signalé. Merci pour ton retour !");
  };

  const formaterHeure = (timestamp) => {
    if (!timestamp) return "";
    return timestamp.toDate().toLocaleTimeString("fr-FR", {
      hour: "2-digit", minute: "2-digit"
    });
  };

  const estMasque = (msg) => {
    return msg.supprimePour?.includes(user.uid);
  };

  return (
    <div className="chat-container" onClick={() => { setAfficherEmojis(false); setMenuMessage(null); }}>
      <div className="chat-header">
        <button className="chat-retour" onClick={onRetour}>←</button>
        <div className="chat-avatar">
          {autre?.photoURL ? (
            <img src={autre.photoURL} alt="avatar" />
          ) : (
            <div className="conv-avatar-placeholder">
              {autre?.pseudo?.[0]?.toUpperCase() || "?"}
            </div>
          )}
        </div>
        <span className="chat-pseudo">{autre?.pseudo}</span>
      </div>

      <div className="chat-messages">
        {messages.map((msg) => {
          const estMoi = msg.userId === user.uid;
          if (estMasque(msg)) return null;

          return (
            <div
              key={msg.id}
              className={`message-wrapper ${estMoi ? "moi" : "autre"}`}
            >
              <div
                className={`message ${estMoi ? "message-moi" : "message-autre"}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuMessage(menuMessage === msg.id ? null : msg.id);
                }}
              >
              {msg.supprimePourTous && !msg.supprimePour?.includes(user.uid) ? (
                  <span
                    className="message-supprime"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuMessage(menuMessage === msg.id ? null : msg.id);
                    }}
                  >
                    Message supprimé
                  </span>
                ) : msg.type === "texte" ? (
                  <span>{msg.texte}</span>
                ) : msg.type === "photo" ? (
                  <img src={msg.mediaUrl} alt="photo" className="message-photo" />
                ) : msg.type === "video" ? (
                  <video controls src={msg.mediaUrl} className="message-photo" />
                ) : msg.type === "vocal" ? (
                  <audio controls src={msg.mediaUrl} className="message-audio" />
                ) : null}
                <span className="message-heure">{formaterHeure(msg.createdAt)}</span>
              </div>

              {menuMessage === msg.id && (
                <div className="message-menu" onClick={(e) => e.stopPropagation()}>
                  {msg.supprimePourTous ? (
                    <button onClick={() => supprimerMessage(msg, false)}>
                      🗑️ Supprimer pour moi
                    </button>
                  ) : estMoi ? (
                    <>
                      <button onClick={() => supprimerMessage(msg, false)}>
                        🗑️ Supprimer pour moi
                      </button>
                      <button onClick={() => supprimerMessage(msg, true)}>
                        🗑️ Supprimer pour tous
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => supprimerMessage(msg, false)}>
                        🗑️ Supprimer pour moi
                      </button>
                      <button onClick={() => signalerMessage(msg)}>
                        🚩 Signaler
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={basRef} />
      </div>

      {afficherEmojis && (
        <div className="emoji-panel" onClick={(e) => e.stopPropagation()}>
          {EMOJIS.map((e) => (
            <button
              key={e}
              className="emoji-btn"
              onClick={() => setTexte((prev) => prev + e)}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <div className="chat-input" onClick={(e) => e.stopPropagation()}>
        <button
          className="chat-btn-emoji"
          onClick={() => setAfficherEmojis(!afficherEmojis)}
        >
          😊
        </button>

        <label className="chat-btn-media">
          📷
          <input
            type="file"
            accept="image/*"
            onChange={(e) => envoyerMedia(e, "photo")}
            style={{ display: "none" }}
          />
        </label>

        <label className="chat-btn-media">
          🎥
          <input
            type="file"
            accept="video/*"
            onChange={(e) => envoyerMedia(e, "video")}
            style={{ display: "none" }}
          />
        </label>

        {enregistrement ? (
          <button className="chat-btn-vocal enregistrement" onClick={arreterVocal}>
            ⏹️
          </button>
        ) : (
          <button className="chat-btn-vocal" onClick={demarrerVocal}>
            🎤
          </button>
        )}

        <input
          className="chat-texte"
          type="text"
          placeholder="Écris un message..."
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && envoyerMessage()}
          onClick={(e) => e.stopPropagation()}
        />
        <button
          className="chat-btn-envoyer"
          onClick={() => envoyerMessage()}
          disabled={chargement}
        >
          ➤
        </button>
      </div>
    </div>
  );
}

export default Chat;