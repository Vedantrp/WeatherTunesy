export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const { language = "english", mood = "relaxed", token } = req.body || {};
    if (!token) return res.status(401).json({ error: "Missing Spotify token" });

    const lang = {
      english: { market: "US", bases: ["english pop", "pop hits", "indie pop"] },
      hindi:   { market: "IN", bases: ["bollywood", "hindi hits", "arijit singh", "bollywood acoustic", "bollywood lofi"] },
      punjabi: { market: "IN", bases: ["punjabi hits", "punjabi pop", "ap dhillon"] },
      telugu:  { market: "IN", bases: ["telugu hits", "tollywood", "telugu love"] },
      tamil:   { market: "IN", bases: ["tamil hits", "kollywood", "tamil chill"] },
      spanish: { market: "ES", bases: ["latin pop", "reggaeton", "musica latina"] },
      korean:  { market: "KR", bases: ["k-pop", "kpop chill"] },
      japanese:{ market: "JP", bases: ["jpop", "anime songs"] },
      french:  { market: "FR", bases: ["french pop", "chanson"] },
      german:  { market: "DE", bases: ["german pop", "deutsch rap"] },
      italian: { market: "IT", bases: ["italian pop"] },
      chinese: { market: "HK", bases: ["mandarin pop", "c-pop"] },
    }[language] || { market: "US", bases: ["pop hits"] };

    const moodTerms = {
      relaxed: ["chill", "acoustic", "calm"],
      cozy: ["lofi", "soft"],
      upbeat: ["happy", "dance"],
      romantic: ["romantic", "love", "valentine"],
      party: ["party", "club"],
      workout: ["workout", "gym"],
      focus: ["focus", "study", "instrumental"],
      sleep: ["sleep", "ambient"],
      calm: ["piano", "soft"],
      intense: ["bass", "edm", "electro"],
      mysterious: ["midnight", "lofi dark", "ambient"]
    }[mood] || ["chill"];

    const searchTerms = [];
    for (const b of lang.bases) for (const m of moodTerms) searchTerms.push(`${b} ${m}`);
    if (searchTerms.length === 0) searchTerms.push(lang.bases[0]);

    let pool = [];

    for (const term of searchTerms.slice(0, 10)) {
      const searchURL = `https://api.spotify.com/v1/search?q=${encodeURIComponent(term)}&type=playlist&market=${lang.market}&limit=2`;
      const s = await fetch(searchURL, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json());

      const pls = s?.playlists?.items || [];
      for (const pl of pls) {
        const tURL = `https://api.spotify.com/v1/playlists/${pl.id}/tracks?limit=100&market=${lang.market}`;
        const t = await fetch(tURL, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json());

        (t.items || []).forEach(it => {
          const tr = it?.track;
          if (tr?.id && tr?.uri) {
            pool.push({
              id: tr.id,
              uri: tr.uri,
              name: tr.name,
              artist: tr.artists?.[0]?.name || "Unknown"
            });
          }
        });
      }
      if (pool.length >= 160) break;
    }

    // Fallback if none
    if (!pool.length) {
      const fb = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(lang.bases[0])}&type=playlist&market=${lang.market}&limit=1`,
        { headers: { Authorization: `Bearer ${token}` } }
      ).then(r => r.json());

      const pl = fb?.playlists?.items?.[0];
      if (pl?.id) {
        const t = await fetch(
          `https://api.spotify.com/v1/playlists/${pl.id}/tracks?limit=100&market=${lang.market}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ).then(r => r.json());

        (t.items || []).forEach(it => {
          const tr = it?.track;
          if (tr?.id && tr?.uri) {
            pool.push({
              id: tr.id,
              uri: tr.uri,
              name: tr.name,
              artist: tr.artists?.[0]?.name || "Unknown"
            });
          }
        });
      }
    }

    // Dedup + shuffle + slice 35
    const uniq = [...new Map(pool.map(x => [x.id, x])).values()];
    for (let i = uniq.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [uniq[i], uniq[j]] = [uniq[j], uniq[i]];
    }

    return res.status(200).json({ tracks: uniq.slice(0, 35) });
  } catch (err) {
    console.error("get-tracks error:", err);
    return res.status(500).json({ error: "Track fetch failed" });
  }
}
