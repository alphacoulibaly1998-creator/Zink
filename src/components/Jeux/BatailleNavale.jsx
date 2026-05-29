import { useState } from "react";
import ChatJeu from "./ChatJeu";

const TAILLE = 10;
const BATEAUX = [5, 4, 3, 3, 2];

const creerGrille = () => Array(TAILLE).fill(null).map(() => Array(TAILLE).fill(null));

const placerBateauxAuto = () => {
  const grille = creerGrille();
  for (let taille of BATEAUX) {
    let place = false;
    while (!place) {
      const horizontal = Math.random() > 0.5;
      const r = Math.floor(Math.random() * (horizontal ? TAILLE : TAILLE - taille));
      const c = Math.floor(Math.random() * (horizontal ? TAILLE - taille : TAILLE));
      let ok = true;
      for (let i = 0; i < taille; i++) {
        const nr = horizontal ? r : r + i;
        const nc = horizontal ? c + i : c;
        if (grille[nr][nc]) { ok = false; break; }
      }
      if (ok) {
        for (let i = 0; i < taille; i++) {
          const nr = horizontal ? r : r + i;
          const nc = horizontal ? c + i : c;
          grille[nr][nc] = "bateau";
        }
        place = true;
      }
    }
  }
  return grille;
};

function BatailleNavale({ onRetour }) {
  const [phase, setPhase] = useState("jeu");
  const [grilleJ1] = useState(placerBateauxAuto());
  const [grilleJ2] = useState(placerBateauxAuto());
  const [tirsJ1, setTirsJ1] = useState(creerGrille());
  const [tirsJ2, setTirsJ2] = useState(creerGrille());
  const [joueur, setJoueur] = useState(1);
  const [winner, setWinner] = useState(null);

  const compterBateaux = (grille, tirs) => {
    let total = 0;
    let touches = 0;
    for (let r = 0; r < TAILLE; r++) {
      for (let c = 0; c < TAILLE; c++) {
        if (grille[r][c] === "bateau") {
          total++;
          if (tirs[r][c] === "touche") touches++;
        }
      }
    }
    return { total, touches };
  };

  const tirer = (r, c) => {
    if (winner) return;
    if (joueur === 1) {
      if (tirsJ1[r][c]) return;
      const newTirs = tirsJ1.map((row) => [...row]);
      newTirs[r][c] = grilleJ2[r][c] === "bateau" ? "touche" : "rate";
      setTirsJ1(newTirs);
      const { total, touches } = compterBateaux(grilleJ2, newTirs);
      if (touches === total) { setWinner(1); return; }
      setJoueur(2);
    } else {
      if (tirsJ2[r][c]) return;
      const newTirs = tirsJ2.map((row) => [...row]);
      newTirs[r][c] = grilleJ1[r][c] === "bateau" ? "touche" : "rate";
      setTirsJ2(newTirs);
      const { total, touches } = compterBateaux(grilleJ1, newTirs);
      if (touches === total) { setWinner(2); return; }
      setJoueur(1);
    }
  };

  const grilleAffichee = joueur === 1 ? tirsJ1 : tirsJ2;
  const grilleEnnemie = joueur === 1 ? grilleJ2 : grilleJ1;

  return (
    <div className="jeu-container">
      <div className="jeu-header">
        <button className="chat-retour" onClick={onRetour}>←</button>
        <h2 className="jeu-titre">🚢 Bataille Navale</h2>
      </div>

      <div className="bn-statut">
        {winner
          ? `🏆 Joueur ${winner} gagne !`
          : `Tour du Joueur ${joueur} — Tire sur la grille !`}
      </div>

      <div className="bn-grille">
        {grilleAffichee.map((row, r) =>
          row.map((cell, c) => (
            <button
              key={`${r}-${c}`}
              className={`bn-case ${cell === "touche" ? "touche" : cell === "rate" ? "rate" : ""}`}
              onClick={() => tirer(r, c)}
            >
              {cell === "touche" ? "💥" : cell === "rate" ? "💧" : ""}
            </button>
          ))
        )}
      </div>

      {winner && (
        <button className="auth-btn" onClick={() => window.location.reload()}>
          🔄 Rejouer
        </button>
      )}

      <ChatJeu jeuId="bataillenavale" />
    </div>
  );
}

export default BatailleNavale;