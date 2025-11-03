// /api/ai-playlist.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// ✅ This ensures Vercel keeps the function alive long enough
export const config = {
  runtime: "nodejs20.x",
  regions: ["iad1"], // (Washington region, optional)
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests allowed" });
  }

  const { mood = "relaxed", language = "english" } = req.body || {};

  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ Missing GEMINI_API_KEY in environment variables.");
    return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // ✅ New stable model (as of November 2025)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

    const prompt = `
      Suggest 10 ${language} songs that match a ${mood} mood.
      Each entry should have "title" and "artist".
      Return strictly valid JSON array only:
      [
        {"title": "Song Name", "artist": "Artist Name"},
        ...
      ]
    `;

    // ✅ Generate
    const result = await model.generateContent(prompt);
    const text = await result.response.text();

    // ✅ Try to find and parse JSON
    const jsonMatch = text.match(/\[.*\]/s);
    if (!jsonMatch) {
      console.warn("⚠️ Gemini returned non-JSON text:", text);
      return res.status(200).json({ mood, language, playlist: [] });
    }

    let playlist = [];
    try {
      playlist = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("⚠️ JSON parse failed:", e, text);
      playlist = [];
    }

    const validSongs = playlist
      .filter((s) => s.title && s.artist)
      .map((s) => ({
        title: s.title.trim(),
        artist: s.artist.trim(),
      }));

    return res.status(200).json({ mood, language, playlist: validSongs });
  } catch (error) {
    console.error("🔥 AI Playlist Error:", error);

    // Add more diagnostic info in response
    return res.status(500).json({
      error: "AI generation failed",
      details:
        error.message ||
        "Unknown Gemini error — check that your model and key are valid.",
    });
  }
}
