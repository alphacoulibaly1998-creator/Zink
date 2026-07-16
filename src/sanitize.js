import DOMPurify from "dompurify";

export const nettoyerTexte = (texte) => {
  if (!texte) return "";
  const propre = DOMPurify.sanitize(texte, { ALLOWED_TAGS: [] });
  return propre;
};