import { useState, useRef } from "react";
import ChatJeu from "./ChatJeu";
import { enregistrerPartie } from "../../jeuxStats";
import { auth } from "../../firebase";
import { addDoc, collection, serverTimestamp, getDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";

const gagnant = (cases) => {
  const lignes = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  for (let [a,b,c] of lignes) {
    if (cases[a] && cases[a] === cases[b] && cases[a] === cases[c]) {
      return cases[a];
    }
  }
  return null;
};

const coupAleatoire = (cases) => {
  const vides = cases.map((c, i) => !c ? i : -1).filter(i => i !== -1);
  return vides[Math.floor(Math.random() * vides.length)];
};

const coupNormal = (cases, joueur) => {
  if (Math.random() < 0.4) return coupAleatoire(cases);
  return meilleurCoup(cases, joueur);
};

const meilleurCoup = (cases, joueur) => {
  const adverse = joueur === "X" ? "O" : "X";
  const minimax = (cases, estIA) => {
    const w = gagnant(cases);
    if (w === joueur) return 10;
    if (w === adverse) return -10;
    if (cases.every(Boolean)) return 0;
    const coups = [];
    cases.forEach((c, i) => {
      if (!c) {
        const newCases = [...cases];
        newCases[i] = estIA ? joueur : adverse;
        coups.push(minimax(newCases, !estIA));
      }
    });
    return estIA ? Math.max(...coups) : Math.min(...coups);
  };
  let meilleur = -Infinity;
  let index = -1;
  cases.forEach((c, i) => {
    if (!c) {
      const newCases = [...cases];
      newCases[i] = joueur;
      const score = minimax(newCases, false);
      if (score > meilleur) { meilleur = score; index = i; }
    }
  });
  return index;
};

const CLES_MESSAGES_IA = {
  debut: ["ticTacToe.msgDebut1", "ticTacToe.msgDebut2", "ticTacToe.msgDebut3"],
  coup: ["ticTacToe.msgCoup1", "ticTacToe.msgCoup2", "ticTacToe.msgCoup3", "ticTacToe.msgCoup4"],
  gagne: ["ticTacToe.msgGagne1", "ticTacToe.msgGagne2", "ticTacToe.msgGagne3", "ticTacToe.msgGagne4"],
  perdu: ["ticTacToe.msgPerdu1", "ticTacToe.msgPerdu2", "ticTacToe.msgPerdu3"],
  nul: ["ticTacToe.msgNul1", "ticTacToe.msgNul2"],
};

const messageAleatoire = (type) => {
  const cles = CLES_MESSAGES_IA[type];
  const cle = cles[Math.floor(Math.random() * cles.length)];
  return i18n.t(cle);
};

function TicTacToe({ onRetour }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState(null);
  const [difficulte, setDifficulte] = useState(null);
  const [cases, setCases] = useState(Array(9).fill(null));
  const [joueur, setJoueur] = useState("X");
  const [scores, setScores] = useState({ X: 0, O: 0 });
  const [afficherRegles, setAfficherRegles] = useState(false);
  const [iaReflechit, setIaReflechit] = useState(false);
  const partieId = useRef(Date.now().toString());

  const winner = gagnant(cases);
  const plein = cases.every(Boolean);

  const envoyerMessageIA = async (type) => {
    const user = auth.currentUser;
    if (!user) return;
    const snap = await getDoc(doc(db, "utilisateurs", user.uid));
    const pseudo = snap.exists() ? snap.data().pseudo : "Joueur";
    await addDoc(collection(db, "chatsJeux", `tictactoe_${partieId.current}`, "messages"), {
      userId: "IA",
      pseudo: "🤖 IA",
      texte: messageAleatoire(type),
      createdAt: serverTimestamp()
    });
  };

  const getCoupIA = (cases) => {
    if (difficulte === "facile") return coupAleatoire(cases);
    if (difficulte === "normal") return coupNormal(cases, "O");
    return meilleurCoup(cases, "O");
  };

  const jouer = (i) => {
    if (cases[i] || winner || iaReflechit) return;
    const newCases = [...cases];
    newCases[i] = joueur;
    setCases(newCases);
    const w = gagnant(newCases);
    if (w) {
      setScores((s) => ({ ...s, [w]: s[w] + 1 }));
      const user = auth.currentUser;
      if (user) enregistrerPartie(user.uid, "tictactoe", w === "X");
      if (mode === "ia") envoyerMessageIA(w === "X" ? "perdu" : "gagne");
    } else if (newCases.every(Boolean)) {
      const user = auth.currentUser;
      if (user) enregistrerPartie(user.uid, "tictactoe", false);
      if (mode === "ia") envoyerMessageIA("nul");
    } else {
      const prochainJoueur = joueur === "X" ? "O" : "X";
      setJoueur(prochainJoueur);
      if (mode === "ia" && prochainJoueur === "O") {
        setIaReflechit(true);
        const delai = difficulte === "facile" ? 600 : difficulte === "normal" ? 800 : 1000;
        setTimeout(() => {
          const coupIA = getCoupIA(newCases);
          if (coupIA !== -1) {
            const casesIA = [...newCases];
            casesIA[coupIA] = "O";
            setCases(casesIA);
            const wIA = gagnant(casesIA);
            if (wIA) {
              setScores((s) => ({ ...s, [wIA]: s[wIA] + 1 }));
              const user = auth.currentUser;
              if (user) enregistrerPartie(user.uid, "tictactoe", false);
              envoyerMessageIA("gagne");
            } else if (casesIA.every(Boolean)) {
              const user = auth.currentUser;
              if (user) enregistrerPartie(user.uid, "tictactoe", false);
              envoyerMessageIA("nul");
            } else {
              setJoueur("X");
              if (Math.random() < 0.3) envoyerMessageIA("coup");
            }
          }
          setIaReflechit(false);
        }, delai);
      }
    }
  };

  const rejouer = () => {
    setCases(Array(9).fill(null));
    setJoueur("X");
    partieId.current = Date.now().toString();
  };

  if (!mode) {
    return (
      <div className="jeu-container">
        <div className="jeu-header">
          <button className="chat-retour" onClick={onRetour}>←</button>
          <h2 className="jeu-titre">{t("ticTacToe.titre")}</h2>
        </div>
        <div className="jeu-mode-selection">
          <p className="jeu-mode-titre">{t("ticTacToe.choisirMode")}</p>
          <button className="jeu-mode-btn" onClick={() => { setCases(Array(9).fill(null)); setJoueur("X"); setScores({ X: 0, O: 0 }); partieId.current = Date.now().toString(); setMode("local"); setDifficulte(null); }}>
            {t("ticTacToe.deuxJoueurs")}
            <span>{t("ticTacToe.deuxJoueursDesc")}</span>
          </button>
          <button className="jeu-mode-btn" onClick={() => setMode("ia")}>
            {t("ticTacToe.contreIA")}
            <span>{t("ticTacToe.contreIADesc")}</span>
          </button>
        </div>
      </div>
    );
  }

  if (mode === "ia" && !difficulte) {
    return (
      <div className="jeu-container">
        <div className="jeu-header">
          <button className="chat-retour" onClick={() => setMode(null)}>←</button>
          <h2 className="jeu-titre">{t("ticTacToe.titre")}</h2>
        </div>
        <div className="jeu-mode-selection">
          <p className="jeu-mode-titre">{t("ticTacToe.choisirDifficulte")}</p>
         <button className="jeu-mode-btn facile" onClick={() => { setCases(Array(9).fill(null)); setJoueur("X"); setScores({ X: 0, O: 0 }); partieId.current = Date.now().toString(); setDifficulte("facile"); envoyerMessageIA("debut"); }}>
            {t("ticTacToe.facile")}
          </button>
          <button className="jeu-mode-btn normal" onClick={() => { setCases(Array(9).fill(null)); setJoueur("X"); setScores({ X: 0, O: 0 }); partieId.current = Date.now().toString(); setDifficulte("normal"); envoyerMessageIA("debut"); }}>
            {t("ticTacToe.normal")}
          </button>
          <button className="jeu-mode-btn expert" onClick={() => { setCases(Array(9).fill(null)); setJoueur("X"); setScores({ X: 0, O: 0 }); partieId.current = Date.now().toString(); setDifficulte("expert"); envoyerMessageIA("debut"); }}>
            {t("ticTacToe.expert")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="jeu-container">
      <div className="jeu-header">
        <button className="chat-retour" onClick={() => mode === "local" ? setMode(null) : setDifficulte(null)}>←</button>
        <h2 className="jeu-titre">{t("ticTacToe.titre")}</h2>
        <button className="jeu-btn-regles" onClick={() => setAfficherRegles(!afficherRegles)}>❓</button>
      </div>

      {afficherRegles && (
        <div className="jeu-regles">
          <p><strong>{t("ticTacToe.objectifTitre")}</strong> {t("ticTacToe.objectifTexte")}</p>
          <p><strong>{t("ticTacToe.tuJouesTitre")}</strong> {mode === "ia" ? t("ticTacToe.tuJouesIA") : t("ticTacToe.tuJouesLocal")}</p>
          <p><strong>{t("ticTacToe.commentJouerTitre")}</strong> {t("ticTacToe.commentJouerTexte")}</p>
          {mode === "ia" && <p><strong>{t("ticTacToe.difficulteTitre")}</strong> {t(`ticTacToe.${difficulte}`)}</p>}
          <button className="jeu-btn-fermer-regles" onClick={() => setAfficherRegles(false)}>{t("ticTacToe.compris")}</button>
        </div>
      )}

      <div className="jeu-scores">
        <div className={`score-card ${joueur === "X" && !winner ? "actif" : ""}`}>
          <span className="score-joueur">{mode === "ia" ? t("ticTacToe.toi") : t("ticTacToe.joueurX")}</span>
          <span className="score-pts">{scores.X}</span>
        </div>
        <div className="score-vs">VS</div>
        <div className={`score-card ${joueur === "O" && !winner ? "actif" : ""}`}>
          <span className="score-joueur">{mode === "ia" ? t("ticTacToe.iaAvecDifficulte", { difficulte: t(`ticTacToe.${difficulte}`) }) : t("ticTacToe.joueurO")}</span>
          <span className="score-pts">{scores.O}</span>
        </div>
      </div>

      <div className="ttt-statut">
        {winner
          ? mode === "ia"
            ? winner === "X" ? t("ticTacToe.tuGagnes") : t("ticTacToe.iaGagne")
            : t("ticTacToe.joueurGagne", { joueur: winner })
          : plein ? t("ticTacToe.matchNul")
          : iaReflechit ? t("ticTacToe.iaReflechit")
          : mode === "ia" ? t("ticTacToe.tonTour")
          : t("ticTacToe.tourDuJoueur", { joueur })}
      </div>

      <div className="ttt-grille">
        {cases.map((c, i) => (
          <button
            key={i}
            className={`ttt-case ${c === "X" ? "x" : c === "O" ? "o" : ""} ${winner ? "fini" : ""}`}
            onClick={() => jouer(i)}
            disabled={iaReflechit || (mode === "ia" && joueur === "O")}
          >
            {c}
          </button>
        ))}
      </div>

      {(winner || plein) && (
        <button className="auth-btn" onClick={rejouer}>{t("ticTacToe.rejouer")}</button>
      )}

      <ChatJeu jeuId="tictactoe" partieId={partieId.current} modeIA={mode === "ia"} />
    </div>
  );
}

export default TicTacToe;