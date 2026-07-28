import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { nomFichier } = req.body;
  if (!nomFichier) {
    return res.status(400).json({ error: "Nom de fichier manquant" });
  }

  try {
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data, error } = await supabaseAdmin.storage
      .from("zink")
      .createSignedUploadUrl(nomFichier);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path
    });
  } catch (error) {
    return res.status(500).json({ error: "Erreur serveur" });
  }
}