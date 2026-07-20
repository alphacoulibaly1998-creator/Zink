import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { collection, query, orderBy, onSnapshot, limit, getDocs } from "firebase/firestore";
import NouvellePublication from "../components/NouvellePublication";
import Publication from "../components/Publication";

function Accueil() {
  const { t } = useTranslation();
  const [publications, setPublications] = useState([]);
  const [chargement, setChargement] = useState(true);
  const navigate = useNavigate();

  const NB_PAR_PAGE = 15;
  const [idsAffiches, setIdsAffiches] = useState([]);

  const chargerPublications = async (idsAGarder = []) => {
    const q = query(
      collection(db, "publications"),
      orderBy("createdAt", "desc"),
      limit(100)
    );
    const snap = await getDocs(q);
    const toutes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const melangees = [...toutes].sort(() => Math.random() - 0.5);
    const selection = melangees.slice(0, NB_PAR_PAGE);
    setIdsAffiches(selection.map((p) => p.id));
    setChargement(false);
  };

  useEffect(() => {
    chargerPublications();
  }, []);

  useEffect(() => {
    if (idsAffiches.length === 0 && chargement) return;
    const q = query(
      collection(db, "publications"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const toutes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const nouvelles = toutes.filter((p) => !idsAffiches.includes(p.id));
      const affichees = toutes.filter((p) => idsAffiches.includes(p.id));
      setPublications([...nouvelles.filter((p) => {
        const estMoi = p.userId === auth.currentUser?.uid;
        const recente = p.createdAt && (Date.now() - p.createdAt.toDate().getTime()) < 60000;
        return estMoi && recente;
      }), ...affichees]);
    });
    return () => unsub();
  }, [idsAffiches]);

  const actualiser = () => {
    setChargement(true);
    chargerPublications();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSupprime = (id) => {
    setPublications((prev) => prev.filter((p) => p.id !== id));
  };

  
  return (
    <div className="accueil">
      <h1 className="accueil-titre">{t("accueil.titre")}</h1>
      <NouvellePublication />
      {chargement ? (
        <div className="chargement">{t("accueil.chargement")}</div>
      ) : publications.length === 0 ? (
        <div className="feed-vide">
          <p>{t("accueil.aucunePublication")}</p>
          <p>{t("accueil.soisLePremier")}</p>
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
            {t("accueil.actualiser")}
          </button>
        </div>
      )}
    </div>
  );
}

export default Accueil;