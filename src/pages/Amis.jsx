import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import {
  doc, getDoc, collection, query, where,
  onSnapshot, updateDoc, arrayUnion, arrayRemove
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function Amis() {
  const [amis, setAmis] = useState([]);
  const [demandes, setDemandes] = useState([]);
  const [onglet, setOnglet] = useState("amis");
  const [chargement, setChargement] = useState(true);
  const user = auth.currentUser;
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "utilisateurs", user.uid), async (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();

      const amisIds = data.amis || [];
      const demandesIds = data.demandesRecues || [];

      const chargerProfils = async (ids) => {
        return await Promise.all(
          ids.map(async (id) => {
            const s = await getDoc(doc(db, "utilisateurs", id));
            return s.exists() ? { id, ...s.data() } : null;
          })
        );
      };

      const [amisData, demandesData] = await Promise.all([
        chargerProfils(amisIds),
        chargerProfils(demandesIds)
      ]);

      setAmis(amisData.filter(Boolean));
      setDemandes(demandesData.filter(Boolean));
      setChargement(false);
    });
    return () => unsub();
  }, []);

  const accepterDemande = async (autreId) => {
    const monRef = doc(db, "utilisateurs", user.uid);
    const autreRef = doc(db, "utilisateurs", autreId);
    await updateDoc(monRef, {
      amis: arrayUnion(autreId),
      demandesRecues: arrayRemove(autreId)
    });
    await updateDoc(autreRef, {
      amis: arrayUnion(user.uid),
      demandesEnvoyees: arrayRemove(user.uid)
    });
  };

  const refuserDemande = async (autreId) => {
    const monRef = doc(db, "utilisateurs", user.uid);
    const autreRef = doc(db, "utilisateurs", autreId);
    await updateDoc(monRef, {
      demandesRecues: arrayRemove(autreId)
    });
    await updateDoc(autreRef, {
      demandesEnvoyees: arrayRemove(user.uid)
    });
  };

  const supprimerAmi = async (autreId) => {
    if (!window.confirm("Supprimer cet ami ?")) return;
    const monRef = doc(db, "utilisateurs", user.uid);
    const autreRef = doc(db, "utilisateurs", autreId);
    await updateDoc(monRef, { amis: arrayRemove(autreId) });
    await updateDoc(autreRef, { amis: arrayRemove(user.uid) });
  };

 const ouvrirChat = async (autreId) => {
    const membres = [user.uid, autreId].sort();
    const convId = membres.join("_");
    const convRef = doc(db, "conversations", convId);
    const convSnap = await getDoc(convRef);
    if (!convSnap.exists()) {
      const { setDoc } = await import("firebase/firestore");
      await setDoc(convRef, {
        membres,
        dernierMessage: { texte: "", createdAt: new Date() },
        nonLu: { [user.uid]: 0, [autreId]: 0 },
        createdAt: new Date()
      });
    }
    const autreSnap = await getDoc(doc(db, "utilisateurs", autreId));
    const autreData = autreSnap.exists() ? autreSnap.data() : { pseudo: "Inconnu", photoURL: "" };
    navigate("/messages", {
      state: { convId, autreId, autre: autreData }
    });
  };

  if (chargement) return <div className="chargement">Chargement...</div>;

  return (
    <div className="amis-container">
      <h1 className="accueil-titre">👥 Amis</h1>

      <div className="amis-onglets">
        <button
          className={`onglet-btn ${onglet === "amis" ? "actif" : ""}`}
          onClick={() => setOnglet("amis")}
        >
          Amis {amis.length > 0 && <span className="onglet-badge">{amis.length}</span>}
        </button>
        <button
          className={`onglet-btn ${onglet === "demandes" ? "actif" : ""}`}
          onClick={() => setOnglet("demandes")}
        >
          Demandes {demandes.length > 0 && <span className="onglet-badge">{demandes.length}</span>}
        </button>
      </div>

      {onglet === "amis" && (
        <div className="amis-liste">
          {amis.length === 0 ? (
            <div className="feed-vide">
              <p>Aucun ami pour l'instant.</p>
              <p>Va dans Découvrir pour en trouver ! 😊</p>
            </div>
          ) : (
            amis.map((ami) => (
              <div key={ami.id} className="ami-item">
                <div className="ami-avatar">
                  {ami.photoURL ? (
                    <img src={ami.photoURL} alt="avatar" />
                  ) : (
                    <div className="conv-avatar-placeholder">
                      {ami.pseudo?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                  <span className={`ami-statut-point ${ami.enLigne ? "en-ligne" : "hors-ligne"}`} />
                </div>
                <div className="ami-infos">
                  <span className="conv-pseudo">{ami.pseudo}</span>
                  <span className={`ami-statut-txt ${ami.enLigne ? "en-ligne" : "hors-ligne"}`}>
                    {ami.enLigne ? "En ligne" : "Hors ligne"}
                  </span>
                </div>
                <div className="ami-actions">
                  <button
                    className="ami-btn-msg"
                    onClick={() => ouvrirChat(ami.id)}
                  >
                    💬
                  </button>
                  <button
                    className="ami-btn-suppr"
                    onClick={() => supprimerAmi(ami.id)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {onglet === "demandes" && (
        <div className="amis-liste">
          {demandes.length === 0 ? (
            <div className="feed-vide">
              <p>Aucune demande d'ami en attente.</p>
            </div>
          ) : (
            demandes.map((d) => (
              <div key={d.id} className="ami-item">
                <div className="ami-avatar">
                  {d.photoURL ? (
                    <img src={d.photoURL} alt="avatar" />
                  ) : (
                    <div className="conv-avatar-placeholder">
                      {d.pseudo?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                </div>
                <div className="ami-infos">
                  <span className="conv-pseudo">{d.pseudo}</span>
                  <span className="conv-dernier">🌍 {d.pays}</span>
                </div>
                <div className="ami-actions">
                  <button
                    className="ami-btn-accepter"
                    onClick={() => accepterDemande(d.id)}
                  >
                    ✓
                  </button>
                  <button
                    className="ami-btn-refuser"
                    onClick={() => refuserDemande(d.id)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default Amis;