// /api/ai-playlist.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests allowed" });
  }

  try {
    const body = await req.body;
    const { mood, language, token } = body || {};

    if (!mood || !language) {
      return res.status(400).json({ error: "Missing mood or language parameter" });
    }

    if (!token) {
      return res.status(401).json({ error: "Spotify token missing. Please log in." });
    }

    // 🎧 Map moods to genres
    const moodGenreMap = {
      relaxed: ["chill", "acoustic", "indie", "lofi"],
      energetic: ["dance", "edm", "pop", "rock"],
      cozy: ["jazz", "soul", "piano", "classical"],
      mysterious: ["ambient", "cinematic", "electronic"],
      upbeat: ["pop", "happy", "dance"],
      warm: ["rnb", "groove", "soul"],
      intense: ["metal", "punk", "alt"],
      calm: ["ambient", "chill", "instrumental"],
      balanced: ["pop", "indie", "folk"],
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

    // Merge both sets of genres
    const genres = [
      ...(moodGenreMap[mood.toLowerCase()] || []),
      ...(languageGenreMap[language.toLowerCase()] || []),
    ];

    if (genres.length === 0) {
      return res.status(400).json({ error: "Invalid mood or language." });
    }

    // Pick random 3–5 genres for variety
    const randomGenres = genres.sort(() => 0.5 - Math.random()).slice(0, 5).join(",");

    // Random popularity window for freshness
    const min_popularity = 40 + Math.floor(Math.random() * 30);
    const seedQuery = `seed_genres=${encodeURIComponent(randomGenres)}&limit=35&min_popularity=${min_popularity}`;

    const spotifyRes = await fetch(`https://api.spotify.com/v1/recommendations?${seedQuery}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!spotifyRes.ok) {
      const errText = await spotifyRes.text();
      console.error("Spotify API Error:", errText);
      return res.status(spotifyRes.status).json({
        error: "Spotify API request failed",
        details: errText,
      });
    }

    const data = await spotifyRes.json();

    const playlist = (data.tracks || []).map((track) => ({
      title: track.name,
      artist: track.artists.map((a) => a.name).join(", "),
      album: track.album.name,
      spotify_url: track.external_urls.spotify,
      album_cover: track.album.images?.[0]?.url,
      preview_url: track.preview_url,
    }));

    if (playlist.length === 0) {
      return res.status(200).json({
        mood,
        language,
        playlist: [],
        message: "No matching tracks found.",
      });
    }

    res.status(200).json({
      mood,
      language,
      playlist,
    });
  } catch (error) {
    console.error("AI Playlist Error:", error);
    res.status(500).json({
      error: "AI playlist generation failed",
      details: error.message,
    });
  }
}
