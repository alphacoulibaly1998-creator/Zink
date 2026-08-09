import { useState, useRef } from "react";
import ChatJeu from "./ChatJeu";
import { enregistrerPartie } from "../../jeuxStats";
import { auth } from "../../firebase";
import { useTranslation } from "react-i18next";

const COLS = 7;
const ROWS = 6;

const creerGrille = () => Array(ROWS).fill(null).map(() => Array(COLS).fill(null));

const verifierGagnant = (grille, joueur) => {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c + 3 < COLS &&
        grille[r][c] === joueur && grille[r][c+1] === joueur &&
        grille[r][c+2] === joueur && grille[r][c+3] === joueur) return true;
      if (r + 3 < ROWS &&
        grille[r][c] === joueur && grille[r+1][c] === joueur &&
        grille[r+2][c] === joueur && grille[r+3][c] === joueur) return true;
      if (r + 3 < ROWS && c + 3 < COLS &&
        grille[r][c] === joueur && grille[r+1][c+1] === joueur &&
        grille[r+2][c+2] === joueur && grille[r+3][c+3] === joueur) return true;
      if (r + 3 < ROWS && c - 3 >= 0 &&
        grille[r][c] === joueur && grille[r+1][c-1] === joueur &&
        grille[r+2][c-2] === joueur && grille[r+3][c-3] === joueur) return true;
    }
  }
  return false;
};

const colsDisponibles = (grille) => {
  return Array.from({length: COLS}, (_, c) => c).filter(c => !grille[0][c]);
};

const jouerCoup = (grille, col, joueur) => {
  const newGrille = grille.map(r => [...r]);
  for (let r = ROWS - 1; r >= 0; r--) {
    if (!newGrille[r][col]) {
      newGrille[r][col] = joueur;
      return newGrille;
    }
  }
  return newGrille;
};

const evaluerFenetre = (fenetre, joueur) => {
  const adverse = joueur === 2 ? 1 : 2;
  let score = 0;
  const nbJoueur = fenetre.filter(c => c === joueur).length;
  const nbVide = fenetre.filter(c => !c).length;
  const nbAdverse = fenetre.filter(c => c === adverse).length;
  if (nbJoueur === 4) score += 100;
  else if (nbJoueur === 3 && nbVide === 1) score += 5;
  else if (nbJoueur === 2 && nbVide === 2) score += 2;
  if (nbAdverse === 3 && nbVide === 1) score -= 4;
  return score;
};

const scoreGrille = (grille, joueur) => {
  let score = 0;
  const centre = Array.from({length: ROWS}, (_, r) => grille[r][Math.floor(COLS/2)]);
  score += centre.filter(c => c === joueur).length * 3;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const fenetre = [grille[r][c], grille[r][c+1], grille[r][c+2], grille[r][c+3]];
      score += evaluerFenetre(fenetre, joueur);
    }
  }
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS; c++) {
      const fenetre = [grille[r][c], grille[r+1][c], grille[r+2][c], grille[r+3][c]];
      score += evaluerFenetre(fenetre, joueur);
    }
  }
  return score;
};

const minimax = (grille, profondeur, alpha, beta, maximise, joueurIA) => {
  const adverse = joueurIA === 2 ? 1 : 2;
  if (verifierGagnant(grille, joueurIA)) return 10000;
  if (verifierGagnant(grille, adverse)) return -10000;
  if (colsDisponibles(grille).length === 0 || profondeur === 0) return scoreGrille(grille, joueurIA);
  if (maximise) {
    let valeur = -Infinity;
    for (let col of colsDisponibles(grille)) {
      const newGrille = jouerCoup(grille, col, joueurIA);
      valeur = Math.max(valeur, minimax(newGrille, profondeur - 1, alpha, beta, false, joueurIA));
      alpha = Math.max(alpha, valeur);
      if (alpha >= beta) break;
    }
    return valeur;
  } else {
    let valeur = Infinity;
    for (let col of colsDisponibles(grille)) {
      const newGrille = jouerCoup(grille, col, adverse);
      valeur = Math.min(valeur, minimax(newGrille, profondeur - 1, alpha, beta, true, joueurIA));
      beta = Math.min(beta, valeur);
      if (alpha >= beta) break;
    }
    return valeur;
  }
};

