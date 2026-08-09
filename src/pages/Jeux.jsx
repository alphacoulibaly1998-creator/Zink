import { useState } from "react";
import TicTacToe from "../components/Jeux/TicTacToe";
import Puissance4 from "../components/Jeux/Puissance4";
import BatailleNavale from "../components/Jeux/BatailleNavale";
import CrazyEights from "../components/Jeux/CrazyEights";
import FlipChip from "../components/Jeux/FlipChip";
import { useTranslation } from "react-i18next";

const JEUX = [
  {
    id: "tictactoe",
    nomKey: "jeux.ticTacToeNom",
    icon: "⭕",
    descKey: "jeux.ticTacToeDesc",
    couleur: "#ff6b6b"
  },
  {
    id: "puissance4",
    nomKey: "jeux.puissance4Nom",
    icon: "🔴",
    descKey: "jeux.puissance4Desc",
    couleur: "#f59e0b"
  },
  {
    id: "bataillenavale",
    nomKey: "jeux.batailleNavaleNom",
    icon: "🚢",
    descKey: "jeux.batailleNavaleDesc",
    couleur: "#3b82f6"
  },
  {
    id: "crazyeights",
    nomKey: "jeux.crazyEightsNom",
    icon: "🃏",
    descKey: "jeux.crazyEightsDesc",
    couleur: "#8b5cf6"
  },
  {
    id: "flipchip",
    nomKey: "jeux.flipChipNom",
    icon: "🪙",
    descKey: "jeux.flipChipDesc",
    couleur: "#10b981"
  },
  {
    id: "darkville",
    nomKey: "jeux.darkvilleNom",
    icon: "🌑",
    descKey: "jeux.darkvilleDesc",
    couleur: "#6b7280",
    bientot: true
  },
  {
    id: "area8",
    nomKey: "jeux.area8Nom",
    icon: "👾",
    descKey: "jeux.area8Desc",
    couleur: "#ec4899",
    bientot: true
  },
];

function Jeux() {
  const { t } = useTranslation();
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
      <h1 className="accueil-titre">{t("jeux.titre")}</h1>
      <p className="jeux-sous-titre">{t("jeux.sousTitre")}</p>

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
              <span className="jeu-nom">{t(jeu.nomKey)}</span>
              <span className="jeu-desc">{t(jeu.descKey)}</span>
            </div>
            {jeu.bientot && (
              <span className="jeu-bientot">{t("jeux.bientot")}</span>
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