import { useState, useEffect, useRef } from "react";
import { db, auth } from "../firebase";
import {
  collection, addDoc, serverTimestamp,
  onSnapshot, query, where, orderBy,
  doc, getDoc, updateDoc
} from "firebase/firestore";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

const SONS = [
  { id: "airhorn", nomKey: "attaques.sonAirhorn", icon: "📯", url: "https://www.myinstants.com/media/sounds/air-horn.mp3" },
  { id: "bruh", nomKey: "attaques.sonBruh", icon: "😐", url: "https://www.myinstants.com/media/sounds/bruh.mp3" },
  { id: "wow", nomKey: "attaques.sonWow", icon: "😲", url: "https://www.myinstants.com/media/sounds/wow.mp3" },
  { id: "laugh", nomKey: "attaques.sonRire", icon: "😂", url: "https://www.myinstants.com/media/sounds/evil-laugh.mp3" },
  { id: "alarm", nomKey: "attaques.sonAlarme", icon: "🚨", url: "https://www.myinstants.com/media/sounds/alarm-clock.mp3" },
  { id: "fart", nomKey: "attaques.sonProut", icon: "💨", url: "https://www.myinstants.com/media/sounds/fart.mp3" },
  { id: "sad", nomKey: "attaques.sonTriste", icon: "😢", url: "https://www.myinstants.com/media/sounds/sad-trombone.mp3" },
  { id: "victory", nomKey: "attaques.sonVictoire", icon: "🏆", url: "https://www.myinstants.com/media/sounds/victory.mp3" },
  { id: "notification", nomKey: "attaques.sonNotif", icon: "🔔", url: "https://www.myinstants.com/media/sounds/discord-notification.mp3" },
  { id: "explosion", nomKey: "attaques.sonExplosion", icon: "💥", url: "https://www.myinstants.com/media/sounds/small-explosion.mp3" },
  { id: "kiss", nomKey: "attaques.sonBisou", icon: "😘", url: "https://www.myinstants.com/media/sounds/kiss.mp3" },
  { id: "nope", nomKey: "attaques.sonNope", icon: "❌", url: "https://www.myinstants.com/media/sounds/nope.mp3" },
];

function AttaquesSonores() {
  const { t } = useTranslation();
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
      setMessage(t("attaques.choisisAmiEtSon"));
      return;
    }
    setChargement(true);
    try {
      await addDoc(collection(db, "attaques"), {
        auteurId: user.uid,
        cibleId: amiChoisi.id,
        sonId: sonChoisi.id,
        sonNom: t(sonChoisi.nomKey),
        sonIcon: sonChoisi.icon,
        lu: false,
        createdAt: serverTimestamp()
      });
      setMessage(t("attaques.attaqueEnvoyee", { pseudo: amiChoisi.pseudo }));
      setTimeout(() => setMessage(""), 3000);
      setAmiChoisi(null);
      setSonChoisi(null);
    } catch (e) {
      setMessage(t("attaques.erreurEnvoi"));
    }
    setChargement(false);
  };

  const formaterDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    const locale = i18n.language === "en" ? "en-US" : "fr-FR";
    return date.toLocaleDateString(locale, {
      day: "numeric", month: "short",
      hour: "2-digit", minute: "2-digit"
    });
  };

  return (
    <div className="attaques-container">
      <audio ref={audioRef} />
      <h1 className="accueil-titre">{t("attaques.titre")}</h1>

      <div className="amis-onglets">
        <button
          className={`onglet-btn ${onglet === "envoyer" ? "actif" : ""}`}
          onClick={() => setOnglet("envoyer")}
        >
          {t("attaques.onglAttaquer")}
        </button>
        <button
          className={`onglet-btn ${onglet === "recues" ? "actif" : ""}`}
          onClick={() => setOnglet("recues")}
        >
          {t("attaques.onglRecues")} {attaquesRecues.length > 0 && <span className="onglet-badge">{attaquesRecues.length}</span>}
        </button>
      </div>

      {onglet === "envoyer" && (
        <div className="attaques-envoyer">
          <p className="attaques-titre">{t("attaques.choisirAmi")}</p>
          {amis.length === 0 ? (
            <p className="attaques-vide">{t("attaques.aucunAmi")}</p>
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

          <p className="attaques-titre">{t("attaques.choisirSon")}</p>
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
                <span className="son-nom">{t(son.nomKey)}</span>
              </button>
            ))}
          </div>

          {message && <p className="attaques-message">{message}</p>}

          <button
            className="auth-btn"
            onClick={envoyerAttaque}
            disabled={chargement || !amiChoisi || !sonChoisi}
          >
            {chargement ? t("attaques.envoiEnCours") : t("attaques.lancerAttaque")}
          </button>
        </div>
      )}

      {onglet === "recues" && (
        <div className="attaques-recues">
          {attaquesRecues.length === 0 ? (
            <div className="feed-vide">
              <p>{t("attaques.aucuneAttaqueRecue")}</p>
              <p>{t("attaques.enSecurite")}</p>
            </div>
          ) : (
            attaquesRecues.map((a) => (
              <div key={a.id} className="attaque-item">
                <span className="attaque-icon">{a.sonIcon}</span>
                <div className="attaque-infos">
                  <span className="attaque-auteur">{a.auteur?.pseudo}</span>
                  <span className="attaque-son">{t("attaques.taEnvoye", { son: a.sonNom })}</span>
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