import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot, limit, getDocs } from "firebase/firestore";
import NouvellePublication from "../components/NouvellePublication";
import Publication from "../components/Publication";

function Accueil() {
  const [publications, setPublications] = useState([]);
  const [chargement, setChargement] = useState(true);
  const navigate = useNavigate();

  const NB_PAR_PAGE = 15;

  const chargerPublications = async () => {
    setChargement(true);
    const q = query(
      collection(db, "publications"),
      orderBy("createdAt", "desc"),
      limit(100)
    );
    const snap = await getDocs(q);
    const toutes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const melangees = [...toutes].sort(() => Math.random() - 0.5);
    setPublications(melangees.slice(0, NB_PAR_PAGE));
    setChargement(false);
  };

  useEffect(() => {
    chargerPublications();
  }, []);

  const actualiser = () => {
    chargerPublications();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
          <button className="feed-actualiser" onClick={actualiser}>
            🔄 Actualiser le fil
          </button>
        </div>
      )}
    </div>
  );
}

export default Accueil;