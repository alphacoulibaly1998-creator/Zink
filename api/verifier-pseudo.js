import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { pseudo, telephone } = req.body;

  try {
    if (pseudo) {
      const snap = await db
        .collection("utilisateurs")
        .where("pseudo", "==", pseudo)
        .limit(1)
        .get();
      return res.status(200).json({ existe: !snap.empty });
    }

    if (telephone) {
      const snap = await db
        .collection("utilisateurs")
        .where("telephone", "==", telephone)
        .limit(1)
        .get();
      return res.status(200).json({ existe: !snap.empty });
    }

    return res.status(400).json({ error: "Pseudo ou téléphone manquant" });
  } catch (error) {
    return res.status(500).json({ error: "Erreur serveur" });
  }
}