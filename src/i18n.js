import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const resources = {
  fr: {
    translation: {
      connexion: {
        titre: "Connecte-toi",
        emailOuNumero: "Email ou numéro de téléphone",
        motDePasse: "Mot de passe",
        seConnecter: "Se connecter",
        connexionEnCours: "Connexion...",
        pasDeCompte: "Pas encore de compte ?",
        inscrisToi: "Inscris-toi",
        motDePasseOublie: "Mot de passe oublié ?",
        reinitialiser: "Réinitialiser"
      },
      inscription: {
        titre: "Crée ton compte",
        pseudo: "Pseudo (obligatoire)",
        email: "Email",
        motDePasse: "Mot de passe (8 car. min, 1 majuscule, 1 chiffre)",
        choisirPays: "-- Choisis ton pays --",
        telephone: "Numéro (optionnel)",
        masquerTelephone: "Masquer mon numéro de téléphone",
        masquerDate: "Masquer ma date de naissance",
        sinscrire: "S'inscrire",
        inscriptionEnCours: "Inscription...",
        dejaCompte: "Déjà un compte ?",
        connecteToi: "Connecte-toi",
        dateNaissance: "🎂 Date de naissance",
        choisirSexe: "-- Sexe --",
        homme: "Homme",
        femme: "Femme",
        autre: "Autre",
        nonPrecise: "Préfère ne pas préciser"
      }
    }
  },
  en: {
    translation: {
      connexion: {
        titre: "Log in",
        emailOuNumero: "Email or phone number",
        motDePasse: "Password",
        seConnecter: "Log in",
        connexionEnCours: "Logging in...",
        pasDeCompte: "Don't have an account?",
        inscrisToi: "Sign up",
        motDePasseOublie: "Forgot password?",
        reinitialiser: "Reset"
      },
      inscription: {
        titre: "Create your account",
        pseudo: "Username (required)",
        email: "Email",
        motDePasse: "Password (min 8 char, 1 uppercase, 1 number)",
        choisirPays: "-- Choose your country --",
        telephone: "Phone number (optional)",
        masquerTelephone: "Hide my phone number",
        masquerDate: "Hide my birth date",
        sinscrire: "Sign up",
        inscriptionEnCours: "Signing up...",
        dejaCompte: "Already have an account?",
        connecteToi: "Log in",
        dateNaissance: "🎂 Date of birth",
        choisirSexe: "-- Gender --",
        homme: "Male",
        femme: "Female",
        autre: "Other",
        nonPrecise: "Prefer not to say"
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "fr",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;