// /api/get-tracks.js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { language = "english", mood = "relaxed", token } = req.body;
  if (!token) return res.status(401).json({ error: "Missing Spotify token" });

  const LANG = {
    english: { market: "US", base: ["english pop", "indie pop", "global pop"] },
    hindi: {
      market: "IN",
      base: [
        "bollywood hits",
        "arijit singh",
        "hindi mix",
        "bollywood acoustic",
        "bollywood lofi",
        "romantic bollywood",
        "hindi chill",
      ],
    },
    punjabi: { market: "IN", base: ["punjabi hits", "ap dhillon", "punjabi vibe"] },
    telugu: { market: "IN", base: ["telugu hits", "tollywood", "telugu love"] },
    tamil: { market: "IN", base: ["tamil hits", "kollywood", "tamil chill"] },
    spanish: { market: "ES", base: ["latin pop", "reggaeton hits"] },
    korean: { market: "KR", base: ["kpop", "korean chill"] },
    japanese: { market: "JP", base: ["jpop", "anime soundtrack"] },
  };

  const MOOD = {
    relaxed: ["lofi", "chill", "acoustic"],
    cozy: ["lofi", "soft", "rain"],
    romantic: ["love", "romantic", "heart", "valentine", "arijit singh"],
    mysterious: ["lofi dark", "midnight", "ambient"],
    party: ["party", "dance"],
    workout: ["workout", "energy"],
    energetic: ["boost", "edm", "dance"],
    sleep: ["sleep", "calm", "piano"],
    focus: ["study", "focus", "instrumental"],
  };

  const lang = LANG[language] || LANG.english;
  const moods = MOOD[mood] || ["chill"];

  try {
    let searchTerms = [];

    lang.base.forEach((b) => {
      moods.forEach((m) => searchTerms.push(`${b} ${m}`));
    });

    // 🎯 Bollywood fallback if Hindi has low result
    if (language === "hindi" && mood === "mysterious") {
      searchTerms.push("bollywood lofi", "arijit singh sad", "bollywood calm");
    }

    console.log("🎧 Searching Spotify for:", searchTerms);

    let tracksCollected = [];

    for (const term of searchTerms.slice(0, 12)) {
      const q = encodeURIComponent(term);
      const searchURL = `https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${lang.market}&limit=1`;

      const search = await fetch(searchURL, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json());

      const playlist = search?.playlists?.items?.[0];
      if (!playlist) continue;

      const tracksURL = `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?limit=100&market=${lang.market}`;
      const tdata = await fetch(tracksURL, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json());

      (tdata.items || []).forEach((it) => {
        const t = it.track;
        if (!t?.id) return;
        tracksCollected.push({
          id: t.id,
          uri: t.uri,
          name: t.name,
          artist: t.artists?.[0]?.name || "Unknown",
        });
      });

      if (tracksCollected.length >= 200) break;
    }

    // ❗ minimum fallback
    if (tracksCollected.length < 10) {
      console.log("⚠️ Low results — using emergency Bollywood fallback");
      const fallback = await fetch(
        `https://api.spotify.com/v1/search?q=bollywood%20hits&type=playlist&market=IN&limit=1`,
        { headers: { Authorization: `Bearer ${token}` } }
      ).then((r) => r.json());

      const pls = fallback?.playlists?.items?.[0];
      if (pls?.id) {
        const t = await fetch(
          `https://api.spotify.com/v1/playlists/${pls.id}/tracks?limit=100`,
          { headers: { Authorization: `Bearer ${token}` } }
        ).then((r) => r.json());

        (t.items || []).forEach((it) => {
          const x = it.track;
          if (!x?.id) return;
          tracksCollected.push({
            id: x.id,
            uri: x.uri,
            name: x.name,
            artist: x.artists?.[0]?.name,
          });
        });
      }
    }

    // Dedupe + shuffle
    const unique = [...new Map(tracksCollected.map((t) => [t.id, t])).values()];
    const shuffled = unique.sort(() => Math.random() - 0.5);

    return res.json({
      count: shuffled.length,
      tracks: shuffled.slice(0, 80),
    });
  } catch (e) {
    console.error("🔥 Spotify fetch error", e);
    return res.status(500).json({ error: "Spotify fetch failed" });
  }
}
