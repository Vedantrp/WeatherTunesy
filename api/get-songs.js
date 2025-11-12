// /api/get-songs.js
import { dbConnect, Taste } from "./_db.js";

const langGenres = {
  english: ["indie-pop", "pop", "acoustic", "singer-songwriter", "chill"],
  hindi: ["bollywood", "desi", "indian-pop"],
  punjabi: ["desi", "indian-pop", "pop"],
  tamil: ["indian-pop"],
  telugu: ["indian-pop"],
  kannada: ["indian-pop"],
  malayalam: ["indian-pop"],
  bengali: ["indian-pop"],
  marathi: ["indian-pop"],
  spanish: ["latin", "reggaeton", "latin-pop"],
  french: ["french", "pop"],
  german: ["german", "pop"],
  italian: ["italian", "pop"],
  korean: ["k-pop", "korean-pop"],
  japanese: ["j-pop", "anime", "japanese"],
  chinese: ["mandopop", "cantopop", "c-pop"],
  arabic: ["arab", "pop"]
};

const langMarket = {
  english: "US", hindi: "IN", punjabi: "IN", tamil: "IN", telugu: "IN",
  kannada: "IN", malayalam: "IN", bengali: "IN", marathi: "IN",
  spanish: "ES", french: "FR", german: "DE", italian: "IT",
  korean: "KR", japanese: "JP", chinese: "HK", arabic: "SA"
};

const sfetch = async (url, token) => {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 401) throw new Error("UNAUTHORIZED");
  return r.json();
};

export default async function handler(req, res) {
  try {
    await dbConnect().catch(() => null);

    const { token, language = "english", aiMood, city, userId } = req.body || {};
    if (!token) return res.status(401).json({ error: "Missing token" });

    const market = langMarket[language] || "US";
    const seeds = langGenres[language] || ["pop", "chill"];

    // Determine targets from AI mood (or defaults)
    const energy = aiMood?.targets?.energy ?? 0.55;
    const valence = aiMood?.targets?.valence ?? 0.5;

    // Build recommendations call
    const params = new URLSearchParams({
      market,
      limit: "50",
      seed_genres: seeds.slice(0, 5).join(","),
      target_energy: String(energy),
      target_valence: String(valence)
    });

    const rec = await sfetch(
      `https://api.spotify.com/v1/recommendations?${params.toString()}`,
      token
    );

    const tracks = (rec.tracks || []).map((t) => ({
      id: t.id,
      uri: t.uri,
      name: t.name,
      artist: t.artists?.[0]?.name,
      url: t.external_urls?.spotify
    }));

    // Save taste (fire-and-forget)
    if (userId) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/taste`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            city,
            language,
            mood: aiMood?.moodText || "auto",
            energy,
            valence
          })
        }).catch(() => {});
      } catch (_) {}
    }

    // Dedup + shuffle
    const seen = new Set();
    const unique = [];
    for (const t of tracks) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        unique.push(t);
      }
    }
    for (let i = unique.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unique[i], unique[j]] = [unique[j], unique[i]];
    }

    return res.json({ tracks: unique.slice(0, 35) });
  } catch (e) {
    if (e.message === "UNAUTHORIZED") {
      return res.status(401).json({ error: "Spotify token expired" });
    }
    console.error("GET-SONGS ERROR:", e);
    return res.status(500).json({ error: "Song fetch failed" });
  }
}
