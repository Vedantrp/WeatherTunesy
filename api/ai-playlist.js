// /api/ai-playlist.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests allowed" });
  }

  const { mood = "relaxed", language = "english" } = req.body;
  const hfKey = process.env.HUGGINGFACE_API_KEY;

  if (!hfKey) {
    return res.status(500).json({ error: "Missing Hugging Face API key" });
  }

  try {
    // 🔹 Generate playlist using Hugging Face text model
    const prompt = `
      Suggest 35 popular ${language} songs that match a ${mood} mood.
      Return JSON only, like:
      [
        { "title": "Song Name", "artist": "Artist Name" },
        ...
      ]
    `;

    const response = await fetch(
      "https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    const text = await response.text();
    let playlist = [];

    // Try to parse model response into JSON
    const match = text.match(/\[.*\]/s);
    if (match) {
      try {
        playlist = JSON.parse(match[0]);
      } catch {
        playlist = [];
      }
    }

    // Filter invalid or empty results
    const finalSongs = (playlist || [])
      .filter((s) => s.title && s.artist)
      .slice(0, 35);

    if (finalSongs.length === 0) {
      return res.status(200).json({
        mood,
        language,
        playlist: [],
        note: "AI returned no valid songs — try again later",
      });
    }

    return res.status(200).json({ mood, language, playlist: finalSongs });
  } catch (err) {
    console.error("AI Playlist Error:", err);
    res.status(500).json({ error: "AI playlist generation failed" });
  }
}
