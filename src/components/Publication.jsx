import { useState, useEffect, useRef } from "react";
import { db, auth } from "../firebase";
import { creerNotification } from "../notifications";
import { useNavigate } from "react-router-dom";
import {
  doc, updateDoc, arrayUnion, arrayRemove,
  deleteDoc, getDoc, addDoc, collection,
  query, orderBy, onSnapshot, serverTimestamp, setDoc
} from "firebase/firestore";

function Publication({ pub, onSupprime, onVoirProfil }) {
 const [auteur, setAuteur] = useState(null);
  const [commentaire, setCommentaire] = useState("");
  const [commentaires, setCommentaires] = useState([]);
  const [afficherCommentaires, setAfficherCommentaires] = useState(false);
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [menuOuvertVersHaut, setMenuOuvertVersHaut] = useState(false);
  const [menuCommentaire, setMenuCommentaire] = useState(null);
  const [commentaireEnEdition, setCommentaireEnEdition] = useState(null);
  const [texteEdition, setTexteEdition] = useState("");
  const [pubEnEdition, setPubEnEdition] = useState(false);
  const [texteEditionPub, setTexteEditionPub] = useState("");
 const [reponseA, setReponseA] = useState(null);
 const [partagerOuvert, setPartagerOuvert] = useState(false);
  const [mesAmis, setMesAmis] = useState([]);
 const navigate = useNavigate();
  const [voirTousCommentaires, setVoirTousCommentaires] = useState(false);
  const [menuReponse, setMenuReponse] = useState(null);
  const [menuReponseVersHaut, setMenuReponseVersHaut] = useState(false);
  const [reponseEnEdition, setReponseEnEdition] = useState(null);
  const [texteEditionReponse, setTexteEditionReponse] = useState("");
  const menuRef = useRef(null);
  useEffect(() => {
    const handleClick = (e) => {
      if (e.target.closest(".commentaire-menu")) return;
      if (e.target.closest(".commentaire-btn-menu")) return;
      setMenuCommentaire(null);
      setMenuReponse(null);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
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

  const dernierCommentaire = useRef(0);

  const envoyerCommentaire = async () => {
    if (!commentaire.trim()) return;
    const maintenant = Date.now();
    if (maintenant - dernierCommentaire.current < 1000) return;
    dernierCommentaire.current = maintenant;
    const snap = await getDoc(doc(db, "utilisateurs", user.uid));
    const pseudo = snap.exists() ? snap.data().pseudo : "Inconnu";
    await addDoc(collection(db, "publications", pub.id, "commentaires"), {
      userId: user.uid,
      pseudo,
      texte: commentaire.trim(),
      reponseA: reponseA ? { id: reponseA.id, pseudo: reponseA.pseudo } : null,
      likes: [],
      createdAt: serverTimestamp()
    });
    await updateDoc(doc(db, "publications", pub.id), {
      nbCommentaires: (pub.nbCommentaires || 0) + 1
    });
    await creerNotification(pub.userId, user.uid, "commentaire", { pubId: pub.id });
    setCommentaire("");
    setReponseA(null);
  };

  const likerCommentaire = async (c) => {
    const ref = doc(db, "publications", pub.id, "commentaires", c.id);
    const aLike = c.likes?.includes(user.uid);
    if (aLike) {
      await updateDoc(ref, { likes: arrayRemove(user.uid) });
    } else {
      await updateDoc(ref, { likes: arrayUnion(user.uid) });
      await creerNotification(c.userId, user.uid, "like_commentaire", { pubId: pub.id });
    }
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

  const signalerCommentaire = (commentaireId) => {
    setMenuCommentaire(null);
    navigate(`/signalement?type=commentaire&cibleId=${commentaireId}`);
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
    navigate(`/signalement?type=publication&cibleId=${pub.id}`);
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
    setMesAmis(amisData.filter(Boolean));
  };

  const ouvrirPartage = () => {
    chargerAmis();
    setPartagerOuvert(true);
  };

  const partagerVersAmi = async (ami) => {
    const membres = [user.uid, ami.id].sort();
    const convId = membres.join("_");
    const convRef = doc(db, "conversations", convId);
    const convSnap = await getDoc(convRef);
    if (!convSnap.exists()) {
      await setDoc(convRef, {
        membres,
        dernierMessage: { texte: "", createdAt: new Date() },
        nonLu: { [user.uid]: 0, [ami.id]: 0 },
        createdAt: new Date()
      });
    }
    await addDoc(collection(db, "conversations", convId, "messages"), {
      userId: user.uid,
      type: "publication_partagee",
      texte: "",
      pubId: pub.id,
      pubAuteur: auteur?.pseudo || "Inconnu",
      pubDescription: pub.description || "",
      pubImage: pub.imageUrl || "",
      createdAt: serverTimestamp(),
      supprimePour: [],
      supprimePourTous: false,
      statut: "envoye"
    });
    await updateDoc(convRef, {
      dernierMessage: { texte: "📸 Publication partagée", createdAt: new Date() },
      [`nonLu.${ami.id}`]: (convSnap.data()?.nonLu?.[ami.id] || 0) + 1
    });
    setPartagerOuvert(false);
    alert(`Publication partagée à ${ami.pseudo} !`);
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
            onClick={(e) => {
              if (!menuOuvert) {
                const rect = e.currentTarget.getBoundingClientRect();
                const espaceEnBas = window.innerHeight - rect.bottom;
                setMenuOuvertVersHaut(espaceEnBas < 250);
              }
              setMenuOuvert(!menuOuvert);
            }}
          >
            ⋯
          </button>
          {menuOuvert && (
            <div className={`pub-menu ${menuOuvertVersHaut ? "vers-haut" : ""}`}>
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
        <button className="pub-btn-partager" onClick={ouvrirPartage}>
          📤 Envoyer
        </button>
      </div>

      {afficherCommentaires && (
        <div className="pub-commentaires">
          {(voirTousCommentaires ? commentaires : commentaires.slice(0, 2)).map((c) => (
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
                {c.reponseA && (
                  <span className="commentaire-reponse-a">
                    ↩️ {c.reponseA.pseudo}
                  </span>
                )}
                    <span className="commentaire-texte">
                      {c.texte}
                      {c.modifie && (
                        <span className="commentaire-modifie"> (modifié)</span>
                      )}
                    </span>
                <div className="commentaire-actions">
                  <button
                    className={`commentaire-like-btn ${c.likes?.includes(user.uid) ? "like-actif" : ""}`}
                    onClick={() => likerCommentaire(c)}
                  >
                    {c.likes?.includes(user.uid) ? "❤️" : "🤍"} {c.likes?.length || 0}
                  </button>
                  <button
                    className="commentaire-repondre-btn"
                    onClick={() => {
                      setReponseA(c);
                      setCommentaire(`@${c.pseudo} `);
                    }}
                  >
                    💬 Répondre
                  </button>
                  <div className="pub-menu-container">
                    <button
                      className="commentaire-btn-menu"
                      onClick={(e) => {
                        if (menuReponse !== c.id) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const espaceEnBas = window.innerHeight - rect.bottom;
                          setMenuReponseVersHaut(espaceEnBas < 200);
                        }
                        setMenuReponse(menuReponse === c.id ? null : c.id);
                      }}
                    >
                      ⋯
                    </button>
                    {menuReponse === c.id && (
                      <div className={`commentaire-menu ${menuReponseVersHaut ? "vers-haut" : ""}`}>
                        {c.userId === user.uid && (
                          <>
                            <button onClick={() => {
                              setReponseEnEdition(c.id);
                              setTexteEditionReponse(c.texte);
                              setMenuReponse(null);
                            }}>
                              ✏️ Modifier
                            </button>
                            <button
                              className="menu-suppr"
                              onClick={() => {
                                setMenuReponse(null);
                                supprimerCommentaire(c);
                              }}
                            >
                              🗑️ Supprimer
                            </button>
                          </>
                        )}
                        {c.userId !== user.uid && (
                          <button onClick={() => {
                            setMenuReponse(null);
                            navigate(`/signalement?type=commentaire&cibleId=${c.id}`);
                          }}>
                            🚩 Signaler
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {reponseEnEdition === c.id && (
                  <div className="commentaire-edition">
                    <input
                      type="text"
                      value={texteEditionReponse}
                      onChange={(e) => setTexteEditionReponse(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                          await updateDoc(
                            doc(db, "publications", pub.id, "commentaires", c.id),
                            { texte: texteEditionReponse.trim(), modifie: true }
                          );
                          setReponseEnEdition(null);
                        }
                      }}
                      autoFocus
                    />
                    <button onClick={async () => {
                      await updateDoc(
                        doc(db, "publications", pub.id, "commentaires", c.id),
                        { texte: texteEditionReponse.trim(), modifie: true }
                      );
                      setReponseEnEdition(null);
                    }}>✓</button>
                    <button onClick={() => setReponseEnEdition(null)}>✕</button>
                  </div>
                )}
                  </div>
                  <div className="pub-menu-container">
                  <button
                    className="commentaire-btn-menu"
                    onClick={(e) => {
                      if (menuCommentaire !== c.id) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const espaceEnBas = window.innerHeight - rect.bottom;
                        setMenuOuvertVersHaut(espaceEnBas < 200);
                      }
                      setMenuCommentaire(menuCommentaire === c.id ? null : c.id);
                    }}
                  >
                    ⋯
                  </button>
                  {menuCommentaire === c.id && (
                    <div className={`commentaire-menu ${menuOuvertVersHaut ? "vers-haut" : ""}`}>
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
                        <button onClick={() => signalerCommentaire(c.id)}>
                          🚩 Signaler
                        </button>
                      )}
                    </div>
                  )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {commentaires.length > 2 && (
            <button
              className="voir-plus-commentaires"
              onClick={() => setVoirTousCommentaires(!voirTousCommentaires)}
            >
              {voirTousCommentaires
                ? "Masquer les commentaires"
                : `Voir les ${commentaires.length - 2} autres commentaires`}
            </button>
          )}
          {reponseA && (
            <div className="commentaire-reponse-preview">
              <span>↩️ Répondre à {reponseA.pseudo}</span>
              <button onClick={() => { setReponseA(null); setCommentaire(""); }}>✕</button>
            </div>
          )}
          <div className="commentaire-input">
            <input
              type="text"
              placeholder={reponseA ? `Répondre à ${reponseA.pseudo}...` : "Ajoute un commentaire..."}
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && envoyerCommentaire()}
            />
            <button onClick={envoyerCommentaire}>➤</button>
          </div>
        </div>
      )}
    
    {partagerOuvert && (
        <div className="partage-overlay" onClick={() => setPartagerOuvert(false)}>
          <div className="partage-modal" onClick={(e) => e.stopPropagation()}>
            <div className="partage-header">
              <h3>Envoyer à un ami</h3>
              <button onClick={() => setPartagerOuvert(false)}>✕</button>
            </div>
            <div className="partage-liste">
              {mesAmis.length === 0 ? (
                <p style={{ color: "#888", textAlign: "center", padding: "20px" }}>
                  Tu n'as pas encore d'amis à qui partager.
                </p>
              ) : (
                mesAmis.map((ami) => (
                  <div
                    key={ami.id}
                    className="partage-ami"
                    onClick={() => partagerVersAmi(ami)}
                  >
                    <div className="conv-avatar-placeholder" style={{ width: 40, height: 40 }}>
                      {ami.avatar || ami.pseudo?.[0]?.toUpperCase() || "?"}
                    </div>
                    <span>{ami.pseudo}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Publication;