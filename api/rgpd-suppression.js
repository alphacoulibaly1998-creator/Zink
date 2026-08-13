import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

const db = getFirestore();
const auth = getAuth();
const EMAIL_ADMIN = "alphacoulibaly1998@gmail.com";

const verifierAdmin = async (idToken) => {
  if (!idToken) return false;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    return decoded.email === EMAIL_ADMIN;
  } catch (e) {
    return false;
  }
};

const trouverUtilisateur = async (email) => {
  const snap = await db.collection("utilisateurs").where("email", "==", email).limit(1).get();
  if (snap.empty) return null;
  return { docId: snap.docs[0].id, data: snap.docs[0].data() };
};

const compterDonnees = async (uid) => {
  const [pubsSnap, commentairesSnap, messagesSnap] = await Promise.all([
    db.collection("publications").where("userId", "==", uid).get(),
    db.collectionGroup("commentaires").where("userId", "==", uid).get(),
    db.collectionGroup("messages").where("userId", "==", uid).get(),
  ]);
  return {
    publications: pubsSnap.size,
    commentaires: commentairesSnap.size,
    messages: messagesSnap.size,
  };
};

const supprimerToutesLesDonnees = async (uid, docId) => {
  const [pubsSnap, commentairesSnap, messagesSnap] = await Promise.all([
    db.collection("publications").where("userId", "==", uid).get(),
    db.collectionGroup("commentaires").where("userId", "==", uid).get(),
    db.collectionGroup("messages").where("userId", "==", uid).get(),
  ]);

  // Compter les commentaires par publication parente pour ajuster nbCommentaires
  const decompteParPub = {};
  commentairesSnap.docs.forEach((d) => {
    const pubRef = d.ref.parent.parent;
    if (pubRef) {
      decompteParPub[pubRef.id] = (decompteParPub[pubRef.id] || 0) + 1;
    }
  });

  const batch = db.batch();
  pubsSnap.docs.forEach((d) => batch.delete(d.ref));
  commentairesSnap.docs.forEach((d) => batch.delete(d.ref));
  messagesSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(db.collection("utilisateurs").doc(docId));
  await batch.commit();

  // Mettre à jour nbCommentaires sur les publications restantes (pas déjà supprimées)
  const idsPubsSupprimes = new Set(pubsSnap.docs.map((d) => d.id));
  const updates = Object.entries(decompteParPub)
    .filter(([pubId]) => !idsPubsSupprimes.has(pubId))
    .map(async ([pubId, count]) => {
      const pubRef = db.collection("publications").doc(pubId);
      const pubSnap = await pubRef.get();
      if (pubSnap.exists) {
        const actuel = pubSnap.data().nbCommentaires || 0;
        await pubRef.update({ nbCommentaires: Math.max(actuel - count, 0) });
      }
    });
  await Promise.all(updates);

  try {
    await auth.deleteUser(docId);
  } catch (e) {
    // Le compte Auth a peut-être déjà été supprimé séparément, on continue
  }

  return {
    publications: pubsSnap.size,
    commentaires: commentairesSnap.size,
    messages: messagesSnap.size,
  };
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { idToken, action, email } = req.body;

  const estAdmin = await verifierAdmin(idToken);
  if (!estAdmin) {
    return res.status(403).json({ error: "Accès refusé" });
  }

  if (!email) {
    return res.status(400).json({ error: "Email manquant" });
  }

  try {
    const utilisateur = await trouverUtilisateur(email);
    if (!utilisateur) {
      return res.status(404).json({ error: "Aucun utilisateur trouvé avec cet email" });
    }

    if (action === "apercu") {
      const counts = await compterDonnees(utilisateur.docId);
      return res.status(200).json({
        pseudo: utilisateur.data.pseudo,
        uid: utilisateur.docId,
        ...counts,
      });
    }

    if (action === "supprimer") {
      const counts = await supprimerToutesLesDonnees(utilisateur.docId, utilisateur.docId);
      await db.collection("suppressions_rgpd").add({
        email,
        pseudo: utilisateur.data.pseudo,
        supprimeLe: new Date(),
        resume: `${counts.publications} publications, ${counts.commentaires} commentaires, ${counts.messages} messages`,
      });
      return res.status(200).json({ success: true, ...counts });
    }

    return res.status(400).json({ error: "Action invalide" });
  } catch (error) {
    console.log("ERREUR RGPD DETAILLEE:", error);
    return res.status(500).json({ error: "Erreur serveur", details: error.message, stack: error.stack });
  }
}