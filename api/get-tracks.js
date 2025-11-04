// /api/get-tracks.js
export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "POST only" });

  try {
    const { language = "english", token } = req.body;
    if (!token) return res.status(401).json({ error: "Missing Spotify token" });

    const langConfig = {
      english: { q: ["english pop", "pop hits", "chill pop"], market: "US" },
      hindi: { q: ["bollywood", "hindi hits", "arijit singh"], market: "IN" },
      punjabi: { q: ["punjabi hits", "ap dhillon", "punjabi vibe"], market: "IN" },
      telugu: { q: ["telugu hits", "tollywood", "telugu lo-fi"], market: "IN" },
      tamil: { q: ["tamil hits", "kollywood", "tamil lo-fi"], market: "IN" },
      spanish: { q: ["latin hits", "reggaeton", "latin pop"], market: "ES" },
      korean: { q: ["k-pop", "kpop chill"], market: "KR" },
      japanese: { q: ["jpop", "anime songs"], market: "JP" },
    };

    const cfg = langConfig[language] || langConfig.english;

    let allTracks = [];

    // Search multiple sources, NOT just 1
    for (const term of cfg.q) {
      const search = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(
          term
        )}&type=playlist&market=${cfg.market}&limit=2`,
        { headers: { Authorization: `Bearer ${token}` } }
      ).then((r) => r.json());

      const playlists = search?.playlists?.items || [];
      for (const pl of playlists) {
        const t = await fetch(
          `https://api.spotify.com/v1/playlists/${pl.id}/tracks?limit=100&market=${cfg.market}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ).then((r) => r.json());

        const songs = (t.items || [])
          .filter((x) => x?.track?.id && x?.track?.uri)
          .map((x) => ({
            id: x.track.id,
            uri: x.track.uri,
            name: x.track.name,
            artist: x.track.artists?.[0]?.name || "",
          }));

        allTracks.push(...songs);
      }
    }

    // Deduplicate
    const seen = new Set();
    const unique = allTracks.filter((s) => !seen.has(s.id) && seen.add(s.id));

    if (unique.length === 0)
      return res.status(200).json({
        tracks: [],
        note: "No tracks found — try different language",
      });

    // Shuffle
    for (let i = unique.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unique[i], unique[j]] = [unique[j], unique[i]];
    }

    res.status(200).json({ tracks: unique.slice(0, 35) });
  } catch (err) {
    console.error("TRACK FETCH ERR ❌", err);
    res.status(500).json({ error: "Track fetch failed" });
  }
}
