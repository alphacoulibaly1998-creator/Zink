import { useState } from "react";
import TicTacToe from "../components/jeux/TicTacToe";
import Puissance4 from "../components/jeux/Puissance4";
import BatailleNavale from "../components/jeux/BatailleNavale";
import CrazyEights from "../components/jeux/CrazyEights";
import FlipChip from "../components/jeux/FlipChip";

const JEUX = [
  {
    id: "tictactoe",
    nom: "Tic Tac Toe",
    icon: "⭕",
    description: "Le classique X et O",
    couleur: "#ff6b6b"
  },
  {
    id: "puissance4",
    nom: "Puissance 4",
    icon: "🔴",
    description: "Aligne 4 jetons pour gagner",
    couleur: "#f59e0b"
  },
  {
    id: "bataillenavale",
    nom: "Bataille Navale",
    icon: "🚢",
    description: "Coule la flotte ennemie",
    couleur: "#3b82f6"
  },
  {
    id: "crazyeights",
    nom: "Crazy Eights",
    icon: "🃏",
    description: "Le jeu de cartes explosif",
    couleur: "#8b5cf6"
  },
  {
    id: "flipchip",
    nom: "Flip Chip",
    icon: "🪙",
    description: "Pile ou face stratégique",
    couleur: "#10b981"
  },
  {
    id: "darkville",
    nom: "Darkville",
    icon: "🌑",
    description: "Aventure dans le noir",
    couleur: "#6b7280",
    bientot: true
  },
  {
    id: "area8",
    nom: "Area 8",
    icon: "👾",
    description: "Conquête de territoire",
    couleur: "#ec4899",
    bientot: true
  },
];

function Jeux() {
  const [jeuActif, setJeuActif] = useState(null);

  const renderJeu = () => {
    switch (jeuActif) {
      case "tictactoe": return <TicTacToe onRetour={() => setJeuActif(null)} />;
      case "puissance4": return <Puissance4 onRetour={() => setJeuActif(null)} />;
      case "bataillenavale": return <BatailleNavale onRetour={() => setJeuActif(null)} />;
      case "crazyeights": return <CrazyEights onRetour={() => setJeuActif(null)} />;
      case "flipchip": return <FlipChip onRetour={() => setJeuActif(null)} />;
      default: return null;
    }
  };

  if (jeuActif) return renderJeu();

  return (
    <div className="jeux-container">
      <h1 className="accueil-titre">🎮 Jeux</h1>
      <p className="jeux-sous-titre">Choisis un jeu et défie tes amis !</p>

      <div className="jeux-liste">
        {JEUX.map((jeu) => (
          <div
            key={jeu.id}
            className={`jeu-card ${jeu.bientot ? "bientot" : ""}`}
            onClick={() => !jeu.bientot && setJeuActif(jeu.id)}
            style={{ "--jeu-couleur": jeu.couleur }}
          >
            <div className="jeu-icon">{jeu.icon}</div>
            <div className="jeu-infos">
              <span className="jeu-nom">{jeu.nom}</span>
              <span className="jeu-desc">{jeu.description}</span>
            </div>
            {jeu.bientot && (
              <span className="jeu-bientot">Bientôt</span>
            )}
            {!jeu.bientot && (
              <span className="jeu-jouer">▶</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Jeux;