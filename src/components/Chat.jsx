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
  const [afficherMedia, setAfficherMedia] = useState(false);
  const [menuMessage, setMenuMessage] = useState(null);
  const [mediaEnAttente, setMediaEnAttente] = useState(null);
  const [typeMediaEnAttente, setTypeMediaEnAttente] = useState(null);
  const [apercuMedia, setApercuMedia] = useState(null);
  const [dureeVocal, setDureeVocal] = useState(0);
  const [pauseVocal, setPauseVocal] = useState(false);
  const [autreEnLigne, setAutreEnLigne] = useState(false);
  const [autreVue, setAutreVue] = useState(null);
  const timerRef = useRef(null);
  const basRef = useRef(null);
  const user = auth.currentUser;

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "utilisateurs", autreId), (snap) => {
      if (snap.exists()) {
        setAutreEnLigne(snap.data().enLigne || false);
        setAutreVue(snap.data().dernièreVue || null);
      }
    });
    return () => unsub();
  }, [autreId]);
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
    const q = query(
      collection(db, "conversations", convId, "messages"),
      orderBy("createdAt", "asc")
    );
    const snap = await getDocs(q);
    snap.docs.forEach(async (d) => {
      const data = d.data();
      if (data.userId !== user.uid && data.statut !== "lu") {
        await updateDoc(
          doc(db, "conversations", convId, "messages", d.id),
          { statut: "lu" }
        );
      }
    });
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
      supprimePourTous: false,
      statut: "envoye"
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

  const selectionnerMedia = (e, type) => {
    const fichier = e.target.files[0];
    if (!fichier) return;
    if (type === "video" && fichier.size > 45 * 1024 * 1024) {
      alert("La vidéo ne doit pas dépasser 45MB.");
      return;
    }
    if (type === "photo" && fichier.size > 5 * 1024 * 1024) {
      alert("La photo ne doit pas dépasser 5MB.");
      return;
    }
    setMediaEnAttente(fichier);
    setTypeMediaEnAttente(type);
    setApercuMedia(URL.createObjectURL(fichier));
    setAfficherMedia(false);
  };

  const envoyerMediaAvecTexte = async () => {
    if (!mediaEnAttente && !texte.trim()) return;
    setChargement(true);
    try {
      if (mediaEnAttente && typeMediaEnAttente === "video") {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result;
          await envoyerMessageFusionne("video", base64, texte.trim());
        };
        reader.readAsDataURL(mediaEnAttente);
      } else if (mediaEnAttente && typeMediaEnAttente === "photo") {
        const formData = new FormData();
        formData.append("image", mediaEnAttente);
        formData.append("key", IMGBB_API_KEY);
        const res = await axios.post("https://api.imgbb.com/1/upload", formData);
        await envoyerMessageFusionne("photo", res.data.data.url, texte.trim());
      } else {
        await envoyerMessage("texte");
      }
      setMediaEnAttente(null);
      setApercuMedia(null);
      setTypeMediaEnAttente(null);
    } catch {
      alert("Erreur lors de l'envoi.");
    }
    setChargement(false);
  };

  const envoyerMessageFusionne = async (type, mediaUrl, legende) => {
    const user = auth.currentUser;
    const autreSnap = await getDoc(doc(db, "utilisateurs", autreId));
    const bloquesParlAutre = autreSnap.data()?.bloques || [];
    const monSnap = await getDoc(doc(db, "utilisateurs", user.uid));
    const mesBlockes = monSnap.data()?.bloques || [];

    if (bloquesParlAutre.includes(user.uid) || mesBlockes.includes(autreId)) {
      alert("Impossible d'envoyer un message à cet utilisateur.");
      return;
    }

    const msgData = {
      userId: user.uid,
      type,
      texte: legende || "",
      mediaUrl: type === "video" ? "" : mediaUrl,
      videoData: type === "video" ? mediaUrl : "",
      createdAt: serverTimestamp(),
      supprimePour: [],
      supprimePourTous: false,
      statut: "envoye"
    };

    await addDoc(collection(db, "conversations", convId, "messages"), msgData);
    const convRef = doc(db, "conversations", convId);
    const convSnap = await getDoc(convRef);
    const nonLuActuel = convSnap.data()?.nonLu?.[autreId] || 0;
    await updateDoc(convRef, {
      dernierMessage: {
        texte: legende || (type === "photo" ? "📷 Photo" : "🎥 Vidéo"),
        createdAt: new Date()
      },
      [`nonLu.${autreId}`]: nonLuActuel + 1
    });
    setTexte("");
  };

  const demarrerVocal = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      let annule = false;
      recorder.onstart = () => {
        annule = false;
        setDureeVocal(0);
        timerRef.current = setInterval(() => {
          setDureeVocal((d) => d + 1);
        }, 1000);
      };
      recorder.onstop = async () => {
        clearInterval(timerRef.current);
        setDureeVocal(0);
        setPauseVocal(false);
        stream.getTracks().forEach((t) => t.stop());
        if (annule) return;
        const blob = new Blob(chunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result;
          await envoyerMessage("vocal", base64);
        };
        reader.readAsDataURL(blob);
      };
      recorder.annuler = () => { annule = true; recorder.stop(); };
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

  const togglePauseVocal = () => {
    if (!mediaRecorder) return;
    if (pauseVocal) {
      mediaRecorder.resume();
      timerRef.current = setInterval(() => {
        setDureeVocal((d) => d + 1);
      }, 1000);
      setPauseVocal(false);
    } else {
      mediaRecorder.pause();
      clearInterval(timerRef.current);
      setPauseVocal(true);
    }
  };

  const formaterDuree = (secondes) => {
    const m = Math.floor(secondes / 60).toString().padStart(2, "0");
    const s = (secondes % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
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
    <div className="chat-container">
      <div className="chat-header" onClick={(e) => e.stopPropagation()}>
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
        <div className="chat-header-infos">
          <span className="chat-pseudo">{autre?.pseudo}</span>
          <span className={`chat-statut ${autreEnLigne ? "en-ligne" : "hors-ligne"}`}>
            {autreEnLigne ? "● En ligne" : "● Hors ligne"}
          </span>
        </div>
      </div>

      <div className="chat-messages" onClick={(e) => { e.stopPropagation(); setAfficherEmojis(false); setMenuMessage(null); setAfficherMedia(false); }}>
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
                  <div className="message-media-container">
                    <img src={msg.mediaUrl} alt="photo" className="message-photo" />
                    {msg.texte && <p className="message-legende">{msg.texte}</p>}
                  </div>
                ) : msg.type === "video" ? (
                  <div className="message-media-container">
                    <video controls src={msg.videoData || msg.mediaUrl} className="message-photo" />
                    {msg.texte && <p className="message-legende">{msg.texte}</p>}
                  </div>
                ) : msg.type === "vocal" ? (
                  <audio controls src={msg.mediaUrl} className="message-audio" />
                ) : null}
                <span className="message-heure">
                  {formaterHeure(msg.createdAt)}
                  {msg.userId === user.uid && (
                    <span className="message-statut">
                      {msg.statut === "lu" ? " ✓✓" : msg.statut === "recu" ? " ✓✓" : " ✓"}
                    </span>
                  )}
                </span>
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

