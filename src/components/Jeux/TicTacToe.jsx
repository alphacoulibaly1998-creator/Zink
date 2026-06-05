import { useState, useRef } from "react";
import ChatJeu from "./ChatJeu";

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

function TicTacToe({ onRetour }) {
  const [cases, setCases] = useState(Array(9).fill(null));
  const [joueur, setJoueur] = useState("X");
  const [scores, setScores] = useState({ X: 0, O: 0 });
  const partieId = useRef(Date.now().toString());
  const winner = gagnant(cases);
  const plein = cases.every(Boolean);

  const jouer = (i) => {
    if (cases[i] || winner) return;
    const newCases = [...cases];
    newCases[i] = joueur;
    setCases(newCases);
    const w = gagnant(newCases);
    if (w) {
      setScores((s) => ({ ...s, [w]: s[w] + 1 }));
    } else {
      setJoueur(joueur === "X" ? "O" : "X");
    }
  };

  const rejouer = () => {
    setCases(Array(9).fill(null));
    setJoueur("X");
  };

  return (
    <div className="jeu-container">
      <div className="jeu-header">
        <button className="chat-retour" onClick={onRetour}>←</button>
        <h2 className="jeu-titre">⭕ Tic Tac Toe</h2>
      </div>

      <div className="jeu-scores">
        <div className={`score-card ${joueur === "X" && !winner ? "actif" : ""}`}>
          <span className="score-joueur">Joueur X</span>
          <span className="score-pts">{scores.X}</span>
        </div>
        <div className="score-vs">VS</div>
        <div className={`score-card ${joueur === "O" && !winner ? "actif" : ""}`}>
          <span className="score-joueur">Joueur O</span>
          <span className="score-pts">{scores.O}</span>
        </div>
      </div>

      <div className="ttt-statut">
        {winner
          ? `🏆 Joueur ${winner} gagne !`
          : plein
          ? "Match nul !"
          : `Tour du joueur ${joueur}`}
      </div>

      <div className="ttt-grille">
        {cases.map((c, i) => (
          <button
            key={i}
            className={`ttt-case ${c === "X" ? "x" : c === "O" ? "o" : ""} ${winner ? "fini" : ""}`}
            onClick={() => jouer(i)}
          >
            {c}
          </button>
        ))}
      </div>

      {(winner || plein) && (
        <button className="auth-btn" onClick={rejouer}>
          🔄 Rejouer
        </button>
      )}

      <ChatJeu jeuId="tictactoe" partieId={partieId.current} />
    </div>
  );
}

export default TicTacToe;