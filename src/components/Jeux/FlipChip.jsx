import { useState } from "react";
import ChatJeu from "./ChatJeu";

const TAILLE = 6;

const creerGrille = () =>
  Array(TAILLE).fill(null).map(() =>
    Array(TAILLE).fill(null).map(() => (Math.random() > 0.5 ? "blanc" : "noir"))
  );

const compter = (grille, couleur) => {
  let count = 0;
  for (let r = 0; r < TAILLE; r++)
    for (let c = 0; c < TAILLE; c++)
      if (grille[r][c] === couleur) count++;
  return count;
};

const retourner = (grille, r, c, couleur) => {
  const dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
  const newGrille = grille.map((row) => [...row]);
  const adverse = couleur === "noir" ? "blanc" : "noir";
  newGrille[r][c] = couleur;

  for (let [dr, dc] of dirs) {
    let path = [];
    let nr = r + dr;
    let nc = c + dc;
    while (nr >= 0 && nr < TAILLE && nc >= 0 && nc < TAILLE && newGrille[nr][nc] === adverse) {
      path.push([nr, nc]);
      nr += dr;
      nc += dc;
    }
    if (path.length > 0 && nr >= 0 && nr < TAILLE && nc >= 0 && nc < TAILLE && newGrille[nr][nc] === couleur) {
      for (let [pr, pc] of path) newGrille[pr][pc] = couleur;
    }
  }
  return newGrille;
};

function FlipChip({ onRetour }) {
  const [grille, setGrille] = useState(creerGrille());
  const [joueur, setJoueur] = useState("noir");
  const [scores, setScores] = useState({ noir: 0, blanc: 0 });
  const [winner, setWinner] = useState(null);

  const jouer = (r, c) => {
    if (winner || grille[r][c]) return;
    const newGrille = retourner(grille, r, c, joueur);
    setGrille(newGrille);
    const noirCount = compter(newGrille, "noir");
    const blancCount = compter(newGrille, "blanc");
    const vide = TAILLE * TAILLE - noirCount - blancCount;
    if (vide === 0) {
      const w = noirCount > blancCount ? "noir" : blancCount > noirCount ? "blanc" : "égalité";
      setWinner(w);
      if (w !== "égalité") setScores((s) => ({ ...s, [w]: s[w] + 1 }));
    } else {
      setJoueur(joueur === "noir" ? "blanc" : "noir");
    }
  };

  const rejouer = () => {
    setGrille(creerGrille());
    setJoueur("noir");
    setWinner(null);
  };

  return (
    <div className="jeu-container">
      <div className="jeu-header">
        <button className="chat-retour" onClick={onRetour}>←</button>
        <h2 className="jeu-titre">🪙 Flip Chip</h2>
      </div>

      <div className="jeu-scores">
        <div className={`score-card ${joueur === "noir" && !winner ? "actif" : ""}`}>
          <span className="score-joueur">⚫ Noir</span>
          <span className="score-pts">{scores.noir} — {compter(grille, "noir")}</span>
        </div>
        <div className="score-vs">VS</div>
        <div className={`score-card ${joueur === "blanc" && !winner ? "actif" : ""}`}>
          <span className="score-joueur">⚪ Blanc</span>
          <span className="score-pts">{scores.blanc} — {compter(grille, "blanc")}</span>
        </div>
      </div>

      <div className="fc-statut">
        {winner
          ? winner === "égalité"
            ? "Match nul !"
            : `🏆 ${winner === "noir" ? "⚫ Noir" : "⚪ Blanc"} gagne !`
          : `Tour de ${joueur === "noir" ? "⚫ Noir" : "⚪ Blanc"}`}
      </div>

      <div className="fc-grille">
        {grille.map((row, r) =>
          row.map((cell, c) => (
            <button
              key={`${r}-${c}`}
              className={`fc-case ${cell === "noir" ? "noir" : cell === "blanc" ? "blanc" : "vide"}`}
              onClick={() => jouer(r, c)}
            >
              {cell === "noir" ? "⚫" : cell === "blanc" ? "⚪" : ""}
            </button>
          ))
        )}
      </div>

      {winner && (
        <button className="auth-btn" onClick={rejouer}>
          🔄 Rejouer
        </button>
      )}

      <ChatJeu jeuId="flipchip" />
    </div>
  );
}

export default FlipChip;