// /api/get-songs.js
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
    const { token, language = "English", mood = "chill" } = req.body || {};
    if (!token) return res.status(400).json({ error: "Missing token" });

    const q = `${mood} ${language} songs`;
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=12`;

    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await r.json();

    if (!data.tracks || !data.tracks.items) return res.status(400).json({ error: "No tracks found", detail: data });

    const tracks = data.tracks.items.map(t => ({
      id: t.id,
      name: t.name,
      artist: t.artists?.map(a=>a.name).join(", "),
      url: t.external_urls?.spotify,
      image: t.album?.images?.[0]?.url || ""
    }));

    res.status(200).json({ tracks });
  } catch (err) {
    res.status(500).json({ error: err.message || "get-songs crashed" });
  }
}
