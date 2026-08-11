import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

const verifierRecaptcha = async (token) => {
  if (!token) return false;
  const params = new URLSearchParams();
  params.append("secret", process.env.RECAPTCHA_SECRET_KEY);
  params.append("response", token);
  const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    body: params,
  });
  const data = await response.json();
  return data.success && data.score >= 0.5;
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { pseudo, telephone, recaptchaToken } = req.body;

  const recaptchaValide = await verifierRecaptcha(recaptchaToken);
  if (!recaptchaValide) {
    return res.status(403).json({ error: "Vérification anti-robot échouée" });
  }

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