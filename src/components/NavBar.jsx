import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import { useTranslation } from "react-i18next";

const liens = [
  { path: "/", labelKey: "navbar.accueil", icon: "🏠" },
  { path: "/profil", labelKey: "navbar.profil", icon: "👤" },
  { path: "/amis", labelKey: "navbar.amis", icon: "👥" },
  { path: "/messages", labelKey: "navbar.messages", icon: "💬" },
  { path: "/jeux", labelKey: "navbar.jeux", icon: "🎮" },
  { path: "/decouvrir", labelKey: "navbar.decouvrir", icon: "🔍" },
  { path: "/attaques", labelKey: "navbar.attaques", icon: "💥" },
];

function NavBar() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const location = useLocation();
  const [messagesNonLus, setMessagesNonLus] = useState(0);
  const [demandesAmis, setDemandesAmis] = useState(0);
  const [attaquesNonLues, setAttaquesNonLues] = useState(0);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "conversations"),
      where("membres", "array-contains", user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      let total = 0;
      snap.docs.forEach((d) => {
        const data = d.data();
        total += data.nonLu?.[user.uid] || 0;
      });
      setMessagesNonLus(total);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "utilisateurs", user.uid), (snap) => {
      if (snap.exists()) {
        const demandes = snap.data().demandesRecues || [];
        setDemandesAmis(demandes.length);
      }
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "attaques"),
      where("cibleId", "==", user.uid),
      where("lu", "==", false)
    );
    const unsub = onSnapshot(q, (snap) => {
      setAttaquesNonLues(snap.docs.length);
    });
    return () => unsub();
  }, [user]);

  return (
    <nav className="navbar">
      {liens.map((lien) => (
        <button
          key={lien.path}
          className={`nav-btn ${location.pathname === lien.path ? "actif" : ""}`}
          onClick={() => navigate(lien.path)}
        >
          <div className="nav-icon-container">
            <span className="nav-icon">{lien.icon}</span>
            {lien.path === "/messages" && messagesNonLus > 0 && (
              <span className="nav-badge">{messagesNonLus}</span>
            )}
            {lien.path === "/amis" && demandesAmis > 0 && (
              <span className="nav-badge">{demandesAmis}</span>
            )}

            {lien.path === "/attaques" && attaquesNonLues > 0 && (
              <span className="nav-badge">{attaquesNonLues}</span>
            )}
            
          </div>
          <span className="nav-label">{t(lien.labelKey)}</span>
        </button>
      ))}
    </nav>
  );
}

export default NavBar;