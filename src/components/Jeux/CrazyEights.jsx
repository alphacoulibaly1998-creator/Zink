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

const choisirCoupIA = (main, dessus, difficulte) => {
  const jouables = main.map((c, i) => carteCompatible(c, dessus) ? i : -1).filter(i => i !== -1);
  if (jouables.length === 0) return -1;
  if (difficulte === "facile") {
    return jouables[Math.floor(Math.random() * jouables.length)];
  }
  const non8 = jouables.filter(i => main[i].valeur !== "8");
  if (non8.length > 0) return non8[Math.floor(Math.random() * non8.length)];
  return jouables[0];
};

function CrazyEights({ onRetour }) {
  const [mode, setMode] = useState(null);
  const [difficulte, setDifficulte] = useState(null);
  const [jeu, setJeu] = useState(creerJeu());
  const [mainJ1, setMainJ1] = useState([]);
  const [mainJ2, setMainJ2] = useState([]);
  const [pile, setPile] = useState([]);
  const [joueur, setJoueur] = useState(1);
  const [winner, setWinner] = useState(null);
  const [demarre, setDemarre] = useState(false);
  const [afficherRegles, setAfficherRegles] = useState(false);
  const [iaReflechit, setIaReflechit] = useState(false);
  const partieId = useRef(Date.now().toString());

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
    partieId.current = Date.now().toString();
  };

  const jouerIA = (mJ2, p, j) => {
    setIaReflechit(true);
    setTimeout(() => {
      const index = choisirCoupIA(mJ2, p[p.length - 1], difficulte);
      if (index === -1) {
        if (j.length === 0) {
          setIaReflechit(false);
          setJoueur(1);
          return;
        }
        const nouvJ = [...j];
        const carte = nouvJ.shift();
        setMainJ2([...mJ2, carte]);
        setJeu(nouvJ);
        setIaReflechit(false);
        setJoueur(1);
        return;
      }
      const main = [...mJ2];
      const carte = main[index];
      main.splice(index, 1);
      const nouvPile = [...p, carte];
      setMainJ2(main);
      setPile(nouvPile);
      if (main.length === 0) {
        setWinner(2);
        const user = auth.currentUser;
        if (user) enregistrerPartie(user.uid, "crazyeights", false);
      } else {
        setJoueur(1);
      }
      setIaReflechit(false);
    }, difficulte === "facile" ? 700 : 1000);
  };

  const jouerCarte = (index) => {
    if (winner || iaReflechit || (mode === "ia" && joueur === 2)) return;
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
        setPile(nouvPile);
        return;
      }
    } else {
      setMainJ2(main);
      if (main.length === 0) {
        setWinner(2);
        const user = auth.currentUser;
        if (user) enregistrerPartie(user.uid, "crazyeights", true);
        setPile(nouvPile);
        return;
      }
    }
    setPile(nouvPile);
    const prochain = joueur === 1 ? 2 : 1;
    setJoueur(prochain);
    if (mode === "ia" && prochain === 2) {
      jouerIA(main, nouvPile, jeu);
    }
  };

  const piocher = () => {
    if (jeu.length === 0 || iaReflechit) return;
    const nouvJeu = [...jeu];
    const carte = nouvJeu.shift();
    if (joueur === 1) setMainJ1([...mainJ1, carte]);
    else setMainJ2([...mainJ2, carte]);
    setJeu(nouvJeu);
    const prochain = joueur === 1 ? 2 : 1;
    setJoueur(prochain);
    if (mode === "ia" && prochain === 2) {
      jouerIA(mainJ2, pile, nouvJeu);
    }
  };

  const main = joueur === 1 ? mainJ1 : mainJ2;
  const dessus = pile[pile.length - 1];

  const couleurCarte = (c) => {
    return c.couleur === "♥" || c.couleur === "♦" ? "rouge" : "noir";
  };

  if (!mode) {
    return (
      <div className="jeu-container">
        <div className="jeu-header">
          <button className="chat-retour" onClick={onRetour}>←</button>
          <h2 className="jeu-titre">🃏 Crazy Eights</h2>
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
          <h2 className="jeu-titre">🃏 Crazy Eights</h2>
        </div>
        <div className="jeu-mode-selection">
          <p className="jeu-mode-titre">Choisis la difficulté</p>
          <button className="jeu-mode-btn facile" onClick={() => setDifficulte("facile")}>😊 Facile</button>
          <button className="jeu-mode-btn expert" onClick={() => setDifficulte("expert")}>😈 Expert</button>
        </div>
      </div>
    );
  }

  if (!demarre) {
    return (
      <div className="jeu-container">
        <div className="jeu-header">
          <button className="chat-retour" onClick={() => { setDifficulte(null); }}>←</button>
          <h2 className="jeu-titre">🃏 Crazy Eights</h2>
        </div>
        <div className="feed-vide">
          <p>Pose tes cartes avant l'adversaire !</p>
          <p>Les 8 sont des jokers 🃏</p>
        </div>
        <button className="auth-btn" onClick={demarrer}>🎮 Commencer</button>
        <ChatJeu jeuId="crazyeights" partieId={partieId.current} modeIA={mode === "ia"} />
      </div>
    );
  }

  return (
    <div className="jeu-container">
      <div className="jeu-header">
        <button className="chat-retour" onClick={() => setDemarre(false)}>←</button>
        <h2 className="jeu-titre">🃏 Crazy Eights</h2>
        <button className="jeu-btn-regles" onClick={() => setAfficherRegles(!afficherRegles)}>❓</button>
      </div>

      {afficherRegles && (
        <div className="jeu-regles">
          <p><strong>🎯 Objectif :</strong> Être le premier à se débarrasser de toutes ses cartes.</p>
          <p><strong>▶️ Comment jouer :</strong> Pose une carte de même couleur ou valeur que la carte du dessus.</p>
          <p><strong>🃏 Les 8 :</strong> Jokers, jouables n'importe quand !</p>
          <button className="jeu-btn-fermer-regles" onClick={() => setAfficherRegles(false)}>Compris !</button>
        </div>
      )}

      <div className="ce-statut">
        {winner
          ? mode === "ia"
            ? winner === 1 ? "🏆 Tu as gagné !" : "🤖 L'IA a gagné !"
            : `🏆 Joueur ${winner} gagne !`
          : iaReflechit ? "🤖 L'IA réfléchit..."
          : mode === "ia" ? `👤 Ton tour — ${main.length} cartes`
          : `Tour du Joueur ${joueur} — ${main.length} cartes`}
      </div>

      <div className="ce-centre">
        <div className="ce-pioche" onClick={piocher}>🂠 Piocher</div>
        {dessus && (
          <div className={`ce-carte ce-dessus ${couleurCarte(dessus)}`}>
            <span>{dessus.valeur}</span>
            <span>{dessus.couleur}</span>
          </div>
        )}
      </div>

      <div className="ce-main">
        {(mode === "ia" && joueur === 2 ? [] : main).map((c, i) => (
          <button
            key={i}
            className={`ce-carte ${couleurCarte(c)}`}
            onClick={() => jouerCarte(i)}
            disabled={iaReflechit || (mode === "ia" && joueur === 2)}
          >
            <span>{c.valeur}</span>
            <span>{c.couleur}</span>
          </button>
        ))}
        {mode === "ia" && joueur === 2 && (
          <p style={{ color: "#888", fontSize: "13px", textAlign: "center", width: "100%" }}>
            🤖 L'IA a {main.length} carte{main.length > 1 ? "s" : ""}...
          </p>
        )}
      </div>

      {winner && (
        <button className="auth-btn" onClick={demarrer}>🔄 Rejouer</button>
      )}

      <ChatJeu jeuId="crazyeights" partieId={partieId.current} modeIA={mode === "ia"} />
    </div>
  );
}

export default CrazyEights;