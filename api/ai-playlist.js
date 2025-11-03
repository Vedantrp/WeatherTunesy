// /api/ai-playlist.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function getAiPlaylist(mood = "relaxed", language = "english") {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error("❌ Missing GEMINI_API_KEY");
      return [];
    }

    const prompt = `
      You are a music expert.
      Suggest 10 popular ${language} songs that fit a ${mood} mood.
      Respond ONLY with a JSON array in this format:
      [
        { "title": "Song Title", "artist": "Artist Name" },
        ...
      ]
    `;

    // ✅ Use the correct model name for the public Gemini endpoint
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const jsonMatch = text.match(/\[.*\]/s);
    if (!jsonMatch) {
      console.warn("⚠️ Gemini gave non-JSON output:", text);
      return [];
    }

    const playlist = JSON.parse(jsonMatch[0]);
    return playlist.filter(s => s.title && s.artist);
  } catch (err) {
    console.error("AI Playlist Error:", err.message);
    return [];
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Only POST allowed" });

  const { mood, language } = req.body || {};
  const playlist = await getAiPlaylist(mood || "relaxed", language || "english");

  res.status(200).json({ mood, language, playlist });
}
