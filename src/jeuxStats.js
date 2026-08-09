import { db } from "./firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";

export const BADGES_INFO = {
  premiere_victoire: { nomKey: "badges.premiereVictoireNom", icon: "🥇", descKey: "badges.premiereVictoireDesc" },
  serie_3: { nomKey: "badges.serie3Nom", icon: "🔥", descKey: "badges.serie3Desc" },
  serie_6: { nomKey: "badges.serie6Nom", icon: "🔥🔥", descKey: "badges.serie6Desc" },
  serie_10: { nomKey: "badges.serie10Nom", icon: "🔥🔥🔥", descKey: "badges.serie10Desc" },
  joueur_assidu: { nomKey: "badges.joueurAssiduNom", icon: "🎮", descKey: "badges.joueurAssiduDesc" },
  champion: { nomKey: "badges.championNom", icon: "👑", descKey: "badges.championDesc" },
  maitre_jeu: { nomKey: "badges.maitreJeuNom", icon: "🏆", descKey: "badges.maitreJeuDesc" },
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