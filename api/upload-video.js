import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { videoBase64, nomFichier } = req.body;
  if (!videoBase64 || !nomFichier) {
    return res.status(400).json({ error: "Données manquantes" });
  }

  try {
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const base64Data = videoBase64.split(",")[1] || videoBase64;
    const buffer = Buffer.from(base64Data, "base64");

    if (buffer.length > 45 * 1024 * 1024) {
      return res.status(400).json({ error: "Vidéo trop volumineuse (45MB max)" });
    }

    const { error } = await supabaseAdmin.storage
      .from("zink")
      .upload(nomFichier, buffer, {
        contentType: "video/mp4",
        upsert: true
      });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from("zink")
      .getPublicUrl(nomFichier);

    return res.status(200).json({ url: urlData.publicUrl });
  } catch (error) {
    return res.status(500).json({ error: "Erreur serveur" });
  }
}