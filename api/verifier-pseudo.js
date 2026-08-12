import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getAppCheck } from "firebase-admin/app-check";

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

const DELAI_EXPIRATION_MS = 2 * 60 * 1000; // TEST : 2 minutes (remettre 48h après test)

const nettoyerSiCompteAbandonne = async (docId) => {
  try {
    const userRecord = await auth.getUser(docId);
    if (userRecord.emailVerified) return false;

    const dateCreation = new Date(userRecord.metadata.creationTime).getTime();
    const maintenant = Date.now();
    if (maintenant - dateCreation < DELAI_EXPIRATION_MS) return false;

    // Compte non vérifié ET expiré : on le supprime
    await auth.deleteUser(docId);
    await db.collection("utilisateurs").doc(docId).delete();
    return true;
  } catch (e) {
    return false;
  }
};



const verifierAppCheck = async (token) => {
  if (!token) return false;
  try {
    await getAppCheck().verifyToken(token);
    return true;
  } catch (e) {
    return false;
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { pseudo, telephone, appCheckToken } = req.body;

  const appCheckValide = await verifierAppCheck(appCheckToken);
  if (!appCheckValide) {
    return res.status(403).json({ error: "Vérification de sécurité échouée" });
  }

  try {
    if (pseudo) {
      const snap = await db
        .collection("utilisateurs")
        .where("pseudo", "==", pseudo)
        .limit(1)
        .get();

      if (snap.empty) {
        return res.status(200).json({ existe: false });
      }

      const docId = snap.docs[0].id;
      const aEteNettoye = await nettoyerSiCompteAbandonne(docId);
      return res.status(200).json({ existe: !aEteNettoye });
    }

    if (telephone) {
      const snap = await db
        .collection("utilisateurs")
        .where("telephone", "==", telephone)
        .limit(1)
        .get();

      if (snap.empty) {
        return res.status(200).json({ existe: false });
      }

      const docId = snap.docs[0].id;
      const aEteNettoye = await nettoyerSiCompteAbandonne(docId);
      return res.status(200).json({ existe: !aEteNettoye });
    }

    return res.status(400).json({ error: "Pseudo ou téléphone manquant" });
  } catch (error) {
    return res.status(500).json({ error: "Erreur serveur" });
  }
}