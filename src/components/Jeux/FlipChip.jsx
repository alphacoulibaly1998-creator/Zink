import { useState, useRef } from "react";
import ChatJeu from "./ChatJeu";
import { enregistrerPartie } from "../../jeuxStats";
import { auth } from "../../firebase";

const TAILLE = 6;

const creerGrille = () =>
  Array(TAILLE).fill(null).map(() => Array(TAILLE).fill(null));

const compter = (grille, couleur) => {
  let count = 0;
  for (let r = 0; r < TAILLE; r++)
    for (let c = 0; c < TAILLE; c++)
      if (grille[r][c] === couleur) count++;
  return count;
};

function FlipChip({ onRetour }) {
  const [grille, setGrille] = useState(creerGrille());
  const [joueur, setJoueur] = useState("noir");
  const [scores, setScores] = useState({ noir: 0, blanc: 0 });
  const [winner, setWinner] = useState(null);
  const [afficherRegles, setAfficherRegles] = useState(false);
  const partieId = useRef(Date.now().toString());

  const retourner = (grille, r, c, couleur) => {
    const dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
    const adverse = couleur === "noir" ? "blanc" : "noir";
    const newGrille = grille.map((row) => [...row]);
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

  const jouer = (r, c) => {
    if (winner || grille[r][c]) return;
    const newGrille = retourner(grille, r, c, joueur);

    const noirCount = compter(newGrille, "noir");
    const blancCount = compter(newGrille, "blanc");
    const vide = TAILLE * TAILLE - noirCount - blancCount;

    setGrille(newGrille);

    if (vide === 0) {
      const w = noirCount > blancCount ? "noir" : blancCount > noirCount ? "blanc" : "egalite";
      setWinner(w);
      if (w !== "egalite") {
        setScores((s) => ({ ...s, [w]: s[w] + 1 }));
        const user = auth.currentUser;
        if (user) enregistrerPartie(user.uid, "flipchip", true);
      }
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
        <button className="jeu-btn-regles" onClick={() => setAfficherRegles(!afficherRegles)}>❓</button>
      </div>

      {afficherRegles && (
        <div className="jeu-regles">
          <p><strong>🎯 Objectif :</strong> Avoir le plus de jetons de ta couleur quand la grille est pleine.</p>
          <p><strong>👥 Joueurs :</strong> ⚫ Noir vs ⚪ Blanc, à tour de rôle.</p>
          <p><strong>▶️ Comment jouer :</strong> Clique sur une case vide pour y placer ton jeton.</p>
          <p><strong>🔄 Retournement :</strong> Si tes jetons encerclent des jetons adverses (en ligne droite ou diagonale), ils se transforment automatiquement en ta couleur !</p>
          <p><strong>🏆 Victoire :</strong> Celui qui a le plus de jetons quand la grille est pleine gagne !</p>
          <button className="jeu-btn-fermer-regles" onClick={() => setAfficherRegles(false)}>Compris !</button>
        </div>
      )}

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
          ? winner === "egalite"
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

      <ChatJeu jeuId="flipchip" partieId={partieId.current} />
    </div>
  );
}

export default FlipChip;