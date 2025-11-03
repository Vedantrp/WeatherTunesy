// /api/ai-playlist.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ✅ Exported function for use in weather-playlist.js
export async function getAiPlaylist(mood = "relaxed", language = "english") {
  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ Missing GEMINI_API_KEY in environment");
    return [];
  }

  try {
    const prompt = `
      Suggest 10 trending ${language} songs that match a ${mood} mood.
      Return strictly valid JSON only:
      [
        { "title": "Song Name", "artist": "Artist Name" },
        ...
      ]
    `;

    // ✅ Use Gemini 1.5 Pro model with the correct v1 API
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const result = await model.generateContent(prompt);
    const text = await result.response.text();

    // Try to safely extract JSON
    const jsonMatch = text.match(/\[.*\]/s);
    if (!jsonMatch) {
      console.warn("⚠️ Gemini output not valid JSON:", text);
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed
      .filter((item) => item.title && item.artist)
      .map((s) => ({
        title: s.title.trim(),
        artist: s.artist.trim(),
      }));
  } catch (error) {
    console.error("💥 AI Playlist Error:", error);
    return [];
  }
}

// ✅ Direct API route (for POST /api/ai-playlist)
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST requests allowed" });
    }

    const { mood, language } = req.body || {};
    const playlist = await getAiPlaylist(mood || "relaxed", language || "english");

    res.status(200).json({ mo
