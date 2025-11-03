// /api/ai-playlist.js
import { songDatabase } from "../data/songDataBase.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests allowed" });
  }

  try {
    const { mood = "relaxed", language = "english" } = req.body;
    const langData = songDatabase[language.toLowerCase()];
    if (!langData) return res.status(404).json({ error: `No songs for ${language}` });

    const moodSongs = langData[mood.toLowerCase()] || [];
    if (!moodSongs.length)
      return res.status(404).json({ error: `No songs for mood ${mood}` });

    // 🎲 Randomly pick 35 songs
    const playlist = [...moodSongs].sort(() => 0.5 - Math.random()).slice(0, 35);

    res.status(200).json({ mood, language, playlist });
  } catch (err) {
    console.error("Playlist generation error:", err);
    res.status(500).json({ error: "Failed to generate playlist" });
  }
}
