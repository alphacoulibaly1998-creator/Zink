import { useState, useEffect, useRef } from "react";
import { db, auth } from "../firebase";
import {
  collection, addDoc, serverTimestamp,
  onSnapshot, query, where, orderBy,
  doc, getDoc, updateDoc
} from "firebase/firestore";

const SONS = [
  { id: "airhorn", nom: "Air Horn", icon: "📯", url: "https://www.myinstants.com/media/sounds/air-horn.mp3" },
  { id: "bruh", nom: "Bruh", icon: "😐", url: "https://www.myinstants.com/media/sounds/bruh.mp3" },
  { id: "wow", nom: "Wow", icon: "😲", url: "https://www.myinstants.com/media/sounds/wow.mp3" },
  { id: "laugh", nom: "Rire", icon: "😂", url: "https://www.myinstants.com/media/sounds/evil-laugh.mp3" },
  { id: "alarm", nom: "Alarme", icon: "🚨", url: "https://www.myinstants.com/media/sounds/alarm-clock.mp3" },
  { id: "fart", nom: "Prout", icon: "💨", url: "https://www.myinstants.com/media/sounds/fart.mp3" },
  { id: "sad", nom: "Triste", icon: "😢", url: "https://www.myinstants.com/media/sounds/sad-trombone.mp3" },
  { id: "victory", nom: "Victoire", icon: "🏆", url: "https://www.myinstants.com/media/sounds/victory.mp3" },
  { id: "notification", nom: "Notif", icon: "🔔", url: "https://www.myinstants.com/media/sounds/discord-notification.mp3" },
  { id: "explosion", nom: "Explosion", icon: "💥", url: "https://www.myinstants.com/media/sounds/small-explosion.mp3" },
  { id: "kiss", nom: "Bisou", icon: "😘", url: "https://www.myinstants.com/media/sounds/kiss.mp3" },
  { id: "nope", nom: "Nope", icon: "❌", url: "https://www.myinstants.com/media/sounds/nope.mp3" },
];

