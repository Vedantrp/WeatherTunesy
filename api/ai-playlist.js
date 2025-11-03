// /api/ai-playlist.js
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests allowed" });
  }

  const { mood = "relaxed", language = "english" } = req.body || {};

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // ✅ Use valid model (works in both v1beta and v1)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Suggest 10 popular ${language} songs that match a ${mood} mood.
      Return strictly in this JSON format:
      [
        {"title": "Song Title", "artist": "Artist Name"},
        ...
      ]
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Try to extract JSON array
    const match = responseText.match(/\[.*\]/s);
    if (!match) {
      console.warn("Invalid Gemini response:", responseText);
      return res.status(200).json({ mood, language, playlist: [] });
    }

    const playlist = JSON.parse(match[0]);
    const validSongs = playlist.filter(
      (s) => s.title && s.artist
    );

    return res.status(200).json({ mood, language, playlist: validSongs });
  } catch (error) {
    console.error("AI Playlist Error:", error);
    return res
      .status(500)
      .json({ error: "AI generation failed", details: error.message });
  }
}
