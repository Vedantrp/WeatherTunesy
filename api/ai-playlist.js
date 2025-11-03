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
    const prompt = `
      Suggest 35 popular ${language} songs that match a ${mood} mood.
      Each item should look like: Song Name - Artist Name.
      Do NOT add extra commentary.
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

    // Try to parse valid JSON first
    const jsonMatch = text.match(/\[.*\]/s);
    if (jsonMatch) {
      try {
        playlist = JSON.parse(jsonMatch[0]);
      } catch (err) {
        playlist = [];
      }
    }

    // 🧩 If JSON parsing fails, use text-based fallback
    if (!playlist.length) {
      const lines = text
        .split("\n")
        .filter((l) => l.trim().length > 3)
        .slice(0, 35);

      playlist = lines.map((line) => {
        const parts = line.replace(/^[\d\.\-\*\s]+/, "").split("-");
        return {
          title: parts[0]?.trim() || "Unknown Title",
          artist: parts[1]?.trim() || "Unknown Artist",
        };
      });
    }

    // Filter empty or invalid items
    playlist = playlist.filter((s) => s.title && s.artist).slice(0, 35);

    if (!playlist.length) {
      return res.status(200).json({
        mood,
        language,
        playlist: [],
        note: "AI returned no valid songs — try again later",
      });
    }

    res.status(200).json({ mood, language, playlist });
  } catch (err) {
    console.error("AI Playlist Error:", err);
    res.status(500).json({ error: "AI playlist generation failed" });
  }
}
