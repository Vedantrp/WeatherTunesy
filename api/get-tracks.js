// /api/get-tracks.js
// Strict Spotify track fetcher by language + mood

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "POST only" });

  const { language = "english", mood = "relaxed", token } = req.body;
  if (!token) return res.status(401).json({ error: "Missing Spotify token" });

  const langConfig = {
    english: { market: "US", keywords: ["english", ""], mood: [] },
    hindi: { market: "IN", keywords: ["hindi", "bollywood"], mood: [] },
    punjabi: { market: "IN", keywords: ["punjabi", "ap dhillon"], mood: [] },
    telugu: { market: "IN", keywords: ["telugu", "tollywood"], mood: [] },
    tamil: { market: "IN", keywords: ["tamil", "kollywood"], mood: [] },
    spanish: { market: "ES", keywords: ["latin", "español"], mood: [] },
    korean: { market: "KR", keywords: ["kpop", "korean"], mood: [] },
    japanese: { market: "JP", keywords: ["jpop", "japanese"], mood: [] },
    french: { market: "FR", keywords: ["french"], mood: [] },
    german: { market: "DE", keywords: ["german", "deutsch"], mood: [] },
    italian: { market: "IT", keywords: ["italian"], mood: [] },
    chinese: { market: "HK", keywords: ["c-pop", "mandarin"], mood: [] },
  };

  const moodTerms = {
    relaxed: ["chill", "acoustic", "soft"],
    cozy: ["lofi", "acoustic", "calm"],
    upbeat: ["happy", "party", "dance"],
    romantic: ["love", "romantic"],
    party: ["party", "club", "dance"],
    workout: ["workout", "gym", "energy"],
    focus: ["focus", "study"],
    sleep: ["sleep", "ambient"],
    mysterious: ["mysterious", "lofi dark"],
  };

  const conf = langConfig[language] || langConfig.english;
  const keywords = conf.keywords;
  const moods = moodTerms[mood] || ["chill"];

  try {
    // Build playlist search query
    const searchQueries = [];
    keywords.forEach(k => moods.forEach(m => searchQueries.push(`${k} ${m}`)));

    let allTracks = [];

    for (const q of searchQueries.slice(0, 8)) {
      const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=playlist&market=${conf.market}&limit=1`;

      const playlists = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json());

      const pl = playlists?.playlists?.items?.[0];
      if (!pl) continue;

      const tURL = `https://api.spotify.com/v1/playlists/${pl.id}/tracks?limit=100&market=${conf.market}`;
      const tracks = await fetch(tURL, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json());

      tracks.items?.forEach(it => {
        const t = it.track;
        if (t && t.id && t.uri) {
          allTracks.push({
            id: t.id,
            uri: t.uri,
            name: t.name,
            artist: t.artists?.[0]?.name || "Unknown"
          });
        }
      });

      if (allTracks.length > 150) break;
    }

    // Dedupe + shuffle
    const unique = Array.from(new Map(allTracks.map(t => [t.id, t])).values());
    const shuffled = unique.sort(() => 0.5 - Math.random());

    if (!shuffled.length) {
      return res.status(200).json({
        tracks: [],
        note: "No songs matched. Try different language/mood."
      });
    }

    return res.status(200).json({
      tracks: shuffled.slice(0, 60) // Return 60 max
    });

  } catch (err) {
    console.error("TRACK API ERROR:", err);
    return res.status(500).json({ error: "Server fetch failed" });
  }
}
