// /api/ai-playlist.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests allowed" });
  }

  try {
    const { mood, language, token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Spotify token missing. Please log in." });
    }

    // 🎧 Map moods to seed genres
    const moodGenreMap = {
      relaxed: ["chill", "acoustic", "indie", "lofi"],
      energetic: ["dance", "edm", "pop", "rock"],
      cozy: ["jazz", "soul", "piano", "classical"],
      mysterious: ["ambient", "cinematic", "electronic"],
      upbeat: ["pop", "happy", "dance"],
      warm: ["rnb", "groove", "soul"],
      intense: ["metal", "punk", "alt"],
      calm: ["ambient", "chill", "instrumental"],
    };

    const languageGenreMap = {
      english: ["pop", "rock", "indie"],
      hindi: ["bollywood", "indian", "punjabi"],
      tamil: ["tamil"],
      telugu: ["telugu"],
      punjabi: ["punjabi"],
      spanish: ["latin", "reggaeton"],
      french: ["french"],
      korean: ["kpop"],
      japanese: ["jpop"],
      portuguese: ["brazil"],
      german: ["german"],
      italian: ["italian"],
      chinese: ["mandopop"],
    };

    const seeds = [
      ...(moodGenreMap[mood] || []),
      ...(languageGenreMap[language] || []),
    ]
      .slice(0, 5)
      .join(",");

    if (!seeds) {
      return res.status(400).json({ error: "Invalid mood or language." });
    }

    // 🎲 Randomness for variation
    const random = Math.floor(Math.random() * 100);

    const url = `https://api.spotify.com/v1/recommendations?limit=35&seed_genres=${encodeURIComponent(
      seeds
    )}&min_popularity=${40 + random % 40}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Spotify API error:", errText);
      return res.status(response.status).json({ error: "Spotify API request failed" });
    }

    const data = await response.json();
    const playlist = (data.tracks || []).map((track) => ({
      title: track.name,
      artist: track.artists.map((a) => a.name).join(", "),
      preview_url: track.preview_url,
      spotify_url: track.external_urls.spotify,
      album_cover: track.album.images?.[0]?.url,
    }));

    res.status(200).json({ mood, language, playlist });
  } catch (error) {
    console.error("AI Playlist Error:", error);
    res.status(500).json({ error: "AI generation failed", details: error.message });
  }
}
