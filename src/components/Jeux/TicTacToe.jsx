import { useState, useRef } from "react";
import ChatJeu from "./ChatJeu";
import { enregistrerPartie } from "../../jeuxStats";
import { auth } from "../../firebase";
import { addDoc, collection, serverTimestamp, getDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";

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

const coupAleatoire = (cases) => {
  const vides = cases.map((c, i) => !c ? i : -1).filter(i => i !== -1);
  return vides[Math.floor(Math.random() * vides.length)];
};

const coupNormal = (cases, joueur) => {
  if (Math.random() < 0.4) return coupAleatoire(cases);
  return meilleurCoup(cases, joueur);
};

const meilleurCoup = (cases, joueur) => {
  const adverse = joueur === "X" ? "O" : "X";
  const minimax = (cases, estIA) => {
    const w = gagnant(cases);
    if (w === joueur) return 10;
    if (w === adverse) return -10;
    if (cases.every(Boolean)) return 0;
    const coups = [];
    cases.forEach((c, i) => {
      if (!c) {
        const newCases = [...cases];
        newCases[i] = estIA ? joueur : adverse;
        coups.push(minimax(newCases, !estIA));
      }
    });
    return estIA ? Math.max(...coups) : Math.min(...coups);
  };
  let meilleur = -Infinity;
  let index = -1;
  cases.forEach((c, i) => {
    if (!c) {
      const newCases = [...cases];
      newCases[i] = joueur;
      const score = minimax(newCases, false);
      if (score > meilleur) { meilleur = score; index = i; }
    }
  });
  return index;
};

const MESSAGES_IA = {
  debut: ["C'est parti ! 🎮", "Je suis prêt ! 🤖", "À toi de jouer ! 😏"],
  coup: ["Hmm... 🤔", "Intéressant... 😏", "Bien joué, mais... 🤖", "Je vois ton plan ! 😈"],
  gagne: ["J'ai gagné ! 🤖😂", "Trop facile ! 😈", "Essaie encore ! 🏆", "L'IA domine ! 🤖"],
  perdu: ["Bravo ! Tu m'as battu ! 😱", "Incroyable ! 🎉", "Tu es fort(e) ! 👏"],
  nul: ["Match nul ! On se retrouve ! 🤝", "Égalité ! 😌"],
};

const messageAleatoire = (type) => {
  const msgs = MESSAGES_IA[type];
  return msgs[Math.floor(Math.random() * msgs.length)];
};

function TicTacToe({ onRetour }) {
  const [mode, setMode] = useState(null);
  const [difficulte, setDifficulte] = useState(null);
  const [cases, setCases] = useState(Array(9).fill(null));
  const [joueur, setJoueur] = useState("X");
  const [scores, setScores] = useState({ X: 0, O: 0 });
  const [afficherRegles, setAfficherRegles] = useState(false);
  const [iaReflechit, setIaReflechit] = useState(false);
  const partieId = useRef(Date.now().toString());

  const winner = gagnant(cases);
  const plein = cases.every(Boolean);

  const envoyerMessageIA = async (type) => {
    const user = auth.currentUser;
    if (!user) return;
    const snap = await getDoc(doc(db, "utilisateurs", user.uid));
    const pseudo = snap.exists() ? snap.data().pseudo : "Joueur";
    await addDoc(collection(db, "chatsJeux", `tictactoe_${partieId.current}`, "messages"), {
      userId: "IA",
      pseudo: "🤖 IA",
      texte: messageAleatoire(type),
      createdAt: serverTimestamp()
    });
  };

  const getCoupIA = (cases) => {
    if (difficulte === "facile") return coupAleatoire(cases);
    if (difficulte === "normal") return coupNormal(cases, "O");
    return meilleurCoup(cases, "O");
  };

  const jouer = (i) => {
    if (cases[i] || winner || iaReflechit) return;
    const newCases = [...cases];
    newCases[i] = joueur;
    setCases(newCases);
    const w = gagnant(newCases);
    if (w) {
      setScores((s) => ({ ...s, [w]: s[w] + 1 }));
      const user = auth.currentUser;
      if (user) enregistrerPartie(user.uid, "tictactoe", w === "X");
      if (mode === "ia") envoyerMessageIA(w === "X" ? "perdu" : "gagne");
    } else if (newCases.every(Boolean)) {
      const user = auth.currentUser;
      if (user) enregistrerPartie(user.uid, "tictactoe", false);
      if (mode === "ia") envoyerMessageIA("nul");
    } else {
      const prochainJoueur = joueur === "X" ? "O" : "X";
      setJoueur(prochainJoueur);
      if (mode === "ia" && prochainJoueur === "O") {
        setIaReflechit(true);
        const delai = difficulte === "facile" ? 600 : difficulte === "normal" ? 800 : 1000;
        setTimeout(() => {
          const coupIA = getCoupIA(newCases);
          if (coupIA !== -1) {
            const casesIA = [...newCases];
            casesIA[coupIA] = "O";
            setCases(casesIA);
            const wIA = gagnant(casesIA);
            if (wIA) {
              setScores((s) => ({ ...s, [wIA]: s[wIA] + 1 }));
              const user = auth.currentUser;
              if (user) enregistrerPartie(user.uid, "tictactoe", false);
              envoyerMessageIA("gagne");
            } else if (casesIA.every(Boolean)) {
              const user = auth.currentUser;
              if (user) enregistrerPartie(user.uid, "tictactoe", false);
              envoyerMessageIA("nul");
            } else {
              setJoueur("X");
              if (Math.random() < 0.3) envoyerMessageIA("coup");
            }
          }
          setIaReflechit(false);
        }, delai);
      }
    }
  };

  const rejouer = () => {
    setCases(Array(9).fill(null));
    setJoueur("X");
    partieId.current = Date.now().toString();
  };

  if (!mode) {
    return (
      <div className="jeu-container">
        <div className="jeu-header">
          <button className="chat-retour" onClick={onRetour}>←</button>
          <h2 className="jeu-titre">⭕ Tic Tac Toe</h2>
        </div>
        <div className="jeu-mode-selection">
          <p className="jeu-mode-titre">Choisis un mode de jeu</p>
          <button className="jeu-mode-btn" onClick={() => { setMode("local"); setDifficulte(null); }}>
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
          <h2 className="jeu-titre">⭕ Tic Tac Toe</h2>
        </div>
        <div className="jeu-mode-selection">
          <p className="jeu-mode-titre">Choisis la difficulté</p>
         <button className="jeu-mode-btn facile" onClick={() => { setCases(Array(9).fill(null)); setJoueur("X"); partieId.current = Date.now().toString(); setDifficulte("facile"); envoyerMessageIA("debut"); }}>
            😊 Facile
          </button>
          <button className="jeu-mode-btn normal" onClick={() => { setCases(Array(9).fill(null)); setJoueur("X"); partieId.current = Date.now().toString(); setDifficulte("normal"); envoyerMessageIA("debut"); }}>
            😐 Normal
          </button>
          <button className="jeu-mode-btn expert" onClick={() => { setCases(Array(9).fill(null)); setJoueur("X"); partieId.current = Date.now().toString(); setDifficulte("expert"); envoyerMessageIA("debut"); }}>
            😈 Expert
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="jeu-container">
      <div className="jeu-header">
        <button className="chat-retour" onClick={() => setDifficulte(null)}>←</button>
        <h2 className="jeu-titre">⭕ Tic Tac Toe</h2>
        <button className="jeu-btn-regles" onClick={() => setAfficherRegles(!afficherRegles)}>❓</button>
      </div>

      {afficherRegles && (
        <div className="jeu-regles">
          <p><strong>🎯 Objectif :</strong> Aligne 3 symboles en ligne, colonne ou diagonale.</p>
          <p><strong>👤 Tu joues :</strong> {mode === "ia" ? "X (tu commences)" : "X et O à tour de rôle"}</p>
          <p><strong>▶️ Comment jouer :</strong> Clique sur une case vide.</p>
          {mode === "ia" && <p><strong>🤖 Difficulté :</strong> {difficulte}</p>}
          <button className="jeu-btn-fermer-regles" onClick={() => setAfficherRegles(false)}>Compris !</button>
        </div>
      )}

      <div className="jeu-scores">
        <div className={`score-card ${joueur === "X" && !winner ? "actif" : ""}`}>
          <span className="score-joueur">{mode === "ia" ? "👤 Toi" : "Joueur X"}</span>
          <span className="score-pts">{scores.X}</span>
        </div>
        <div className="score-vs">VS</div>
        <div className={`score-card ${joueur === "O" && !winner ? "actif" : ""}`}>
          <span className="score-joueur">{mode === "ia" ? `🤖 IA (${difficulte})` : "Joueur O"}</span>
          <span className="score-pts">{scores.O}</span>
        </div>
      </div>

      <div className="ttt-statut">
        {winner
          ? mode === "ia"
            ? winner === "X" ? "🏆 Tu as gagné !" : "🤖 L'IA a gagné !"
            : `🏆 Joueur ${winner} gagne !`
          : plein ? "Match nul !"
          : iaReflechit ? "🤖 L'IA réfléchit..."
          : mode === "ia" ? "👤 Ton tour"
          : `Tour du joueur ${joueur}`}
      </div>

      <div className="ttt-grille">
        {cases.map((c, i) => (
          <button
            key={i}
            className={`ttt-case ${c === "X" ? "x" : c === "O" ? "o" : ""} ${winner ? "fini" : ""}`}
            onClick={() => jouer(i)}
            disabled={iaReflechit || (mode === "ia" && joueur === "O")}
          >
            {c}
          </button>
        ))}
      </div>

      {(winner || plein) && (
        <button className="auth-btn" onClick={rejouer}>🔄 Rejouer</button>
      )}

      <ChatJeu jeuId="tictactoe" partieId={partieId.current} modeIA={mode === "ia"} />
    </div>
  );
}

export default TicTacToe;