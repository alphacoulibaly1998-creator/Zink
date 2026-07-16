import { useState, useRef } from "react";
import { nettoyerTexte } from "../sanitize";
import { db, auth } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import axios from "axios";

function NouvellePublication({ onPublie }) {
  const [description, setDescription] = useState("");
  const [fichier, setFichier] = useState(null);
  const [apercu, setApercu] = useState(null);
  const [typeFichier, setTypeFichier] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");

  const handleFichier = (e, type) => {
    const f = e.target.files[0];
    if (!f) return;
    if (type === "image" && f.size > 5 * 1024 * 1024) {
      setErreur("L'image ne doit pas dépasser 5MB.");
      return;
    }
    if (type === "video" && f.size > 50 * 1024 * 1024) {
      setErreur("La vidéo ne doit pas dépasser 50MB.");
      return;
    }
    setFichier(f);
    setApercu(URL.createObjectURL(f));
    setTypeFichier(type);
    setErreur("");
  };

  const dernierEnvoi = useRef(0);

  const publier = async () => {
    if (!fichier && !description.trim()) {
      setErreur("Ajoute une photo, une vidéo ou une description.");
      return;
    }
    const maintenant = Date.now();
    if (maintenant - dernierEnvoi.current < 3000) {
      setErreur("Attends quelques secondes avant de publier à nouveau.");
      return;
    }
    dernierEnvoi.current = maintenant;
    setChargement(true);
    setErreur("");

    try {
      let imageUrl = "";
      let videoUrl = "";

      if (fichier && typeFichier === "image") {
        const reader = new FileReader();
        const base64 = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(fichier);
        });
        const res = await axios.post("/api/upload-image", { imageBase64: base64 });
        imageUrl = res.data.url;
      }

      if (fichier && typeFichier === "video") {
        const reader = new FileReader();
        const base64 = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(fichier);
        });
        const nomFichier = `pub_video_${Date.now()}.mp4`;
        const res = await axios.post("/api/upload-video", {
          videoBase64: base64,
          nomFichier
        });
        videoUrl = res.data.url;
      }

      const user = auth.currentUser;
      await addDoc(collection(db, "publications"), {
        userId: user.uid,
        description: nettoyerTexte(description.trim()),
        imageUrl,
        videoUrl,
        likes: [],
        createdAt: serverTimestamp()
      });

      setDescription("");
      setFichier(null);
      setApercu(null);
      setTypeFichier("");
      if (onPublie) onPublie();
    } catch (e) {
      setErreur("Erreur lors de la publication. Réessaie.");
    }
    setChargement(false);
  };

  return (
    <div className="nouvelle-pub">
      <textarea
        className="pub-textarea"
        placeholder="Quoi de neuf ? 😊"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
      />

      {apercu && (
        <div className="pub-apercu">
          {typeFichier === "image" ? (
            <img src={apercu} alt="aperçu" />
          ) : (
            <video src={apercu} controls />
          )}
          <button
            className="pub-suppr-img"
            onClick={() => {
              setFichier(null);
              setApercu(null);
              setTypeFichier("");
            }}
          >
            ✕
          </button>
        </div>
      )}

      {erreur && <p className="auth-erreur">{erreur}</p>}

      <div className="pub-actions">
        <div className="pub-btns-media">
          <label className="pub-btn-photo">
            📷
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFichier(e, "image")}
              style={{ display: "none" }}
            />
          </label>
          <label className="pub-btn-photo">
            🎥
            <input
              type="file"
              accept="video/*"
              onChange={(e) => handleFichier(e, "video")}
              style={{ display: "none" }}
            />
          </label>
        </div>
        <button
          className="pub-btn-publier"
          onClick={publier}
          disabled={chargement}
        >
          {chargement ? "Publication..." : "Publier"}
        </button>
      </div>
    </div>
  );
}

export default NouvellePublication;