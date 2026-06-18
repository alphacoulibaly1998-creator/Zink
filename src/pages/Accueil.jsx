import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import NouvellePublication from "../components/NouvellePublication";
import Publication from "../components/Publication";

function Accueil() {
  const [publications, setPublications] = useState([]);
  const [chargement, setChargement] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(
      collection(db, "publications"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setPublications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setChargement(false);
    });
    return () => unsub();
  }, []);

  const handleSupprime = (id) => {
    setPublications((prev) => prev.filter((p) => p.id !== id));
  };

  
  return (
    <div className="accueil">
      <h1 className="accueil-titre">🏠 Zink</h1>
      <NouvellePublication />
      {chargement ? (
        <div className="chargement">Chargement...</div>
      ) : publications.length === 0 ? (
        <div className="feed-vide">
          <p>Aucune publication pour l'instant.</p>
          <p>Sois le premier à publier ! 😊</p>
        </div>
      ) : (
        <div className="feed">
          {publications.map((pub) => (
            <Publication
            key={pub.id}
            pub={pub}
            onSupprime={handleSupprime}
            onVoirProfil={(userId) => navigate(`/profil/${userId}`)}
          />
          ))}
        </div>
      )}
    </div>
  );
}

export default Accueil;