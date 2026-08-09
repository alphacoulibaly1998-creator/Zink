import { useState, useEffect, useRef } from "react";
import { db, auth } from "../../firebase";
import {
  collection, addDoc, serverTimestamp,
  onSnapshot, query, orderBy, getDoc, doc
} from "firebase/firestore";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";

const CLES_MESSAGES_IA_REACTION = [
  "chatJeu.msgReaction1",
  "chatJeu.msgReaction2",
  "chatJeu.msgReaction3",
  "chatJeu.msgReaction4",
  "chatJeu.msgReaction5",
  "chatJeu.msgReaction6",
  "chatJeu.msgReaction7",
  "chatJeu.msgReaction8",
];

const messageIAAleatoire = () => {
  const cle = CLES_MESSAGES_IA_REACTION[Math.floor(Math.random() * CLES_MESSAGES_IA_REACTION.length)];
  return i18n.t(cle);
};

function ChatJeu({ jeuId, partieId, modeIA }) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [texte, setTexte] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const [iaEcrit, setIaEcrit] = useState(false);
  const basRef = useRef(null);
  const user = auth.currentUser;
  const chatId = `${jeuId}_${partieId || "global"}`;

  useEffect(() => {
    if (!ouvert) return;
    const q = query(
      collection(db, "chatsJeux", chatId, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setTimeout(() => basRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return () => unsub();
  }, [ouvert, chatId]);

  const repondreIA = async () => {
    if (!modeIA) return;
    setIaEcrit(true);
    await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000));
    try {
      await addDoc(collection(db, "chatsJeux", chatId, "messages"), {
        userId: "IA",
        pseudo: "🤖 IA",
        texte: messageIAAleatoire(),
        createdAt: serverTimestamp()
      });
    } catch (e) {}
    setIaEcrit(false);
  };

  const envoyer = async () => {
    if (!texte.trim()) return;
    const snap = await getDoc(doc(db, "utilisateurs", user.uid));
    const pseudo = snap.exists() ? snap.data().pseudo : t("chatJeu.joueur");
    const messageTexte = texte.trim();
    await addDoc(collection(db, "chatsJeux", chatId, "messages"), {
      userId: user.uid,
      pseudo,
      texte: messageTexte,
      createdAt: serverTimestamp()
    });
    setTexte("");
    if (modeIA) repondreIA();
  };

  return (
    <div className="chat-jeu">
      <button
        className="chat-jeu-toggle"
        onClick={() => setOuvert(!ouvert)}
      >
        💬 {ouvert ? t("chatJeu.fermerChat") : t("chatJeu.ouvrirChat")}
      </button>

      {ouvert && (
        <div className="chat-jeu-contenu">
          <div className="chat-jeu-messages">
            {messages.length === 0 && (
              <p style={{ color: "#888", fontSize: "13px", textAlign: "center" }}>
                {modeIA ? t("chatJeu.provoqueIA") : t("chatJeu.aucunMessage")}
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`chat-jeu-msg ${m.userId === user.uid ? "moi" : "autre"}`}
              >
                <span className="chat-jeu-pseudo">{m.pseudo}</span>
                <span className="chat-jeu-texte">{m.texte}</span>
              </div>
            ))}
            {iaEcrit && (
              <div className="chat-jeu-msg autre">
                <span className="chat-jeu-pseudo">🤖 IA</span>
                <span className="chat-jeu-texte">...</span>
              </div>
            )}
            <div ref={basRef} />
          </div>
          <div className="chat-jeu-input">
            <input
              type="text"
              placeholder={modeIA ? t("chatJeu.provoqueIAPlaceholder") : t("chatJeu.ecrisMessage")}
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && envoyer()}
            />
            <button onClick={envoyer}>➤</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatJeu;