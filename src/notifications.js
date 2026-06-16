import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export const creerNotification = async (cibleId, auteurId, type, data = {}) => {
  if (cibleId === auteurId) return;
  try {
    await addDoc(collection(db, "notifications"), {
      cibleId,
      auteurId,
      type,
      lu: false,
      createdAt: serverTimestamp(),
      ...data
    });
  } catch (e) {
    console.error("Erreur notification:", e);
  }
};