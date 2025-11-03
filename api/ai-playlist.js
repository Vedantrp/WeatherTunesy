// /api/ai-playlist.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  // Allow cross-origin if needed (safe for same origin)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST allowed" });

  try {
    const { mood = "balanced", language = "english", token } = req.body || {};

    if (!token) return res.status(401).json({ error: "Missing Spotify token (login required)" });

    // maps
    const moodMap = {
      upbeat: ["pop","dance"],
      cozy: ["acoustic","chill"],
      relaxed: ["lofi","ambient"],
      balanced: ["pop","indie"],
      calm: ["classical","ambient"],
      mysterious: ["cinematic","electronic"],
      energetic: ["edm","dance"],
      intense: ["rock","metal"]
    };
    const langMap = {
      english: {market:"US", extras:["pop"]},
      hindi: {market:"IN", extras:["bollywood","indian"]},
      tamil: {market:"IN", extras:["tamil"]},
      telugu: {market:"IN", extras:["telugu"]},
      punjabi: {market:"IN", extras:["punjabi"]},
      spanish: {market:"ES", extras:["latin","reggaeton"]},
      korean: {market:"KR", extras:["kpop"]},
      japanese: {market:"JP", extras:["jpop"]},
      french: {market:"FR", extras:["french"]},
    };

    const genres = [
      ...(moodMap[mood.toLowerCase()] || moodMap["balanced"]),
      ...((langMap[language.toLowerCase()]?.extras) || ["pop"])
    ];
    const market = (langMap[language.toLowerCase()]?.market) || "US";
    // pick up to 5 genres
    const seed_genres = Array.from(new Set(genres)).slice(0,5).join(',');

    // parameters
    const min_pop = 40 + Math.floor(Math.random()*30); // randomize a bit for freshness
    const limit = 50; // ask for 50 and pick best 35
    const url = `https://api.spotify.com/v1/recommendations?limit=${limit}&market=${market}&seed_genres=${encodeURIComponent(seed_genres)}&min_popularity=${min_pop}`;

    const spRes = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const spJson = await spRes.json();
    if (!spRes.ok) {
      console.error("Spotify recommendations error:", spJson);
      return res.status(502).json({ error: "Spotify API error", details: spJson });
    }

    let tracks = (spJson.tracks || []).map(t => ({
      title: t.name,
      artist: t.artists.map(a=>a.name).join(", "),
      spotify_url: t.external_urls.spotify,
      album_cover: t.album?.images?.[0]?.url,
      popularity: t.popularity
    }));

    // dedupe and sort by popularity then randomize slightly and pick 35
    const seen = new Set();
    tracks = tracks.filter(t => {
      const key = `${t.title.toLowerCase()}|${t.artist.toLowerCase()}`;
      if (seen.has(key)) return false; seen.add(key); return true;
    });

    // sort by popularity desc then shuffle small
    tracks.sort((a,b) => b.popularity - a.popularity);
    // slight shuffle to keep freshness
    for (let i=0;i<Math.min(10,tracks.length);i++){
      const j = Math.floor(Math.random()*tracks.length);
      [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
    }

    const playlist = tracks.slice(0, 35);

    return res.status(200).json({ mood, language, total: playlist.length, playlist });
  } catch (err) {
    console.error("ai-playlist error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
}
