import { useState, useRef } from "react";
import ChatJeu from "./ChatJeu";

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

function Puissance4({ onRetour }) {
  const [grille, setGrille] = useState(creerGrille());
  const [joueur, setJoueur] = useState(1);
  const [winner, setWinner] = useState(null);
  const [scores, setScores] = useState({ 1: 0, 2: 0 });
  const partieId = useRef(Date.now().toString());

  const jouer = (col) => {
    if (winner) return;
    const newGrille = grille.map((r) => [...r]);
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!newGrille[r][col]) {
        newGrille[r][col] = joueur;
        setGrille(newGrille);
        if (verifierGagnant(newGrille, joueur)) {
          setWinner(joueur);
          setScores((s) => ({ ...s, [joueur]: s[joueur] + 1 }));
        } else {
          setJoueur(joueur === 1 ? 2 : 1);
        }
        return;
      }
    }
  };

  const rejouer = () => {
    setGrille(creerGrille());
    setJoueur(1);
    setWinner(null);
  };

  return (
    <div className="jeu-container">
      <div className="jeu-header">
        <button className="chat-retour" onClick={onRetour}>←</button>
        <h2 className="jeu-titre">🔴 Puissance 4</h2>
      </div>

      <div className="jeu-scores">
        <div className={`score-card ${joueur === 1 && !winner ? "actif" : ""}`}>
          <span className="score-joueur">🔴 J1</span>
          <span className="score-pts">{scores[1]}</span>
        </div>
        <div className="score-vs">VS</div>
        <div className={`score-card ${joueur === 2 && !winner ? "actif" : ""}`}>
          <span className="score-joueur">🟡 J2</span>
          <span className="score-pts">{scores[2]}</span>
        </div>
      </div>

      <div className="p4-statut">
        {winner
          ? `🏆 Joueur ${winner} gagne !`
          : `Tour du joueur ${joueur === 1 ? "🔴" : "🟡"}`}
      </div>

      <div className="p4-grille">
        {grille.map((row, r) =>
          row.map((cell, c) => (
            <button
              key={`${r}-${c}`}
              className={`p4-case ${cell === 1 ? "rouge" : cell === 2 ? "jaune" : ""}`}
              onClick={() => jouer(c)}
            />
          ))
        )}
      </div>

      {winner && (
        <button className="auth-btn" onClick={rejouer}>
          🔄 Rejouer
        </button>
      )}

      <ChatJeu jeuId="puissance4" partieId={partieId.current} />
    </div>
  );
}

export default Puissance4;