import { db } from "./firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";

export const BADGES_INFO = {
  premiere_victoire: { nom: "Premier gagnant", icon: "🥇", description: "Remporte ta première partie" },
  serie_3: { nom: "Série de 3", icon: "🔥", description: "Gagne 3 parties d'affilée" },
  serie_6: { nom: "Série de 6", icon: "🔥🔥", description: "Gagne 6 parties d'affilée" },
  serie_10: { nom: "Série de 10", icon: "🔥🔥🔥", description: "Gagne 10 parties d'affilée" },
  joueur_assidu: { nom: "Joueur assidu", icon: "🎮", description: "Joue 10 parties" },
  champion: { nom: "Champion", icon: "👑", description: "Atteins 50 points" },
  maitre_jeu: { nom: "Maître du jeu", icon: "🏆", description: "Gagne 5 fois au même jeu" },
};

export const enregistrerPartie = async (userId, jeuId, aGagne) => {
  try {
    const ref = doc(db, "utilisateurs", userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const data = snap.data();
    const points = data.points || 0;
    const badges = data.badges || [];
    const statsJeux = data.statsJeux || {};
    const serieActuelle = data.serieVictoires || 0;
    const partiesJouees = (data.partiesJouees || 0) + 1;

    const statsJeu = statsJeux[jeuId] || { victoires: 0, parties: 0 };
    statsJeu.parties += 1;
    if (aGagne) statsJeu.victoires += 1;
    statsJeux[jeuId] = statsJeu;

    let nouveauxPoints = points + 2;
    let nouvelleSerie = 0;

    if (aGagne) {
      nouveauxPoints += 10;
      nouvelleSerie = serieActuelle + 1;
    }

    const nouveauxBadges = [...badges];

    if (aGagne && statsJeu.victoires === 1 && !nouveauxBadges.includes("premiere_victoire")) {
      nouveauxBadges.push("premiere_victoire");
    }
    if (nouvelleSerie >= 3 && !nouveauxBadges.includes("serie_3")) {
      nouveauxBadges.push("serie_3");
    }
    if (nouvelleSerie >= 6 && !nouveauxBadges.includes("serie_6")) {
      nouveauxBadges.push("serie_6");
    }
    if (nouvelleSerie >= 10 && !nouveauxBadges.includes("serie_10")) {
      nouveauxBadges.push("serie_10");
    }
    if (partiesJouees >= 10 && !nouveauxBadges.includes("joueur_assidu")) {
      nouveauxBadges.push("joueur_assidu");
    }
    if (nouveauxPoints >= 50 && !nouveauxBadges.includes("champion")) {
      nouveauxBadges.push("champion");
    }
    if (statsJeu.victoires >= 5 && !nouveauxBadges.includes("maitre_jeu")) {
      nouveauxBadges.push("maitre_jeu");
    }

    await updateDoc(ref, {
      points: nouveauxPoints,
      badges: nouveauxBadges,
      statsJeux,
      serieVictoires: nouvelleSerie,
      partiesJouees
    });

    const nouveauxBadgesObtenus = nouveauxBadges.filter((b) => !badges.includes(b));
    return { nouveauxPoints, nouveauxBadgesObtenus };
  } catch (e) {
    console.error("Erreur enregistrement partie:", e);
    return null;
  }
};