const meilleurCoupIA = (grille, difficulte, joueurIA) => {
  const cols = colsDisponibles(grille);
  if (difficulte === "facile") return cols[Math.floor(Math.random() * cols.length)];
  if (difficulte === "normal") {
    if (Math.random() < 0.3) return cols[Math.floor(Math.random() * cols.length)];
  }
  const profondeur = difficulte === "expert" ? 5 : 3;
  let meilleur = -Infinity;
  let meilleurCol = cols[0];
  for (let col of cols) {
    const newGrille = jouerCoup(grille, col, joueurIA);
    const score = minimax(newGrille, profondeur - 1, -Infinity, Infinity, false, joueurIA);
    if (score > meilleur) { meilleur = score; meilleurCol = col; }
  }
  return meilleurCol;
};

function Puissance4({ onRetour }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState(null);
  const [difficulte, setDifficulte] = useState(null);
  const [grille, setGrille] = useState(creerGrille());
  const [joueur, setJoueur] = useState(1);
  const [winner, setWinner] = useState(null);
  const [scores, setScores] = useState({ 1: 0, 2: 0 });
  const [afficherRegles, setAfficherRegles] = useState(false);
  const [iaReflechit, setIaReflechit] = useState(false);
  const partieId = useRef(Date.now().toString());

  const reinitialiser = () => {
    setGrille(creerGrille());
    setJoueur(1);
    setWinner(null);
    partieId.current = Date.now().toString();
  };

  const jouer = (col) => {
    if (winner || iaReflechit) return;
    if (!grille[0][col] === false) return;
    const newGrille = jouerCoup(grille, col, joueur);
    setGrille(newGrille);
    if (verifierGagnant(newGrille, joueur)) {
      setWinner(joueur);
      setScores((s) => ({ ...s, [joueur]: s[joueur] + 1 }));
      const user = auth.currentUser;
      if (user) enregistrerPartie(user.uid, "puissance4", joueur === 1);
    } else if (colsDisponibles(newGrille).length === 0) {
      setWinner(0);
      const user = auth.currentUser;
      if (user) enregistrerPartie(user.uid, "puissance4", false);
    } else {
      const prochainJoueur = joueur === 1 ? 2 : 1;
      setJoueur(prochainJoueur);
      if (mode === "ia" && prochainJoueur === 2) {
        setIaReflechit(true);
        const delai = difficulte === "facile" ? 500 : difficulte === "normal" ? 800 : 1200;
        setTimeout(() => {
          const coupIA = meilleurCoupIA(newGrille, difficulte, 2);
          const grilleIA = jouerCoup(newGrille, coupIA, 2);
          setGrille(grilleIA);
          if (verifierGagnant(grilleIA, 2)) {
            setWinner(2);
            setScores((s) => ({ ...s, 2: s[2] + 1 }));
            const user = auth.currentUser;
            if (user) enregistrerPartie(user.uid, "puissance4", false);
          } else if (colsDisponibles(grilleIA).length === 0) {
            setWinner(0);
          } else {
            setJoueur(1);
          }
          setIaReflechit(false);
        }, delai);
      }
    }
  };

  if (!mode) {
    return (
      <div className="jeu-container">
        <div className="jeu-header">
          <button className="chat-retour" onClick={onRetour}>←</button>
          <h2 className="jeu-titre">{t("puissance4.titre")}</h2>
        </div>
        <div className="jeu-mode-selection">
          <p className="jeu-mode-titre">{t("puissance4.choisirMode")}</p>
          <button className="jeu-mode-btn" onClick={() => { setMode("local"); reinitialiser(); setScores({ 1: 0, 2: 0 }); }}>
            {t("puissance4.deuxJoueurs")}
            <span>{t("puissance4.deuxJoueursDesc")}</span>
          </button>
          <button className="jeu-mode-btn" onClick={() => setMode("ia")}>
            {t("puissance4.contreIA")}
            <span>{t("puissance4.contreIADesc")}</span>
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
          <h2 className="jeu-titre">{t("puissance4.titre")}</h2>
        </div>
        <div className="jeu-mode-selection">
          <p className="jeu-mode-titre">{t("puissance4.choisirDifficulte")}</p>
          <button className="jeu-mode-btn facile" onClick={() => { reinitialiser(); setScores({ 1: 0, 2: 0 }); setDifficulte("facile"); }}>{t("puissance4.facile")}</button>
          <button className="jeu-mode-btn normal" onClick={() => { reinitialiser(); setScores({ 1: 0, 2: 0 }); setDifficulte("normal"); }}>{t("puissance4.normal")}</button>
          <button className="jeu-mode-btn expert" onClick={() => { reinitialiser(); setScores({ 1: 0, 2: 0 }); setDifficulte("expert"); }}>{t("puissance4.expert")}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="jeu-container">
      <div className="jeu-header">
        <button className="chat-retour" onClick={() => { mode === "local" ? setMode(null) : setDifficulte(null); reinitialiser(); }}>←</button>
        <h2 className="jeu-titre">{t("puissance4.titre")}</h2>
        <button className="jeu-btn-regles" onClick={() => setAfficherRegles(!afficherRegles)}>❓</button>
      </div>

      {afficherRegles && (
        <div className="jeu-regles">
          <p><strong>{t("puissance4.objectifTitre")}</strong> {t("puissance4.objectifTexte")}</p>
          <p><strong>{t("puissance4.joueursTitre")}</strong> {t("puissance4.joueursTexte")}</p>
          <p><strong>{t("puissance4.commentJouerTitre")}</strong> {t("puissance4.commentJouerTexte")}</p>
          {mode === "ia" && <p><strong>{t("puissance4.difficulteTitre")}</strong> {t(`puissance4.${difficulte}`)}</p>}
          <button className="jeu-btn-fermer-regles" onClick={() => setAfficherRegles(false)}>{t("puissance4.compris")}</button>
        </div>
      )}

      <div className="jeu-scores">
        <div className={`score-card ${joueur === 1 && !winner ? "actif" : ""}`}>
          <span className="score-joueur">{mode === "ia" ? t("puissance4.toi") : t("puissance4.j1")}</span>
          <span className="score-pts">{scores[1]}</span>
        </div>
        <div className="score-vs">VS</div>
        <div className={`score-card ${joueur === 2 && !winner ? "actif" : ""}`}>
          <span className="score-joueur">{mode === "ia" ? t("puissance4.iaAvecDifficulte", { difficulte: t(`puissance4.${difficulte}`) }) : t("puissance4.j2")}</span>
          <span className="score-pts">{scores[2]}</span>
        </div>
      </div>

      <div className="p4-statut">
        {winner === 0 ? t("puissance4.matchNul")
          : winner ? mode === "ia"
            ? winner === 1 ? t("puissance4.tuGagnes") : t("puissance4.iaGagne")
            : t("puissance4.joueurGagne", { joueur: winner })
          : iaReflechit ? t("puissance4.iaReflechit")
          : mode === "ia" ? t("puissance4.tonTour")
          : t("puissance4.tourDuJoueur", { couleur: joueur === 1 ? "🔴" : "🟡" })}
      </div>

      <div className="p4-grille">
        {grille.map((row, r) =>
          row.map((cell, c) => (
            <button
              key={`${r}-${c}`}
              className={`p4-case ${cell === 1 ? "rouge" : cell === 2 ? "jaune" : ""}`}
              onClick={() => !winner && !iaReflechit && jouer(c)}
            />
          ))
        )}
      </div>

      {(winner !== null) && (
        <button className="auth-btn" onClick={reinitialiser}>{t("puissance4.rejouer")}</button>
      )}

      <ChatJeu jeuId="puissance4" partieId={partieId.current} modeIA={mode === "ia"} />
    </div>
  );
}

export default Puissance4;