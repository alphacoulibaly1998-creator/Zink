const {onRequest} = require("firebase-functions/v2/https");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const axios = require("axios");
const FormData = require("form-data");

admin.initializeApp();

const IMGBB_API_KEY = "c90c22e35355bc0361c3d8d95ca3293e";

exports.uploadImage = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Tu dois être connecté.");
  }

  const { imageBase64 } = request.data;
  if (!imageBase64) {
    throw new HttpsError("invalid-argument", "Image manquante.");
  }

  try {
    const formData = new FormData();
    const base64Data = imageBase64.split(",")[1] || imageBase64;
    formData.append("image", base64Data);
    formData.append("key", IMGBB_API_KEY);

    const response = await axios.post(
      "https://api.imgbb.com/1/upload",
      formData,
      { headers: formData.getHeaders() }
    );

    return { url: response.data.data.url };
  } catch (error) {
    throw new HttpsError("internal", "Erreur lors de l'upload.");
  }
});