import { useState, useRef } from "react";
import ChatJeu from "./ChatJeu";
import { enregistrerPartie } from "../../jeuxStats";
import { auth } from "../../firebase";
import { useTranslation } from "react-i18next";

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

const choisirCoupIA = (grille, couleur, difficulte) => {
  const casesVides = [];
  for (let r = 0; r < TAILLE; r++)
    for (let c = 0; c < TAILLE; c++)
      if (!grille[r][c]) casesVides.push([r, c]);

  if (difficulte === "facile") {
    return casesVides[Math.floor(Math.random() * casesVides.length)];
  }

  let meilleur = -1;
  let meilleurCoup = casesVides[0];
  for (let [r, c] of casesVides) {
    const testGrille = retourner(grille, r, c, couleur);
    const score = compter(testGrille, couleur) - compter(grille, couleur);
    if (score > meilleur) {
      meilleur = score;
      meilleurCoup = [r, c];
    }
  }
  return meilleurCoup;
};

function FlipChip({ onRetour }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState(null);
  const [difficulte, setDifficulte] = useState(null);
  const [grille, setGrille] = useState(creerGrille());
  const [joueur, setJoueur] = useState("noir");
  const [scores, setScores] = useState({ noir: 0, blanc: 0 });
  const [winner, setWinner] = useState(null);
  const [afficherRegles, setAfficherRegles] = useState(false);
  const [iaReflechit, setIaReflechit] = useState(false);
  const partieId = useRef(Date.now().toString());

  const rejouer = () => {
    setGrille(creerGrille());
    setJoueur("noir");
    setWinner(null);
    partieId.current = Date.now().toString();
  };

  const jouer = (r, c) => {
    if (winner || grille[r][c] || iaReflechit) return;
    if (mode === "ia" && joueur === "blanc") return;
    const newGrille = retourner(grille, r, c, joueur);
    setGrille(newGrille);
    const noirCount = compter(newGrille, "noir");
    const blancCount = compter(newGrille, "blanc");
    const vide = TAILLE * TAILLE - noirCount - blancCount;

    if (vide === 0) {
      const w = noirCount > blancCount ? "noir" : blancCount > noirCount ? "blanc" : "egalite";
      setWinner(w);
      if (w !== "egalite") {
        setScores((s) => ({ ...s, [w]: s[w] + 1 }));
        const user = auth.currentUser;
        if (user) enregistrerPartie(user.uid, "flipchip", mode === "ia" ? w === "noir" : true);
      }
    } else {
      const prochain = joueur === "noir" ? "blanc" : "noir";
      setJoueur(prochain);
      if (mode === "ia" && prochain === "blanc") {
        setIaReflechit(true);
        setTimeout(() => {
          const coup = choisirCoupIA(newGrille, "blanc", difficulte);
          if (coup) {
            const grilleIA = retourner(newGrille, coup[0], coup[1], "blanc");
            setGrille(grilleIA);
            const nc = compter(grilleIA, "noir");
            const bc = compter(grilleIA, "blanc");
            const v = TAILLE * TAILLE - nc - bc;
            if (v === 0) {
              const w = nc > bc ? "noir" : bc > nc ? "blanc" : "egalite";
              setWinner(w);
              if (w !== "egalite") {
                setScores((s) => ({ ...s, [w]: s[w] + 1 }));
                const user = auth.currentUser;
                if (user) enregistrerPartie(user.uid, "flipchip", w === "noir");
              }
            } else {
              setJoueur("noir");
            }
          } else {
            setJoueur("noir");
          }
          setIaReflechit(false);
        }, difficulte === "facile" ? 500 : 800);
      }
    }
  };

  if (!mode) {
    return (
      <div className="jeu-container">
        <div className="jeu-header">
          <button className="chat-retour" onClick={onRetour}>←</button>
          <h2 className="jeu-titre">{t("flipChip.titre")}</h2>
        </div>
        <div className="jeu-mode-selection">
          <p className="jeu-mode-titre">{t("flipChip.choisirMode")}</p>
          <button className="jeu-mode-btn" onClick={() => { setMode("local"); rejouer(); setScores({ noir: 0, blanc: 0 }); }}>
            {t("flipChip.deuxJoueurs")}
            <span>{t("flipChip.deuxJoueursDesc")}</span>
          </button>
          <button className="jeu-mode-btn" onClick={() => setMode("ia")}>
            {t("flipChip.contreIA")}
            <span>{t("flipChip.contreIADesc")}</span>
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
          <h2 className="jeu-titre">{t("flipChip.titre")}</h2>
        </div>
        <div className="jeu-mode-selection">
          <p className="jeu-mode-titre">{t("flipChip.choisirDifficulte")}</p>
          <button className="jeu-mode-btn facile" onClick={() => { rejouer(); setScores({ noir: 0, blanc: 0 }); setDifficulte("facile"); }}>{t("flipChip.facile")}</button>
          <button className="jeu-mode-btn expert" onClick={() => { rejouer(); setScores({ noir: 0, blanc: 0 }); setDifficulte("expert"); }}>{t("flipChip.expert")}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="jeu-container">
      <div className="jeu-header">
        <button className="chat-retour" onClick={() => { mode === "local" ? setMode(null) : setDifficulte(null); rejouer(); }}>←</button>
        <h2 className="jeu-titre">{t("flipChip.titre")}</h2>
        <button className="jeu-btn-regles" onClick={() => setAfficherRegles(!afficherRegles)}>❓</button>
      </div>

      {afficherRegles && (
        <div className="jeu-regles">
          <p><strong>{t("flipChip.objectifTitre")}</strong> {t("flipChip.objectifTexte")}</p>
          <p><strong>{t("flipChip.commentJouerTitre")}</strong> {t("flipChip.commentJouerTexte")}</p>
          <p><strong>{t("flipChip.retournementTitre")}</strong> {t("flipChip.retournementTexte")}</p>
          {mode === "ia" && <p><strong>{t("flipChip.difficulteTitre")}</strong> {t(`flipChip.${difficulte}`)}</p>}
          <button className="jeu-btn-fermer-regles" onClick={() => setAfficherRegles(false)}>{t("flipChip.compris")}</button>
        </div>
      )}

      <div className="jeu-scores">
        <div className={`score-card ${joueur === "noir" && !winner ? "actif" : ""}`}>
          <span className="score-joueur">{mode === "ia" ? t("flipChip.toi") : t("flipChip.noir")}</span>
          <span className="score-pts">{scores.noir} — {compter(grille, "noir")}</span>
        </div>
        <div className="score-vs">VS</div>
        <div className={`score-card ${joueur === "blanc" && !winner ? "actif" : ""}`}>
          <span className="score-joueur">{mode === "ia" ? t("flipChip.iaAvecDifficulte", { difficulte: t(`flipChip.${difficulte}`) }) : t("flipChip.blanc")}</span>
          <span className="score-pts">{scores.blanc} — {compter(grille, "blanc")}</span>
        </div>
      </div>

      <div className="fc-statut">
        {winner
          ? winner === "egalite" ? t("flipChip.matchNul")
          : mode === "ia"
            ? winner === "noir" ? t("flipChip.tuGagnes") : t("flipChip.iaGagne")
            : t("flipChip.joueurGagne", { couleur: winner === "noir" ? t("flipChip.noir") : t("flipChip.blanc") })
          : iaReflechit ? t("flipChip.iaReflechit")
          : mode === "ia" ? t("flipChip.tonTour")
          : t("flipChip.tourDe", { couleur: joueur === "noir" ? t("flipChip.noir") : t("flipChip.blanc") })}
      </div>

      <div className="fc-grille">
        {grille.map((row, r) =>
          row.map((cell, c) => (
            <button
              key={`${r}-${c}`}
              className={`fc-case ${cell === "noir" ? "noir" : cell === "blanc" ? "blanc" : "vide"}`}
              onClick={() => jouer(r, c)}
              disabled={iaReflechit}
            >
              {cell === "noir" ? "⚫" : cell === "blanc" ? "⚪" : ""}
            </button>
          ))
        )}
      </div>

      {winner && (
        <button className="auth-btn" onClick={rejouer}>{t("flipChip.rejouer")}</button>
      )}

      <ChatJeu jeuId="flipchip" partieId={partieId.current} modeIA={mode === "ia"} />
    </div>
  );
}

export default FlipChip;