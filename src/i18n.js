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
      accueil: {
        titre: "🏠 Zink",
        chargement: "Chargement...",
        aucunePublication: "Aucune publication pour l'instant.",
        soisLePremier: "Sois le premier à publier ! 😊",
        actualiser: "🔄 Actualiser le fil"
      },
      profil: {
        titre: "👤 Profil",
        modifier: "✏️ Modifier le profil",
        sauvegarder: "💾 Sauvegarder",
        annuler: "Annuler",
        deconnexion: "🚪 Se déconnecter",
        points: "⭐ Points",
        badges: "🏆 Badges",
        serieActuelle: "🔥 Série actuelle",
        age: "🎂 Date de naissance",
        sexe: "👤 Sexe",
        telephone: "📱 Téléphone",
        masque: "Masqué 🔒",
        nonRenseigne: "Non renseigné",
        masquerNumero: "Masquer mon numéro de téléphone",
        masquerDate: "Masquer ma date de naissance",
        choisirAvatar: "😊 Choisir un avatar",
        tesBadges: "🏆 Tes badges",
        pseudoPlaceholder: "Pseudo",
        statutPlaceholder: "Statut",
        ans: "ans"
      },
      notifications: {
        titre: "🔔 Notifications",
        toutMarquerLu: "Tout marquer lu",
        chargement: "Chargement...",
        aucuneNotif: "Aucune nouvelle notification 🔔",
        aJour: "Tu es à jour !",
        demandeAmi: "t'a envoyé une demande d'ami",
        amiAccepte: "a accepté ta demande d'ami",
        message: "t'a envoyé un message",
        attaque: "t'a envoyé une attaque sonore",
        like: "a aimé ta publication",
        commentaire: "a commenté ta publication",
        quelquUn: "Quelqu'un"
      },
      publier: {
        placeholder: "Quoi de neuf ? 😊",
        publier: "Publier",
        publicationEnCours: "Publication...",
        erreurTaille: "L'image ne doit pas dépasser 5MB.",
        erreurTailleVideo: "La vidéo ne doit pas dépasser 50MB.",
        erreurVide: "Ajoute une photo, une vidéo ou une description.",
        erreurGenerale: "Erreur lors de la publication. Réessaie.",
        erreurRateLimit: "Attends quelques secondes avant de publier à nouveau."
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
      accueil: {
        titre: "🏠 Zink",
        chargement: "Loading...",
        aucunePublication: "No posts yet.",
        soisLePremier: "Be the first to post! 😊",
        actualiser: "🔄 Refresh feed"
      },
      profil: {
        titre: "👤 Profile",
        modifier: "✏️ Edit profile",
        sauvegarder: "💾 Save",
        annuler: "Cancel",
        deconnexion: "🚪 Log out",
        points: "⭐ Points",
        badges: "🏆 Badges",
        serieActuelle: "🔥 Current streak",
        age: "🎂 Date of birth",
        sexe: "👤 Gender",
        telephone: "📱 Phone",
        masque: "Hidden 🔒",
        nonRenseigne: "Not provided",
        masquerNumero: "Hide my phone number",
        masquerDate: "Hide my birth date",
        choisirAvatar: "😊 Choose an avatar",
        tesBadges: "🏆 Your badges",
        pseudoPlaceholder: "Username",
        statutPlaceholder: "Status",
        ans: "years old"
      },
      notifications: {
        titre: "🔔 Notifications",
        toutMarquerLu: "Mark all as read",
        chargement: "Loading...",
        aucuneNotif: "No new notifications 🔔",
        aJour: "You're all caught up!",
        demandeAmi: "sent you a friend request",
        amiAccepte: "accepted your friend request",
        message: "sent you a message",
        attaque: "sent you a sound attack",
        like: "liked your post",
        commentaire: "commented on your post",
        quelquUn: "Someone"
      },
      publier: {
        placeholder: "What's new? 😊",
        publier: "Post",
        publicationEnCours: "Posting...",
        erreurTaille: "Image must not exceed 5MB.",
        erreurTailleVideo: "Video must not exceed 50MB.",
        erreurVide: "Add a photo, video or description.",
        erreurGenerale: "Error posting. Try again.",
        erreurRateLimit: "Wait a few seconds before posting again."
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