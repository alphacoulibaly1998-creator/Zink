import { useState, useRef } from "react";
import ChatJeu from "./ChatJeu";
import { enregistrerPartie } from "../../jeuxStats";
import { auth } from "../../firebase";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const [mode, setMode] = useState(null);
  const [difficulte, setDifficulte] = useState(null);
  const [grilleJ1, setGrilleJ1] = useState(placerBateauxAuto());
  const [grilleJ2, setGrilleJ2] = useState(placerBateauxAuto());
  const [tirsJ1, setTirsJ1] = useState(creerGrille());
  const [tirsJ2, setTirsJ2] = useState(creerGrille());
  const [joueur, setJoueur] = useState(1);
  const [winner, setWinner] = useState(null);
  const [afficherRegles, setAfficherRegles] = useState(false);
  const [iaReflechit, setIaReflechit] = useState(false);
  const partieId = useRef(Date.now().toString());

  const reinitialiser = () => {
    setGrilleJ1(placerBateauxAuto());
    setGrilleJ2(placerBateauxAuto());
    setTirsJ1(creerGrille());
    setTirsJ2(creerGrille());
    setJoueur(1);
    setWinner(null);
    partieId.current = Date.now().toString();
  };

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

  if (!difficulte) {
    return (
      <div className="jeu-container">
        <div className="jeu-header">
          <button className="chat-retour" onClick={onRetour}>←</button>
          <h2 className="jeu-titre">{t("batailleNavale.titre")}</h2>
        </div>
        <div className="jeu-mode-selection">
          <p className="jeu-mode-titre">{t("batailleNavale.choisirDifficulte")}</p>
          <button className="jeu-mode-btn facile" onClick={() => { setMode("ia"); reinitialiser(); setDifficulte("facile"); }}>{t("batailleNavale.facile")}</button>
          <button className="jeu-mode-btn expert" onClick={() => { setMode("ia"); reinitialiser(); setDifficulte("expert"); }}>{t("batailleNavale.expert")}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="jeu-container">
      <div className="jeu-header">
        <button className="chat-retour" onClick={() => { setDifficulte(null); reinitialiser(); }}>←</button>
        <h2 className="jeu-titre">{t("batailleNavale.titre")}</h2>
        <button className="jeu-btn-regles" onClick={() => setAfficherRegles(!afficherRegles)}>❓</button>
      </div>

      {afficherRegles && (
        <div className="jeu-regles">
          <p><strong>{t("batailleNavale.objectifTitre")}</strong> {t("batailleNavale.objectifTexte")}</p>
          <p><strong>{t("batailleNavale.commentJouerTitre")}</strong> {t("batailleNavale.commentJouerTexte")}</p>
          <p><strong>{t("batailleNavale.bateauxTitre")}</strong> {t("batailleNavale.bateauxTexte")}</p>
          <p><strong>{t("batailleNavale.difficulteTitre")}</strong> {t(`batailleNavale.${difficulte}`)}</p>
          <button className="jeu-btn-fermer-regles" onClick={() => setAfficherRegles(false)}>{t("batailleNavale.compris")}</button>
        </div>
      )}

      <div className="bn-statut">
        {winner
          ? winner === 1 ? t("batailleNavale.tuGagnes") : t("batailleNavale.iaGagne")
          : iaReflechit ? t("batailleNavale.iaReflechit")
          : t("batailleNavale.tonTour")}
      </div>

      <p className="jeu-mode-titre">{t("batailleNavale.taFlotte")}</p>
      <div className="bn-grille bn-grille-defense">
        {grilleJ1.map((row, r) =>
          row.map((cell, c) => {
            const tir = tirsJ2[r][c];
            return (
              <button
                key={`def-${r}-${c}`}
                className={`bn-case ${tir === "touche" ? "touche" : tir === "rate" ? "rate" : ""}`}
                disabled
              >
                {tir === "touche" ? "💥" : tir === "rate" ? "💧" : cell === "bateau" ? "🚢" : ""}
              </button>
            );
          })
        )}
      </div>

      <p className="jeu-mode-titre">{t("batailleNavale.zoneEnnemie")}</p>
      <div className="bn-grille">
        {grilleAffichee.map((row, r) =>
          row.map((cell, c) => (
            <button
              key={`att-${r}-${c}`}
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
        <button className="auth-btn" onClick={reinitialiser}>
          {t("batailleNavale.rejouer")}
        </button>
      )}

      <ChatJeu jeuId="bataillenavale" partieId={partieId.current} modeIA={mode === "ia"} />
    </div>
  );
}

export default BatailleNavale;