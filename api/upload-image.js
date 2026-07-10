export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { imageBase64 } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: "Image manquante" });
  }

  try {
    const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
    const base64Data = imageBase64.split(",")[1] || imageBase64;

    const formData = new URLSearchParams();
    formData.append("image", base64Data);
    formData.append("key", IMGBB_API_KEY);

    const response = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (!data.success) {
      return res.status(500).json({ error: "Erreur ImgBB" });
    }

    return res.status(200).json({ url: data.data.url });
  } catch (error) {
    return res.status(500).json({ error: "Erreur serveur" });
  }
}