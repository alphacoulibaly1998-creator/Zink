import { useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { paysList } from "../indicatifs";

function Register() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [paysChoisi, setPaysChoisi] = useState(null);
  const [telephone, setTelephone] = useState("");
  const [telephoneMasque, setTelephoneMasque] = useState(false);
  const [age, setAge] = useState("");
  const [dateMasquee, setDateMasquee] = useState(false);
  const [sexe, setSexe] = useState("");
  const [voirMdp, setVoirMdp] = useState(false);
  const [erreur, setErreur] = useState("");
  const [erreurPseudo, setErreurPseudo] = useState("");
  const [suggestionsPseudo, setSuggestionsPseudo] = useState([]);
  const [erreurTel, setErreurTel] = useState("");
  const [chargement, setChargement] = useState(false);
  const navigate = useNavigate();

  const handlePays = (e) => {
    const nomPays = e.target.value;
    const trouve = paysList.find((p) => p.nom === nomPays);
    setPaysChoisi(trouve || null);
    setTelephone("");
    setErreurTel("");
  };

  const validerTelephone = () => {
    if (!telephone) return true;
    const chiffres = telephone.replace(/\s/g, "");
    if (!/^\d+$/.test(chiffres)) return false;
    if (paysChoisi && chiffres.length !== paysChoisi.chiffres) return false;
    return true;
  };

  const genererSuggestions = (pseudoBase) => {
    const base = pseudoBase.trim();
    return [
      `${base}${Math.floor(Math.random() * 900) + 100}`,
      `${base}_${Math.floor(Math.random() * 99) + 1}`,
      `${base}.zink`,
    ];
  };

  const verifierPseudo = async (valeur) => {
    setErreurPseudo("");
    setSuggestionsPseudo([]);
    if (!valeur.trim()) return;
    const q = query(
      collection(db, "utilisateurs"),
      where("pseudo", "==", valeur.trim())
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      setErreurPseudo("Ce pseudo est déjà utilisé.");
      setSuggestionsPseudo(genererSuggestions(valeur));
    }
  };

  const handleRegister = async () => {
    setErreur("");
    setErreurPseudo("");
    setErreurTel("");
    setSuggestionsPseudo([]);
    setChargement(true);

    if (!pseudo.trim()) {
      setErreurPseudo("Le pseudo est obligatoire.");
      setChargement(false);
      return;
    }

    const mdpRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!mdpRegex.test(motDePasse)) {
      setErreur("Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre.");
      setChargement(false);
      return;
    }

    if (!paysChoisi) {
      setErreur("Choisis ton pays.");
      setChargement(false);
      return;
    }

   if (!age) {
      setErreur("Entre ta date de naissance.");
      setChargement(false);
      return;
    }
    const dateNaissance = new Date(age);
    const aujourdhui = new Date();
    const ageCalcule = Math.floor((aujourdhui - dateNaissance) / (365.25 * 24 * 60 * 60 * 1000));
    if (!sexe) {
      setErreur("Choisis ton sexe.");
      setChargement(false);
      return;
    }
    if (!validerTelephone()) {
      setErreurTel(
        `Numéro invalide. Le ${paysChoisi.nom} nécessite exactement ${paysChoisi.chiffres} chiffres.`
      );
      setChargement(false);
      return;
    }

    // Vérifier pseudo unique
    const qPseudo = query(
      collection(db, "utilisateurs"),
      where("pseudo", "==", pseudo.trim())
    );
    const snapPseudo = await getDocs(qPseudo);
    if (!snapPseudo.empty) {
      setErreurPseudo("Ce pseudo est déjà utilisé.");
      setSuggestionsPseudo(genererSuggestions(pseudo));
      setChargement(false);
      return;
    }

    // Vérifier numéro unique
    if (telephone) {
      const numeroComplet = `${paysChoisi.indicatif}${telephone.replace(/\s/g, "")}`;
      const qTel = query(
        collection(db, "utilisateurs"),
        where("telephone", "==", numeroComplet)
      );
      const snapTel = await getDocs(qTel);
      if (!snapTel.empty) {
        setErreurTel("Ce numéro de téléphone est déjà utilisé.");
        setChargement(false);
        return;
      }
    }

    try {
      const result = await createUserWithEmailAndPassword(auth, email, motDePasse);
      await sendEmailVerification(result.user);
      const numeroComplet = telephone
        ? `${paysChoisi.indicatif}${telephone.replace(/\s/g, "")}`
        : "";
      await setDoc(doc(db, "utilisateurs", result.user.uid), {
        pseudo: pseudo.trim(),
        pseudoLower: pseudo.trim().toLowerCase(),
        email,
        dateNaissance: age,
        dateMasquee: dateMasquee || false,
        age: ageCalcule || 0,
        sexe,
        pays: paysChoisi.nom,
        indicatif: paysChoisi.indicatif,
        chiffresTel: paysChoisi.chiffres,
        telephone: numeroComplet,
        telephoneMasque,
        statut: "Salut, je suis sur Zink !",
        points: 0,
        badges: [],
        photoURL: "",
        createdAt: new Date()
      });
      navigate("/");
    } catch (e) {
      if (e.code === "auth/email-already-in-use") {
        setErreur("Cet email est déjà utilisé par un autre compte.");
      } else if (e.code === "auth/invalid-email") {
        setErreur("L'adresse email n'est pas valide.");
      } else if (e.code === "auth/weak-password") {
        setErreur("Le mot de passe doit contenir au moins 6 caractères.");
      } else {
        setErreur("Une erreur est survenue. Réessaie.");
      }
    }
    setChargement(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button onClick={() => i18n.changeLanguage("fr")} style={{ background: "none", border: "1px solid #2a2a4a", borderRadius: "8px", padding: "4px 8px", color: "#888", cursor: "pointer" }}>🇫🇷 FR</button>
          <button onClick={() => i18n.changeLanguage("en")} style={{ background: "none", border: "1px solid #2a2a4a", borderRadius: "8px", padding: "4px 8px", color: "#888", cursor: "pointer" }}>🇬🇧 EN</button>
        </div>
        <h1 className="auth-titre">Zink</h1>
        <p className="auth-sous-titre">{t("inscription.titre")}</p>

        <div>
          <input
            className="auth-input"
            type="text"
            placeholder={t("inscription.pseudo")}
            value={pseudo}
            onChange={(e) => {
              setPseudo(e.target.value);
              setErreurPseudo("");
              setSuggestionsPseudo([]);
            }}
            onBlur={() => verifierPseudo(pseudo)}
          />
          {erreurPseudo && (
            <p className="auth-erreur">{erreurPseudo}</p>
          )}
          {suggestionsPseudo.length > 0 && (
            <div className="suggestions-container">
              <p className="suggestions-titre">Suggestions :</p>
              {suggestionsPseudo.map((s) => (
                <button
                  key={s}
                  className="suggestion-btn"
                  onClick={() => {
                    setPseudo(s);
                    setErreurPseudo("");
                    setSuggestionsPseudo([]);
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <input
          className="auth-input"
          type="email"
          placeholder={t("inscription.email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="mdp-container">
          <input
            className="auth-input"
            type={voirMdp ? "text" : "password"}
            placeholder={t("inscription.motDePasse")}
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
          />
          <button
            className="mdp-oeil"
            onClick={() => setVoirMdp(!voirMdp)}
          >
            {voirMdp ? "🙈" : "👁️"}
          </button>
        </div>

        <select
          className="auth-input"
          value={paysChoisi?.nom || ""}
          onChange={handlePays}
        >
          <option value="">{t("inscription.choisirPays")}</option>
          {paysList.map((p) => (
            <option key={p.nom} value={p.nom}>
              {i18n.language === "en" ? p.nomEn : p.nom}
            </option>
          ))}
        </select>

<div className="auth-label-group">
          <label className="auth-label">{t("inscription.dateNaissance")}</label>
          <input
            className="auth-input"
            type="date"
            value={age}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => setAge(e.target.value)}
          />
        </div>
        {age && (
          <label className="auth-checkbox">
            <input
              type="checkbox"
              checked={dateMasquee}
              onChange={(e) => setDateMasquee(e.target.checked)}
            />
            {t("inscription.masquerDate")}
          </label>
        )}

        <select
          className="auth-input"
          value={sexe}
          onChange={(e) => setSexe(e.target.value)}
        >
          <option value="">{t("inscription.choisirSexe")}</option>
          <option value="homme">{t("inscription.homme")}</option>
          <option value="femme">{t("inscription.femme")}</option>
          <option value="autre">{t("inscription.autre")}</option>
          <option value="non-precise">{t("inscription.nonPrecise")}</option>
        </select>

        <div>
          <div className="tel-container">
            <input
              className="auth-input tel-indicatif"
              type="text"
              value={paysChoisi?.indicatif || ""}
              readOnly
              placeholder="+000"
            />
            <input
              className="auth-input tel-numero"
              type="tel"
              placeholder={
                paysChoisi
                  ? `${paysChoisi.chiffres} chiffres (optionnel)`
                  : t("inscription.telephone")
              }
              value={telephone}
              onChange={(e) => {
                setErreurTel("");
                setTelephone(e.target.value);
              }}
            />
          </div>
          {erreurTel && <p className="auth-erreur">{erreurTel}</p>}
        </div>

        {telephone && (
          <label className="auth-checkbox">
            <input
              type="checkbox"
              checked={telephoneMasque}
              onChange={(e) => setTelephoneMasque(e.target.checked)}
            />
            {t("inscription.masquerTelephone")}
          </label>
        )}

        {erreur && <p className="auth-erreur">{erreur}</p>}

        <button
          className="auth-btn"
          onClick={handleRegister}
          disabled={chargement}
        >
          {chargement ? t("inscription.inscriptionEnCours") : t("inscription.sinscrire")}
        </button>

        <p className="auth-lien" onClick={() => navigate("/login")}>
          {t("inscription.dejaCompte")} <span>{t("inscription.connecteToi")}</span>
        </p>
      </div>
    </div>
  );
}

export default Register;