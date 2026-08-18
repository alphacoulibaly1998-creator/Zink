import { useState, useEffect, useRef } from "react";
import { db, auth } from "../firebase";
import axios from "axios";
import { supabase } from "../supabase";
import { creerNotification } from "../notifications";
import { nettoyerTexte } from "../sanitize";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import {
  doc, updateDoc, arrayUnion, arrayRemove,
  deleteDoc, getDoc, addDoc, collection,
  query, orderBy, onSnapshot, serverTimestamp, setDoc
} from "firebase/firestore";

function Publication({ pub, onSupprime, onVoirProfil }) {
  const { t } = useTranslation();
  const [commentaireReponsesOuvert, setCommentaireReponsesOuvert] = useState(null);
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
  const [fichierEdition, setFichierEdition] = useState(null);
  const [apercuEdition, setApercuEdition] = useState(null);
  const [typeFichierEdition, setTypeFichierEdition] = useState("");
  const [chargementEdition, setChargementEdition] = useState(false);
  const [erreurEdition, setErreurEdition] = useState("");
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
          setAuteur({ pseudo: t("publicationExtra.utilisateurInconnu"), photoURL: "" });
        }
      } catch (e) {
        setAuteur({ pseudo: t("publicationExtra.utilisateurInconnu"), photoURL: "" });
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
    const pseudo = snap.exists() ? snap.data().pseudo : t("publicationExtra.inconnu");
    const parentId = reponseA ? (reponseA.commentaireParentId || reponseA.id) : null;
    await addDoc(collection(db, "publications", pub.id, "commentaires"), {
      userId: user.uid,
      pseudo,
      texte: nettoyerTexte(commentaire.trim()),
      reponseA: reponseA ? { id: reponseA.id, pseudo: reponseA.pseudo } : null,
      commentaireParentId: parentId,
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
    if (window.confirm(t("publicationExtra.confirmerSupprimerCommentaire"))) {
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
    if (window.confirm(t("publicationExtra.confirmerSupprimerPub"))) {
      await deleteDoc(doc(db, "publications", pub.id));
      if (onSupprime) onSupprime(pub.id);
    }
  };

  const sauvegarderEditionPub = async () => {
    if (!texteEditionPub.trim() && !fichierEdition && !pub.imageUrl && !pub.videoUrl) return;
    setChargementEdition(true);
    try {
      let imageUrl = pub.imageUrl || "";
      let videoUrl = pub.videoUrl || "";

      if (fichierEdition === "supprime") {
        imageUrl = "";
        videoUrl = "";
      }

      if (fichierEdition && fichierEdition !== "supprime" && typeFichierEdition === "image") {
        const reader = new FileReader();
        const base64 = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(fichierEdition);
        });
        const res = await axios.post("/api/upload-image", { imageBase64: base64 });
        imageUrl = res.data.url;
        videoUrl = "";
      }

      if (fichierEdition && fichierEdition !== "supprime" && typeFichierEdition === "video") {
        const nomFichier = `pub_video_${Date.now()}.mp4`;
        const { data } = await axios.post("/api/upload-video", { nomFichier });
        await axios.put(data.signedUrl, fichierEdition, {
          headers: { "Content-Type": fichierEdition.type }
        });
        const { data: urlData } = supabase.storage.from("zink").getPublicUrl(nomFichier);
        videoUrl = urlData.publicUrl;
        imageUrl = "";
      }

      await updateDoc(doc(db, "publications", pub.id), {
        description: texteEditionPub.trim(),
        imageUrl,
        videoUrl,
        modifie: true
      });
      setPubEnEdition(false);
      setFichierEdition(null);
      setApercuEdition(null);
      setTypeFichierEdition("");
    } catch (e) {
      setErreurEdition(t("publier.erreurGenerale"));
    }
    setChargementEdition(false);
  };

  const handleFichierEdition = (e, type) => {
    const f = e.target.files[0];
    if (!f) return;
    if (type === "image" && f.size > 5 * 1024 * 1024) {
      setErreurEdition(t("publier.erreurTaille"));
      return;
    }
    if (type === "video" && f.size > 50 * 1024 * 1024) {
      setErreurEdition(t("publier.erreurTailleVideo"));
      return;
    }
    setFichierEdition(f);
    setApercuEdition(URL.createObjectURL(f));
    setTypeFichierEdition(type);
    setErreurEdition("");
  };

  const enregistrerPhoto = async () => {
    setMenuOuvert(false);
    if (!pub.imageUrl) {
      alert(t("publicationExtra.aucunePhotoAEnregistrer"));
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
      alert(t("publicationExtra.erreurEnregistrementPhoto"));
    }
  };

  const signaler = () => {
    setMenuOuvert(false);
    navigate(`/signalement?type=publication&cibleId=${pub.id}`);
  };

  const partager = async () => {
    const texte = pub.description || t("publicationExtra.regardeCettePublication");
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Zink", text: texte, url });
      } catch (e) {}
    } else {
      navigator.clipboard.writeText(`${texte} - ${url}`);
      alert(t("publicationExtra.lienCopie"));
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
      dernierMessage: { texte: t("publicationExtra.publicationPartagee"), createdAt: new Date() },
      [`nonLu.${ami.id}`]: (convSnap.data()?.nonLu?.[ami.id] || 0) + 1
    });
    setPartagerOuvert(false);
    alert(t("publicationExtra.publicationPartageeA", { pseudo: ami.pseudo }));
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

  const commentairesPrincipaux = commentaires.filter((c) => !c.commentaireParentId);
  const getReponses = (parentId) => commentaires.filter((c) => c.commentaireParentId === parentId);

  const renderUnCommentaire = (c, estReponse) => (
    <div key={c.id} className="commentaire-wrapper">
      {(estReponse ? reponseEnEdition === c.id : commentaireEnEdition === c.id) ? (
        <div className="commentaire-edition">
          <input
            type="text"
            value={estReponse ? texteEditionReponse : texteEdition}
            onChange={(e) =>
              estReponse
                ? setTexteEditionReponse(e.target.value)
                : setTexteEdition(e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              if (estReponse) {
                updateDoc(
                  doc(db, "publications", pub.id, "commentaires", c.id),
                  { texte: texteEditionReponse.trim(), modifie: true }
                );
                setReponseEnEdition(null);
              } else {
                sauvegarderEditionCommentaire(c);
              }
            }}
            autoFocus
          />
          <button
            onClick={() => {
              if (estReponse) {
                updateDoc(
                  doc(db, "publications", pub.id, "commentaires", c.id),
                  { texte: texteEditionReponse.trim(), modifie: true }
                );
                setReponseEnEdition(null);
              } else {
                sauvegarderEditionCommentaire(c);
              }
            }}
          >
            ✓
          </button>
          <button
            onClick={() =>
              estReponse ? setReponseEnEdition(null) : setCommentaireEnEdition(null)
            }
          >
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
                <span className="commentaire-modifie"> {t("publicationExtra.modifie")}</span>
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
                  setReponseA({ ...c, commentaireParentId: c.commentaireParentId || c.id });
                  setCommentaire(`@${c.pseudo} `);
                }}
              >
                {t("publication.repondre")}
              </button>
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
                    setMenuReponse(null);
                  }}
                >
                  ⋯
                </button>
                {menuCommentaire === c.id && (
                  <div className={`commentaire-menu ${menuOuvertVersHaut ? "vers-haut" : ""}`}>
                    {c.userId === user.uid && (
                      <>
                        <button onClick={() => {
                          if (estReponse) {
                            setReponseEnEdition(c.id);
                            setTexteEditionReponse(c.texte);
                            setMenuReponse(null);
                          } else {
                            setCommentaireEnEdition(c.id);
                            setTexteEdition(c.texte);
                            setMenuCommentaire(null);
                          }
                        }}>
                          {t("publicationExtra.modifier")}
                        </button>
                        <button
                          className="menu-suppr"
                          onClick={() => {
                            if (estReponse) setMenuReponse(null);
                            else setMenuCommentaire(null);
                            supprimerCommentaire(c);
                          }}
                        >
                          {t("publicationExtra.supprimer")}
                        </button>
                      </>
                    )}
                    {c.userId !== user.uid && (
                      <button onClick={() => {
                        if (estReponse) setMenuReponse(null);
                        else setMenuCommentaire(null);
                        signalerCommentaire(c.id);
                      }}>
                        {t("publicationExtra.signaler")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

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

        {!pubEnEdition && (
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
                  {t("publicationExtra.enregistrerPhoto")}
                </button>
              )}
              {pub.userId === user.uid && (
                <button onClick={() => {
                  setTexteEditionPub(pub.description || "");
                  setPubEnEdition(true);
                  setMenuOuvert(false);
                }}>
                  {t("publicationExtra.modifier")}
                </button>
              )}
              <button onClick={signaler}>
                {t("publicationExtra.signaler")}
              </button>
              {pub.userId === user.uid && (
                <button onClick={supprimer} className="menu-suppr">
                  {t("publicationExtra.supprimer")}
                </button>
              )}
            </div>
          )}
        </div>
        )}
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

          {(apercuEdition || (!fichierEdition && (pub.imageUrl || pub.videoUrl))) && (
            <div className="pub-apercu">
              {apercuEdition ? (
                typeFichierEdition === "image" ? (
                  <img src={apercuEdition} alt="aperçu" />
                ) : (
                  <video src={apercuEdition} controls />
                )
              ) : pub.imageUrl ? (
                <img src={pub.imageUrl} alt="actuel" />
              ) : (
                <video src={pub.videoUrl} controls />
              )}
              <button
                className="pub-suppr-img"
                onClick={() => {
                  setFichierEdition("supprime");
                  setApercuEdition(null);
                  setTypeFichierEdition("");
                }}
              >
                ✕
              </button>
            </div>
          )}

          {erreurEdition && <p className="auth-erreur">{erreurEdition}</p>}

          <div className="pub-actions">
            <div className="pub-btns-media">
              <label className="pub-btn-photo">
                📷
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFichierEdition(e, "image")}
                  style={{ display: "none" }}
                />
              </label>
              <label className="pub-btn-photo">
                🎥
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleFichierEdition(e, "video")}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          </div>

          <div className="pub-edition-actions">
            <button className="auth-btn" onClick={sauvegarderEditionPub} disabled={chargementEdition}>
              {chargementEdition ? "..." : t("publicationExtra.sauvegarder")}
            </button>
            <button
              className="profil-btn-annuler"
              onClick={() => {
                setPubEnEdition(false);
                setFichierEdition(null);
                setApercuEdition(null);
                setTypeFichierEdition("");
                setErreurEdition("");
              }}
            >
              {t("publicationExtra.annuler")}
            </button>
          </div>
        </div>
      ) : (
        <>
          {pub.description && (
            <p className="pub-description">
              {pub.description}
              {pub.modifie && (
                <span className="commentaire-modifie"> {t("publicationExtra.modifie")}</span>
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
          {(voirTousCommentaires ? commentairesPrincipaux : commentairesPrincipaux.slice(0, 2)).map((c) => {
            const reponses = getReponses(c.id);
            const reponsesOuvertes = commentaireReponsesOuvert === c.id;
            return (
              <div key={c.id}>
                {renderUnCommentaire(c, false)}
                {reponses.length > 0 && (
                  <div className="reponses-liste">
                    <button
                      className="voir-plus-commentaires reponses-toggle"
                      onClick={() =>
                        setCommentaireReponsesOuvert(reponsesOuvertes ? null : c.id)
                      }
                    >
                      {reponsesOuvertes
                        ? t("publication.masquerReponses")
                        : t("publication.voirReponses", { nb: reponses.length })}
                    </button>
                    {reponsesOuvertes &&
                      reponses.map((r) => (
                        <div key={r.id} className="reponse-indentee">
                          {renderUnCommentaire(r, true)}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
          {commentairesPrincipaux.length > 2 && (
            <button
              className="voir-plus-commentaires"
              onClick={() => setVoirTousCommentaires(!voirTousCommentaires)}
            >
              {voirTousCommentaires
                ? t("publicationExtra.masquerCommentaires")
                : t("publicationExtra.voirAutresCommentaires", { nb: commentairesPrincipaux.length - 2 })}
            </button>
          )}
          {reponseA && (
            <div className="commentaire-reponse-preview">
              <span>{t("publicationExtra.repondreAAffichage", { pseudo: reponseA.pseudo })}</span>
              <button onClick={() => { setReponseA(null); setCommentaire(""); }}>✕</button>
            </div>
          )}
          <div className="commentaire-input">
            <input
              type="text"
              placeholder={reponseA ? t("publicationExtra.repondreA", { pseudo: reponseA.pseudo }) : t("publicationExtra.ajouteCommentaire")}
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
              <h3>{t("publicationExtra.envoyerAUnAmi")}</h3>
              <button onClick={() => setPartagerOuvert(false)}>✕</button>
            </div>
            <div className="partage-liste">
              {mesAmis.length === 0 ? (
                <p style={{ color: "#888", textAlign: "center", padding: "20px" }}>
                  {t("publicationExtra.aucunAmiAPartager")}
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