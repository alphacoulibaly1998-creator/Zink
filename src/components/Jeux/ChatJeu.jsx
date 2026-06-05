import { useState, useEffect, useRef } from "react";
import { db, auth } from "../../firebase";
import {
  collection, addDoc, serverTimestamp,
  onSnapshot, query, orderBy, getDoc, doc
} from "firebase/firestore";

function ChatJeu({ jeuId, partieId }) {
  const [messages, setMessages] = useState([]);
  const [texte, setTexte] = useState("");
  const [ouvert, setOuvert] = useState(false);
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

  const envoyer = async () => {
    if (!texte.trim()) return;
    const snap = await getDoc(doc(db, "utilisateurs", user.uid));
    const pseudo = snap.exists() ? snap.data().pseudo : "Joueur";
    await addDoc(collection(db, "chatsJeux", chatId, "messages"), {
      userId: user.uid,
      pseudo,
      texte: texte.trim(),
      createdAt: serverTimestamp()
    });
    setTexte("");
  };

  return (
    <div className="chat-jeu">
      <button
        className="chat-jeu-toggle"
        onClick={() => setOuvert(!ouvert)}
      >
        💬 {ouvert ? "Fermer le chat" : "Ouvrir le chat"}
      </button>

      {ouvert && (
        <div className="chat-jeu-contenu">
          <div className="chat-jeu-messages">
            {messages.length === 0 && (
              <p style={{ color: "#888", fontSize: "13px", textAlign: "center" }}>
                Aucun message pour cette partie
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
            <div ref={basRef} />
          </div>
          <div className="chat-jeu-input">
            <input
              type="text"
              placeholder="Écris un message..."
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