function AttaquesSonores() {
  const [amis, setAmis] = useState([]);
  const [amiChoisi, setAmiChoisi] = useState(null);
  const [sonChoisi, setSonChoisi] = useState(null);
  const [attaquesRecues, setAttaquesRecues] = useState([]);
  const [onglet, setOnglet] = useState("envoyer");
  const [chargement, setChargement] = useState(false);
  const [message, setMessage] = useState("");
  const audioRef = useRef(null);
  const user = auth.currentUser;

  useEffect(() => {
    const chargerAmis = async () => {
      const snap = await getDoc(doc(db, "utilisateurs", user.uid));
      if (!snap.exists()) return;
      const amisIds = snap.data().amis || [];
      const amisData = await Promise.all(
        amisIds.map(async (id) => {
          const s = await getDoc(doc(db, "utilisateurs", id));
          return s.exists() ? { id, ...s.data() } : null;
        })
      );
      setAmis(amisData.filter(Boolean));
    };
    chargerAmis();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "attaques"),
      where("cibleId", "==", user.uid)
    );
    const unsub = onSnapshot(q, async (snap) => {
      const attaques = await Promise.all(
        snap.docs.map(async (d) => {
          const data = { id: d.id, ...d.data() };
          const auteurSnap = await getDoc(doc(db, "utilisateurs", data.auteurId));
          data.auteur = auteurSnap.exists() ? auteurSnap.data() : { pseudo: "Inconnu" };
          return data;
        })
      );
      attaques.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
      setAttaquesRecues(attaques);

      const nonLues = snap.docs.filter((d) => !d.data().lu);
      if (nonLues.length > 0) {
        const derniere = nonLues[0].data();
        const son = SONS.find((s) => s.id === derniere.sonId);
        if (son) jouerSon(son.url);
        nonLues.forEach(async (d) => {
          await updateDoc(doc(db, "attaques", d.id), { lu: true });
        });
      }
    });
    return () => unsub();
  }, []);

  const jouerSon = (url) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = url;
        audioRef.current.play();
      }
    } catch (e) {}
  };

  const envoyerAttaque = async () => {
    if (!amiChoisi || !sonChoisi) {
      setMessage("Choisis un ami et un son !");
      return;
    }
    setChargement(true);
    try {
      await addDoc(collection(db, "attaques"), {
        auteurId: user.uid,
        cibleId: amiChoisi.id,
        sonId: sonChoisi.id,
        sonNom: sonChoisi.nom,
        sonIcon: sonChoisi.icon,
        lu: false,
        createdAt: serverTimestamp()
      });
      setMessage(`💥 Attaque envoyée à ${amiChoisi.pseudo} !`);
      setTimeout(() => setMessage(""), 3000);
      setAmiChoisi(null);
      setSonChoisi(null);
    } catch (e) {
      setMessage("Erreur lors de l'envoi.");
    }
    setChargement(false);
  };

  const formaterDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return date.toLocaleDateString("fr-FR", {
      day: "numeric", month: "short",
      hour: "2-digit", minute: "2-digit"
    });
  };

  return (
    <div className="attaques-container">
      <audio ref={audioRef} />
      <h1 className="accueil-titre">💥 Attaques Sonores</h1>

      <div className="amis-onglets">
        <button
          className={`onglet-btn ${onglet === "envoyer" ? "actif" : ""}`}
          onClick={() => setOnglet("envoyer")}
        >
          🎯 Attaquer
        </button>
        <button
          className={`onglet-btn ${onglet === "recues" ? "actif" : ""}`}
          onClick={() => setOnglet("recues")}
        >
          📬 Reçues {attaquesRecues.length > 0 && <span className="onglet-badge">{attaquesRecues.length}</span>}
        </button>
      </div>

      {onglet === "envoyer" && (
        <div className="attaques-envoyer">
          <p className="attaques-titre">1. Choisis un ami</p>
          {amis.length === 0 ? (
            <p className="attaques-vide">Ajoute des amis pour les attaquer ! 😊</p>
          ) : (
            <div className="attaques-amis">
              {amis.map((ami) => (
                <button
                  key={ami.id}
                  className={`attaque-ami-btn ${amiChoisi?.id === ami.id ? "actif" : ""}`}
                  onClick={() => setAmiChoisi(ami)}
                >
                  <div className="conv-avatar-placeholder" style={{ width: 36, height: 36, fontSize: 16 }}>
                    {ami.avatar || ami.pseudo?.[0]?.toUpperCase() || "?"}
                  </div>
                  <span>{ami.pseudo}</span>
                  <span className={`ami-statut-point ${ami.enLigne ? "en-ligne" : "hors-ligne"}`}
                    style={{ position: "relative", width: 8, height: 8, borderRadius: "50%", flexShrink: 0 }}
                  />
                </button>
              ))}
            </div>
          )}

          <p className="attaques-titre">2. Choisis un son</p>
          <div className="attaques-sons">
            {SONS.map((son) => (
              <button
                key={son.id}
                className={`attaque-son-btn ${sonChoisi?.id === son.id ? "actif" : ""}`}
                onClick={() => {
                  setSonChoisi(son);
                  jouerSon(son.url);
                }}
              >
                <span className="son-icon">{son.icon}</span>
                <span className="son-nom">{son.nom}</span>
              </button>
            ))}
          </div>

          {message && <p className="attaques-message">{message}</p>}

          <button
            className="auth-btn"
            onClick={envoyerAttaque}
            disabled={chargement || !amiChoisi || !sonChoisi}
          >
            {chargement ? "Envoi..." : "💥 Lancer l'attaque !"}
          </button>
        </div>
      )}

      {onglet === "recues" && (
        <div className="attaques-recues">
          {attaquesRecues.length === 0 ? (
            <div className="feed-vide">
              <p>Aucune attaque reçue pour l'instant.</p>
              <p>Tu es en sécurité... pour l'instant 😄</p>
            </div>
          ) : (
            attaquesRecues.map((a) => (
              <div key={a.id} className="attaque-item">
                <span className="attaque-icon">{a.sonIcon}</span>
                <div className="attaque-infos">
                  <span className="attaque-auteur">{a.auteur?.pseudo}</span>
                  <span className="attaque-son">t'a envoyé {a.sonNom}</span>
                  <span className="attaque-date">{formaterDate(a.createdAt)}</span>
                </div>
                <button
                  className="attaque-rejouer"
                  onClick={() => {
                    const son = SONS.find((s) => s.id === a.sonId);
                    if (son) jouerSon(son.url);
                  }}
                >
                  ▶️
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default AttaquesSonores;