export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "POST only" });

  const { language = "english", mood = "relaxed", token } = req.body;
  if (!token) return res.status(401).json({ error: "Missing Spotify token" });

  const langConfig = {
    english: { market: "US", base: ["english", "pop", "indie pop"] },
    hindi: { market: "IN", base: ["bollywood", "hindi", "arijit singh", "romantic bollywood"] },
    punjabi: { market: "IN", base: ["punjabi", "ap dhillon", "punjabi pop"] },
    telugu: { market: "IN", base: ["telugu", "tollywood", "telugu love"] },
    tamil: { market: "IN", base: ["tamil", "kollywood", "tamil love"] },
    spanish: { market: "ES", base: ["latin pop", "reggaeton", "musica latina"] },
    korean: { market: "KR", base: ["kpop", "korean pop"] },
    japanese: { market: "JP", base: ["jpop", "anime songs"] },
    french: { market: "FR", base: ["french pop", "chanson"] },
    german: { market: "DE", base: ["german pop", "deutsch rap"] },
    italian: { market: "IT", base: ["italian pop"] },
    chinese: { market: "HK", base: ["c-pop", "mandarin pop"] }
  };

  const moodKeywords = {
    relaxed: ["chill", "acoustic", "calm"],
    cozy: ["lofi", "coffeehouse", "soft"],
    upbeat: ["happy", "party", "dance"],
    romantic: ["romantic", "love", "valentine"],
    party: ["party", "club", "dance"],
    workout: ["workout", "gym"],
    focus: ["focus", "study", "instrumental"],
    sleep: ["sleep", "piano"],
    mysterious: ["lofi dark", "ambient"],
    energetic: ["edm", "boost"]
  };

  const conf = langConfig[language] || langConfig.english;
  const moodList = moodKeywords[mood] || ["chill"];

  try {
    let searchTerms = [];

    conf.base.forEach(b => {
      moodList.forEach(m => searchTerms.push(`${b} ${m}`));
    });

    // fallback ensure we always have playlist terms
    if (!searchTerms.length) searchTerms = conf.base;

    let trackPool = [];

    for (const term of searchTerms.slice(0, 12)) {
      const q = encodeURIComponent(term);
      const pRes = await fetch(
        `https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${conf.market}&limit=1`,
        { headers: { Authorization: `Bearer ${token}` } }
      ).then(r => r.json());

      const playlist = pRes?.playlists?.items?.[0];
      if (!playlist) continue;

      const tRes = await fetch(
        `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?limit=80&market=${conf.market}`,
        { headers: { Authorization: `Bearer ${token}` } }
      ).then(r => r.json());

      (tRes.items || []).forEach(item => {
        const t = item.track;
        if (!t || !t.id) return;
        trackPool.push({
          id: t.id,
          uri: t.uri,
          name: t.name,
          artist: t.artists?.[0]?.name || "Unknown"
        });
      });

      if (trackPool.length > 150) break;
    }

    // dedupe
    const unique = Array.from(new Map(trackPool.map(t => [t.id, t])).values());
    const shuffled = unique.sort(() => Math.random() - 0.5);

    return res.json({ tracks: shuffled.slice(0, 80) });
  } catch (err) {
    console.error("TRACK API FAIL:", err);
    return res.status(500).json({ error: "Track fetch failed" });
  }
}
