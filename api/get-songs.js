// /api/get-songs.js
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

    const { token, language, mood } = req.body;

    if (!token) return res.status(401).json({ error: "Missing token" });

    const langMap = {
      english: "pop",
      hindi: "bollywood",
      punjabi: "punjabi",
      tamil: "tamil",
      telugu: "telugu",
      spanish: "spanish",
      korean: "k-pop",
      japanese: "j-pop",
      french: "french pop"
    };

    const moodMap = {
      gloomy: "sad",
      rainy: "lofi",
      sunny: "happy",
      hot: "chill",
      cold: "acoustic",
      default: "mood"
    };

    const query = `${langMap[language] || "global"} ${moodMap[mood] || "mood"}`;
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=playlist&limit=1`;

    const playlist = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json());

    const id = playlist?.playlists?.items?.[0]?.id;
    if (!id) return res.json({ tracks: [] });

    const tracksRes = await fetch(
      `https://api.spotify.com/v1/playlists/${id}/tracks?limit=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    ).then(r => r.json());

    const songs = (tracksRes.items || [])
      .map(t => ({
        name: t.track?.name,
        artist: t.track?.artists?.[0]?.name,
        uri: t.track?.uri
      }))
      .filter(x => x.name && x.artist)
      .slice(0, 20);

    res.json({ tracks: songs });

  } catch (e) {
    console.error("Song error", e);
    res.status(500).json({ error: "Song fetch failed" });
  }
}
