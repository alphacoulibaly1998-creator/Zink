import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: "AIzaSyCfCbAYK4QvYGAVUdujy7J46zQHnf00Teo",
  authDomain: "zink-19923.firebaseapp.com",
  projectId: "zink-19923",
  storageBucket: "zink-19923.firebasestorage.app",
  messagingSenderId: "922135364248",
  appId: "1:922135364248:web:c4606bfd576c5dcc53c6ed"
};

const app = initializeApp(firebaseConfig);

initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
  isTokenAutoRefreshEnabled: true,
});

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;