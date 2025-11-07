const langProfiles = {
  english: { market: "US", base: "english chill" },
  hindi: { market: "IN", base: "bollywood lofi" },
  punjabi: { market: "IN", base: "punjabi chill" },
  tamil: { market: "IN", base: "tamil chill" },
  telugu: { market: "IN", base: "telugu chill" },
  kannada: { market: "IN", base: "kannada songs" },
  malayalam: { market: "IN", base: "malayalam chill" },
  bengali: { market: "IN", base: "bengali songs" },
  marathi: { market: "IN", base: "marathi songs" },
  korean: { market: "KR", base: "kpop chill" },
  japanese: { market: "JP", base: "jpop chill" },
  spanish: { market: "ES", base: "latin chill" },
};

const moods = {
  chill: "lofi chill",
  sad: "sad emotional",
  happy: "happy upbeat",
  energetic: "workout edm",
  party: "party hits"
};

export default async function handler(req, res) {
  try {
    const { token, language="english", mood="chill" } = req.body;
    if (!token) return res.status(401).json({ error: "Missing token" });

    const lang = langProfiles[language] || langProfiles.english;
    const q = `${lang.base} ${moods[mood]}`;

    const search = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=playlist&market=${lang.market}&limit=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    ).then(r => r.json());

    const playlist = search.playlists.items?.[0];
    if (!playlist) return res.json({ tracks: [] });

    const tracks = await fetch(
      `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?limit=40`,
      { headers: { Authorization: `Bearer ${token}` } }
    ).then(r => r.json());

    const items = (tracks.items || []).map(i => ({
      name: i.track.name,
      artist: i.track.artists[0].name
    }));

    res.json({ tracks: items.slice(0, 25) });

  } catch (err) {
    console.error("Song error:", err);
    res.status(500).json({ error: "Song fetch failed" });
  }
}
