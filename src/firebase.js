import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCfCbAYK4QvYGAVUdujy7J46zQHnf00Teo",
  authDomain: "zink-19923.firebaseapp.com",
  projectId: "zink-19923",
  storageBucket: "zink-19923.firebasestorage.app",
  messagingSenderId: "922135364248",
  appId: "1:922135364248:web:c4606bfd576c5dcc53c6ed"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;