{apercuMedia && (
        <div className="chat-apercu-media" onClick={(e) => e.stopPropagation()}>
          {typeMediaEnAttente === "photo" ? (
            <img src={apercuMedia} alt="aperçu" />
          ) : (
            <video src={apercuMedia} controls />
          )}
          <button
            className="chat-apercu-suppr"
            onClick={() => {
              setMediaEnAttente(null);
              setApercuMedia(null);
              setTypeMediaEnAttente(null);
            }}
          >
            ✕
          </button>
        </div>
      )}
      <div className="chat-input" onClick={(e) => e.stopPropagation()}>
        <button
          className="chat-btn-plus"
          onClick={() => setAfficherEmojis(false) || setAfficherMedia(!afficherMedia)}
        >
          ➕
        </button>

        <div className="chat-texte-container">
          <button
            className="chat-emoji-inline"
            onClick={(e) => { e.stopPropagation(); setAfficherMedia(false); setAfficherEmojis(!afficherEmojis); }}
          >
            😊
          </button>
          <input
            className="chat-texte"
            type="text"
            placeholder="Écris un message..."
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && envoyerMessage()}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {enregistrement ? (
          <div className="vocal-recorder" onClick={(e) => e.stopPropagation()}>
            <button className="vocal-btn-annuler" onClick={() => {
              mediaRecorder?.annuler();
              setEnregistrement(false);
              setMediaRecorder(null);
            }}>
              ✕
            </button>
            <div className="vocal-ondes">
              {!pauseVocal && (
                <>
                  <span className="onde"></span>
                  <span className="onde"></span>
                  <span className="onde"></span>
                  <span className="onde"></span>
                  <span className="onde"></span>
                </>
              )}
              {pauseVocal && (
                <span className="vocal-pause-txt">En pause</span>
              )}
            </div>
            <span className="vocal-timer">{formaterDuree(dureeVocal)}</span>
            <button className="vocal-btn-pause" onClick={togglePauseVocal}>
              {pauseVocal ? "▶️" : "⏸️"}
            </button>
            <button className="vocal-btn-envoyer" onClick={arreterVocal}>
              ✅
            </button>
          </div>
        ) : (
          <button className="chat-btn-vocal" onClick={(e) => { e.stopPropagation(); demarrerVocal(); }}>
            🎤
          </button>
        )}

        <button
          className="chat-btn-envoyer"
          onClick={() => mediaEnAttente ? envoyerMediaAvecTexte() : envoyerMessage()}
          disabled={chargement}
        >
          ➤
        </button>
      </div>

      {afficherMedia && (
        <div className="chat-media-panel" onClick={(e) => e.stopPropagation()}>
          <label className="chat-media-btn">
            📷 Photo
            <input
              type="file"
              accept="image/*"
              onChange={(e) => selectionnerMedia(e, "photo")}
              style={{ display: "none" }}
            />
          </label>
          <label className="chat-media-btn">
            🎥 Vidéo
            <input
              type="file"
              accept="video/*"
              onChange={(e) => selectionnerMedia(e, "video")}
              style={{ display: "none" }}
            />
          </label>
        </div>
      )}
    </div>
  );
}

export default Chat;