import { useState, useRef } from "react";
import ChatJeu from "./ChatJeu";
import { enregistrerPartie } from "../../jeuxStats";
import { auth } from "../../firebase";

const COULEURS = ["♠", "♥", "♦", "♣"];
const VALEURS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];

const creerJeu = () => {
  const jeu = [];
  for (let c of COULEURS) {
    for (let v of VALEURS) {
      jeu.push({ couleur: c, valeur: v });
    }
  }
  return jeu.sort(() => Math.random() - 0.5);
};

const carteCompatible = (carte, dessus) => {
  return carte.valeur === "8" ||
    carte.couleur === dessus.couleur ||
    carte.valeur === dessus.valeur;
};

function CrazyEights({ onRetour }) {
  const [jeu, setJeu] = useState(creerJeu());
  const partieId = useRef(Date.now().toString());
  const [mainJ1, setMainJ1] = useState([]);
  const [mainJ2, setMainJ2] = useState([]);
  const [pile, setPile] = useState([]);
  const [joueur, setJoueur] = useState(1);
  const [winner, setWinner] = useState(null);
  const [demarre, setDemarre] = useState(false);

  const demarrer = () => {
    const nouvJeu = creerJeu();
    const j1 = nouvJeu.splice(0, 7);
    const j2 = nouvJeu.splice(0, 7);
    const premiere = nouvJeu.splice(0, 1);
    setMainJ1(j1);
    setMainJ2(j2);
    setPile(premiere);
    setJeu(nouvJeu);
    setJoueur(1);
    setWinner(null);
    setDemarre(true);
  };

  const jouerCarte = (index) => {
    if (winner) return;
    const main = joueur === 1 ? [...mainJ1] : [...mainJ2];
    const carte = main[index];
    const dessus = pile[pile.length - 1];

    if (!carteCompatible(carte, dessus)) {
      alert("Cette carte n'est pas compatible !");
      return;
    }

    main.splice(index, 1);
    const nouvPile = [...pile, carte];

    if (joueur === 1) {
      setMainJ1(main);
      if (main.length === 0) {
        setWinner(1);
        const user = auth.currentUser;
        if (user) enregistrerPartie(user.uid, "crazyeights", true);
        return;
      }
    } else {
      setMainJ2(main);
      if (main.length === 0) {
        setWinner(2);
        const user = auth.currentUser;
        if (user) enregistrerPartie(user.uid, "crazyeights", true);
        return;
      }
    }

    setPile(nouvPile);
    setJoueur(joueur === 1 ? 2 : 1);
  };

  const piocher = () => {
    if (jeu.length === 0) return;
    const nouvJeu = [...jeu];
    const carte = nouvJeu.shift();
    if (joueur === 1) setMainJ1([...mainJ1, carte]);
    else setMainJ2([...mainJ2, carte]);
    setJeu(nouvJeu);
    setJoueur(joueur === 1 ? 2 : 1);
  };

  const main = joueur === 1 ? mainJ1 : mainJ2;
  const dessus = pile[pile.length - 1];

  const couleurCarte = (c) => {
    return c.couleur === "♥" || c.couleur === "♦" ? "rouge" : "noir";
  };

  if (!demarre) {
    return (
      <div className="jeu-container">
        <div className="jeu-header">
          <button className="chat-retour" onClick={onRetour}>←</button>
          <h2 className="jeu-titre">🃏 Crazy Eights</h2>
        </div>
        <div className="feed-vide">
          <p>Jeu de cartes pour 2 joueurs</p>
          <p>Pose tes cartes avant l'adversaire !</p>
          <p>Les 8 sont des jokers 🃏</p>
        </div>
        <button className="auth-btn" onClick={demarrer}>
          🎮 Commencer
        </button>
        <ChatJeu jeuId="crazyeights" />
      </div>
    );
  }

  return (
    <div className="jeu-container">
      <div className="jeu-header">
        <button className="chat-retour" onClick={onRetour}>←</button>
        <h2 className="jeu-titre">🃏 Crazy Eights</h2>
      </div>

      <div className="ce-statut">
        {winner
          ? `🏆 Joueur ${winner} gagne !`
          : `Tour du Joueur ${joueur} — ${main.length} cartes`}
      </div>

      <div className="ce-centre">
        <div className="ce-pioche" onClick={piocher}>
          🂠 Piocher
        </div>
        {dessus && (
          <div className={`ce-carte ce-dessus ${couleurCarte(dessus)}`}>
            <span>{dessus.valeur}</span>
            <span>{dessus.couleur}</span>
          </div>
        )}
      </div>

      <div className="ce-main">
        {main.map((c, i) => (
          <button
            key={i}
            className={`ce-carte ${couleurCarte(c)}`}
            onClick={() => jouerCarte(i)}
          >
            <span>{c.valeur}</span>
            <span>{c.couleur}</span>
          </button>
        ))}
      </div>

      {winner && (
        <button className="auth-btn" onClick={demarrer}>
          🔄 Rejouer
        </button>
      )}

      <ChatJeu jeuId="crazyeights" partieId={partieId.current} />
    </div>
  );
}

export default CrazyEights;