import { useState, useRef } from "react";
import ChatJeu from "./ChatJeu";
import { enregistrerPartie } from "../../jeuxStats";
import { auth } from "../../firebase";

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

const coupIAFacile = (tirs) => {
  const cases = [];
  for (let r = 0; r < TAILLE; r++)
    for (let c = 0; c < TAILLE; c++)
      if (!tirs[r][c]) cases.push([r, c]);
  return cases[Math.floor(Math.random() * cases.length)];
};

const coupIAIntelligent = (tirs, grille) => {
  for (let r = 0; r < TAILLE; r++) {
    for (let c = 0; c < TAILLE; c++) {
      if (tirs[r][c] === "touche") {
        const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
        for (let [dr, dc] of dirs) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < TAILLE && nc >= 0 && nc < TAILLE && !tirs[nr][nc]) {
            return [nr, nc];
          }
        }
      }
    }
  }
  return coupIAFacile(tirs);
};

function BatailleNavale({ onRetour }) {
  const [mode, setMode] = useState(null);
  const [difficulte, setDifficulte] = useState(null);
  const [grilleJ1] = useState(placerBateauxAuto());
  const [grilleJ2] = useState(placerBateauxAuto());
  const [tirsJ1, setTirsJ1] = useState(creerGrille());
  const [tirsJ2, setTirsJ2] = useState(creerGrille());
  const [joueur, setJoueur] = useState(1);
  const [winner, setWinner] = useState(null);
  const [afficherRegles, setAfficherRegles] = useState(false);
  const [iaReflechit, setIaReflechit] = useState(false);
  const partieId = useRef(Date.now().toString());

  const tirer = (r, c) => {
    if (winner || iaReflechit) return;
    if (mode === "ia") {
      if (tirsJ1[r][c]) return;
      const newTirs = tirsJ1.map((row) => [...row]);
      newTirs[r][c] = grilleJ2[r][c] === "bateau" ? "touche" : "rate";
      setTirsJ1(newTirs);
      const { total, touches } = compterBateaux(grilleJ2, newTirs);
      if (touches === total) {
        setWinner(1);
        const user = auth.currentUser;
        if (user) enregistrerPartie(user.uid, "bataillenavale", true);
        return;
      }
      setIaReflechit(true);
      const delai = difficulte === "facile" ? 600 : 1000;
      setTimeout(() => {
        const [ir, ic] = difficulte === "expert"
          ? coupIAIntelligent(tirsJ2, grilleJ1)
          : coupIAFacile(tirsJ2);
        const newTirsIA = tirsJ2.map((row) => [...row]);
        newTirsIA[ir][ic] = grilleJ1[ir][ic] === "bateau" ? "touche" : "rate";
        setTirsJ2(newTirsIA);
        const res = compterBateaux(grilleJ1, newTirsIA);
        if (res.touches === res.total) {
          setWinner(2);
          const user = auth.currentUser;
          if (user) enregistrerPartie(user.uid, "bataillenavale", false);
        }
        setIaReflechit(false);
      }, delai);
    } else {
      if (joueur === 1) {
        if (tirsJ1[r][c]) return;
        const newTirs = tirsJ1.map((row) => [...row]);
        newTirs[r][c] = grilleJ2[r][c] === "bateau" ? "touche" : "rate";
        setTirsJ1(newTirs);
        const { total, touches } = compterBateaux(grilleJ2, newTirs);
        if (touches === total) {
          setWinner(1);
          const user = auth.currentUser;
          if (user) enregistrerPartie(user.uid, "bataillenavale", true);
          return;
        }
        setJoueur(2);
      } else {
        if (tirsJ2[r][c]) return;
        const newTirs = tirsJ2.map((row) => [...row]);
        newTirs[r][c] = grilleJ1[r][c] === "bateau" ? "touche" : "rate";
        setTirsJ2(newTirs);
        const { total, touches } = compterBateaux(grilleJ1, newTirs);
        if (touches === total) {
          setWinner(2);
          const user = auth.currentUser;
          if (user) enregistrerPartie(user.uid, "bataillenavale", true);
          return;
        }
        setJoueur(1);
      }
    }
  };

  const grilleAffichee = mode === "ia" ? tirsJ1 : joueur === 1 ? tirsJ1 : tirsJ2;
  const grilleEnnemie = mode === "ia" ? grilleJ2 : joueur === 1 ? grilleJ2 : grilleJ1;

  if (!mode) {
    return (
      <div className="jeu-container">
        <div className="jeu-header">
          <button className="chat-retour" onClick={onRetour}>←</button>
          <h2 className="jeu-titre">🚢 Bataille Navale</h2>
        </div>
        <div className="jeu-mode-selection">
          <p className="jeu-mode-titre">Choisis un mode de jeu</p>
          <button className="jeu-mode-btn" onClick={() => setMode("local")}>
            👥 2 Joueurs
            <span>Jouez à deux sur le même appareil</span>
          </button>
          <button className="jeu-mode-btn" onClick={() => setMode("ia")}>
            🤖 Contre l'IA
            <span>Joue contre l'ordinateur</span>
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
          <h2 className="jeu-titre">🚢 Bataille Navale</h2>
        </div>
        <div className="jeu-mode-selection">
          <p className="jeu-mode-titre">Choisis la difficulté</p>
          <button className="jeu-mode-btn facile" onClick={() => setDifficulte("facile")}>😊 Facile</button>
          <button className="jeu-mode-btn expert" onClick={() => setDifficulte("expert")}>😈 Expert</button>
        </div>
      </div>
    );
  }

  return (
    <div className="jeu-container">
      <div className="jeu-header">
        <button className="chat-retour" onClick={() => { setDifficulte(null); }}>←</button>
        <h2 className="jeu-titre">🚢 Bataille Navale</h2>
        <button className="jeu-btn-regles" onClick={() => setAfficherRegles(!afficherRegles)}>❓</button>
      </div>

      {afficherRegles && (
        <div className="jeu-regles">
          <p><strong>🎯 Objectif :</strong> Coule tous les bateaux ennemis.</p>
          <p><strong>▶️ Comment jouer :</strong> Clique sur une case pour tirer. 💥 = touché, 💧 = raté.</p>
          <p><strong>🚢 Bateaux :</strong> 5 bateaux de tailles 5, 4, 3, 3 et 2.</p>
          {mode === "ia" && <p><strong>🤖 Difficulté :</strong> {difficulte}</p>}
          <button className="jeu-btn-fermer-regles" onClick={() => setAfficherRegles(false)}>Compris !</button>
        </div>
      )}

      <div className="bn-statut">
        {winner
          ? mode === "ia"
            ? winner === 1 ? "🏆 Tu as gagné !" : "🤖 L'IA a gagné !"
            : `🏆 Joueur ${winner} gagne !`
          : iaReflechit ? "🤖 L'IA réfléchit..."
          : mode === "ia" ? "👤 Ton tour — Tire sur la grille !"
          : `Tour du Joueur ${joueur} — Tire !`}
      </div>

      <div className="bn-grille">
        {grilleAffichee.map((row, r) =>
          row.map((cell, c) => (
            <button
              key={`${r}-${c}`}
              className={`bn-case ${cell === "touche" ? "touche" : cell === "rate" ? "rate" : ""}`}
              onClick={() => tirer(r, c)}
              disabled={iaReflechit}
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

      <ChatJeu jeuId="bataillenavale" partieId={partieId.current} modeIA={mode === "ia"} />
    </div>
  );
}

export default BatailleNavale;