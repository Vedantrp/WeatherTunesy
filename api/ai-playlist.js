// /api/ai-playlist.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Only POST requests are supported" });

  try {
    const { mood = "balanced", language = "english" } = req.body;

    // 🔹 Spotify Access Token from your environment (add in .env)
    const SPOTIFY_TOKEN = process.env.SPOTIFY_ACCESS_TOKEN;
    if (!SPOTIFY_TOKEN) {
      return res.status(500).json({
        error: "Missing SPOTIFY_ACCESS_TOKEN in environment",
      });
    }

    // =====================================================================================
    // 1️⃣ Map moods → Spotify seed genres
    const moodGenreMap = {
      upbeat: ["pop", "dance", "happy"],
      cozy: ["acoustic", "chill", "indie"],
      relaxed: ["lofi", "jazz", "ambient"],
      balanced: ["pop", "indie", "alternative"],
      calm: ["classical", "piano", "ambient"],
      mysterious: ["cinematic", "dark", "experimental"],
      energetic: ["rock", "edm", "dance"],
      intense: ["metal", "hard-rock", "trap"],
      tropical: ["reggae", "afrobeat", "latin"],
      warm: ["soul", "rnb", "funk"],
      default: ["pop"],
    };

    const seed_genres =
      moodGenreMap[mood.toLowerCase()] || moodGenreMap.default;

    // =====================================================================================
    // 2️⃣ Map language → Spotify market & genres
    const langConfig = {
      english: { market: "US", extras: ["pop", "indie", "folk"] },
      hindi: { market: "IN", extras: ["bollywood", "indian", "romance"] },
      tamil: { market: "IN", extras: ["tamil", "kollywood"] },
      telugu: { market: "IN", extras: ["telugu", "tollywood"] },
      punjabi: { market: "IN", extras: ["punjabi", "bhangra"] },
      spanish: { market: "ES", extras: ["latin", "reggaeton"] },
      french: { market: "FR", extras: ["chanson", "french-pop"] },
      japanese: { market: "JP", extras: ["jpop"] },
      korean: { market: "KR", extras: ["kpop"] },
      portuguese: { market: "PT", extras: ["brazilian", "samba"] },
      german: { market: "DE", extras: ["german-pop"] },
      italian: { market: "IT", extras: ["italian", "love-songs"] },
      chinese: { market: "HK", extras: ["mandopop", "cantopop"] },
    };

    const { market, extras } =
      langConfig[language.toLowerCase()] || langConfig.english;

    const finalGenres = [...new Set([...seed_genres, ...(extras || [])])]
      .slice(0, 5)
      .join(",");

    // =====================================================================================
    // 3️⃣ Smart dynamic parameters (AI-like logic)
    const energyTarget = {
      upbeat: 0.8,
      energetic: 0.9,
      relaxed: 0.4,
      cozy: 0.5,
      intense: 0.9,
      calm: 0.3,
      mysterious: 0.4,
      tropical: 0.7,
      warm: 0.6,
    }[mood.toLowerCase()] || 0.6;

    const valenceTarget = {
      upbeat: 0.9,
      energetic: 0.8,
      relaxed: 0.5,
      cozy: 0.4,
      intense: 0.3,
      calm: 0.5,
      mysterious: 0.3,
      tropical: 0.8,
      warm: 0.7,
    }[mood.toLowerCase()] || 0.6;

    // =====================================================================================
    // 4️⃣ Fetch from Spotify Recommendations API
    const url = `https://api.spotify.com/v1/recommendations?limit=50&market=${market}&seed_genres=${finalGenres}&target_energy=${energyTarget}&target_valence=${valenceTarget}`;

    const spotifyRes = await fetch(url, {
      headers: { Authorization: `Bearer ${SPOTIFY_TOKEN}` },
    });

    const data = await spotifyRes.json();

    if (!spotifyRes.ok || !data.tracks) {
      console.error("Spotify API error:", data);
      return res
        .status(500)
        .json({ error: "Failed to fetch songs from Spotify", details: data });
    }

    // =====================================================================================
    // 5️⃣ Transform results → formatted playlist (top 35)
    const allTracks = (data.tracks || [])
      .filter((t) => t && t.name && t.artists?.length)
      .map((t) => ({
        title: t.name,
        artist: t.artists.map((a) => a.name).join(", "),
        spotify_url: t.external_urls.spotify,
        album_image: t.album?.images?.[0]?.url,
        popularity: t.popularity,
      }))
      .sort(() => Math.random() - 0.5) // randomize slightly
      .slice(0, 35); // limit to 35

    return res.status(200).json({
      mood,
      language,
      total: allTracks.length,
      playlist: allTracks,
    });
  } catch (error) {
    console.error("AI playlist generation error:", error);
    res.status(500).json({ error: "AI playlist generation failed" });
  }
}
