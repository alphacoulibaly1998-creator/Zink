import { useState, useEffect, useRef } from "react";
import { db, auth } from "../firebase";
import { creerNotification } from "../notifications";
import {
  doc, updateDoc, arrayUnion, arrayRemove,
  deleteDoc, getDoc, addDoc, collection,
  query, orderBy, onSnapshot, serverTimestamp
} from "firebase/firestore";

function Publication({ pub, onSupprime, onVoirProfil }) {
 const [auteur, setAuteur] = useState(null);
  const [commentaire, setCommentaire] = useState("");
  const [commentaires, setCommentaires] = useState([]);
  const [afficherCommentaires, setAfficherCommentaires] = useState(false);
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [menuCommentaire, setMenuCommentaire] = useState(null);
  const [commentaireEnEdition, setCommentaireEnEdition] = useState(null);
  const [texteEdition, setTexteEdition] = useState("");
  const [pubEnEdition, setPubEnEdition] = useState(false);
  const [texteEditionPub, setTexteEditionPub] = useState("");
  const menuRef = useRef(null);
  const user = auth.currentUser;
  const aLike = pub.likes?.includes(user.uid);

  useEffect(() => {
    const chargerAuteur = async () => {
      try {
        const snap = await getDoc(doc(db, "utilisateurs", pub.userId));
        if (snap.exists()) {
          setAuteur(snap.data());
        } else {
          setAuteur({ pseudo: "Utilisateur inconnu", photoURL: "" });
        }
      } catch (e) {
        setAuteur({ pseudo: "Utilisateur inconnu", photoURL: "" });
      }
    };
    chargerAuteur();
  }, [pub.userId]);

  useEffect(() => {
    if (!afficherCommentaires) return;
    const q = query(
      collection(db, "publications", pub.id, "commentaires"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setCommentaires(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [afficherCommentaires, pub.id]);

 useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOuvert(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

 const toggleLike = async () => {
    const ref = doc(db, "publications", pub.id);
    if (aLike) {
      await updateDoc(ref, { likes: arrayRemove(user.uid) });
    } else {
      await updateDoc(ref, { likes: arrayUnion(user.uid) });
      await creerNotification(pub.userId, user.uid, "like", { pubId: pub.id });
    }
  };

  const envoyerCommentaire = async () => {
    if (!commentaire.trim()) return;
    const snap = await getDoc(doc(db, "utilisateurs", user.uid));
    const pseudo = snap.exists() ? snap.data().pseudo : "Inconnu";
    await addDoc(collection(db, "publications", pub.id, "commentaires"), {
      userId: user.uid,
      pseudo,
      texte: commentaire.trim(),
      createdAt: serverTimestamp()
    });
    await updateDoc(doc(db, "publications", pub.id), {
      nbCommentaires: (pub.nbCommentaires || 0) + 1
    });
    await creerNotification(pub.userId, user.uid, "commentaire", { pubId: pub.id });
    setCommentaire("");
  };

  const supprimerCommentaire = async (c) => {
    setMenuCommentaire(null);
    if (window.confirm("Supprimer ce commentaire ?")) {
      await deleteDoc(
        doc(db, "publications", pub.id, "commentaires", c.id)
      );
      await updateDoc(doc(db, "publications", pub.id), {
        nbCommentaires: Math.max((pub.nbCommentaires || 1) - 1, 0)
      });
    }
  };

  const sauvegarderEditionCommentaire = async (c) => {
    if (!texteEdition.trim()) return;
    await updateDoc(
      doc(db, "publications", pub.id, "commentaires", c.id),
      { texte: texteEdition.trim(), modifie: true }
    );
    setCommentaireEnEdition(null);
    setTexteEdition("");
  };

  const signalerCommentaire = () => {
    setMenuCommentaire(null);
    alert("Commentaire signalé. Merci pour ton retour !");
  };

  const supprimer = async () => {
    setMenuOuvert(false);
    if (window.confirm("Supprimer cette publication ?")) {
      await deleteDoc(doc(db, "publications", pub.id));
      if (onSupprime) onSupprime(pub.id);
    }
  };

  const sauvegarderEditionPub = async () => {
    if (!texteEditionPub.trim()) return;
    await updateDoc(doc(db, "publications", pub.id), {
      description: texteEditionPub.trim(),
      modifie: true
    });
    setPubEnEdition(false);
  };

  const enregistrerPhoto = async () => {
    setMenuOuvert(false);
    if (!pub.imageUrl) {
      alert("Aucune photo à enregistrer.");
      return;
    }
    try {
      const response = await fetch(pub.imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "zink-photo.jpg";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Impossible d'enregistrer la photo.");
    }
  };

  const signaler = () => {
    setMenuOuvert(false);
    alert("Publication signalée. Merci pour ton retour !");
  };

  const partager = async () => {
    const texte = pub.description || "Regarde cette publication sur Zink !";
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Zink", text: texte, url });
      } catch (e) {}
    } else {
      navigator.clipboard.writeText(`${texte} - ${url}`);
      alert("Lien copié dans le presse-papier !");
    }
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
    <div className="publication">
      <div className="pub-header">
        <div
          className="pub-avatar"
          onClick={() => pub.userId !== user.uid && onVoirProfil && onVoirProfil(pub.userId)}
          style={{ cursor: pub.userId !== user.uid ? "pointer" : "default" }}
        >
          {auteur?.photoURL ? (
            <img src={auteur.photoURL} alt="avatar" />
          ) : (
            <div className="pub-avatar-placeholder">
              {auteur?.pseudo?.[0]?.toUpperCase() || "?"}
            </div>
          )}
        </div>
        <div className="pub-infos">
          <span
            className="pub-pseudo"
            onClick={() => pub.userId !== user.uid && onVoirProfil && onVoirProfil(pub.userId)}
            style={{ cursor: pub.userId !== user.uid ? "pointer" : "default" }}
          >
            {auteur?.pseudo || "..."}
          </span>
          <span className="pub-date">{formaterDate(pub.createdAt)}</span>
        </div>

        <div className="pub-menu-container" ref={menuRef}>
          <button
            className="pub-btn-menu"
            onClick={() => setMenuOuvert(!menuOuvert)}
          >
            ⋯
          </button>
          {menuOuvert && (
            <div className="pub-menu">
              {pub.imageUrl && (
                <button onClick={enregistrerPhoto}>
                  💾 Enregistrer la photo
                </button>
              )}
              {pub.userId === user.uid && (
                <button onClick={() => {
                  setTexteEditionPub(pub.description || "");
                  setPubEnEdition(true);
                  setMenuOuvert(false);
                }}>
                  ✏️ Modifier
                </button>
              )}
              <button onClick={signaler}>
                🚩 Signaler
              </button>
              {pub.userId === user.uid && (
                <button onClick={supprimer} className="menu-suppr">
                  🗑️ Supprimer
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {pubEnEdition ? (
        <div className="pub-edition">
          <textarea
            className="pub-textarea"
            value={texteEditionPub}
            onChange={(e) => setTexteEditionPub(e.target.value)}
            rows={3}
            autoFocus
          />
          <div className="pub-edition-actions">
            <button className="auth-btn" onClick={sauvegarderEditionPub}>
              💾 Sauvegarder
            </button>
            <button
              className="profil-btn-annuler"
              onClick={() => setPubEnEdition(false)}
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <>
          {pub.description && (
            <p className="pub-description">
              {pub.description}
              {pub.modifie && (
                <span className="commentaire-modifie"> (modifié)</span>
              )}
            </p>
          )}
        </>
      )}

      {pub.imageUrl && !pub.videoUrl && (
        <div className="pub-image">
          <img src={pub.imageUrl} alt="publication" />
        </div>
      )}

      {pub.videoUrl && (
        <div className="pub-video">
          <video controls src={pub.videoUrl} />
        </div>
      )}

      <div className="pub-footer">
        <button
          className={`pub-btn-like ${aLike ? "like-actif" : ""}`}
          onClick={toggleLike}
        >
          {aLike ? "❤️" : "🤍"} {pub.likes?.length || 0}
        </button>
        <button
          className="pub-btn-commenter"
          onClick={() => setAfficherCommentaires(!afficherCommentaires)}
        >
          💬 {pub.nbCommentaires || commentaires.length || 0}
        </button>
        <button className="pub-btn-partager" onClick={partager}>
          🔗 Partager
        </button>
      </div>

      {afficherCommentaires && (
        <div className="pub-commentaires">
          {commentaires.map((c) => (
            <div key={c.id} className="commentaire-wrapper">
              {commentaireEnEdition === c.id ? (
                <div className="commentaire-edition">
                  <input
                    type="text"
                    value={texteEdition}
                    onChange={(e) => setTexteEdition(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && sauvegarderEditionCommentaire(c)
                    }
                    autoFocus
                  />
                  <button onClick={() => sauvegarderEditionCommentaire(c)}>
                    ✓
                  </button>
                  <button onClick={() => setCommentaireEnEdition(null)}>
                    ✕
                  </button>
                </div>
              ) : (
                <div className="commentaire">
                  <div className="commentaire-contenu">
                <span
                  className="commentaire-pseudo"
                  onClick={() => c.userId !== user.uid && onVoirProfil && onVoirProfil(c.userId)}
                  style={{ cursor: c.userId !== user.uid ? "pointer" : "default" }}
                >
                  {c.pseudo}
                </span>
                    <span className="commentaire-texte">
                      {c.texte}
                      {c.modifie && (
                        <span className="commentaire-modifie"> (modifié)</span>
                      )}
                    </span>
                  </div>
                  <button
                    className="commentaire-btn-menu"
                    onClick={() =>
                      setMenuCommentaire(
                        menuCommentaire === c.id ? null : c.id
                      )
                    }
                  >
                    ⋯
                  </button>
                  {menuCommentaire === c.id && (
                    <div className="commentaire-menu">
                      {c.userId === user.uid && (
                        <>
                          <button onClick={() => {
                            setCommentaireEnEdition(c.id);
                            setTexteEdition(c.texte);
                            setMenuCommentaire(null);
                          }}>
                            ✏️ Modifier
                          </button>
                          <button
                            className="menu-suppr"
                            onClick={() => supprimerCommentaire(c)}
                          >
                            🗑️ Supprimer
                          </button>
                        </>
                      )}
                      {c.userId !== user.uid && (
                        <button onClick={signalerCommentaire}>
                          🚩 Signaler
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          <div className="commentaire-input">
            <input
              type="text"
              placeholder="Ajoute un commentaire..."
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && envoyerCommentaire()}
            />
            <button onClick={envoyerCommentaire}>➤</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Publication;