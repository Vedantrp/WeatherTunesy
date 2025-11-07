export default async function handler(req, res) {
  const { token, language="english" } = req.body;

  if (!token) return res.status(401).json({ error: "No token" });

  const market = language === "hindi" ? "IN" : "US";
  const q = language === "hindi" ? "bollywood hits" : "english chill";

  const search = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=playlist&market=${market}&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  ).then(r => r.json());

  const playlist = search.playlists.items?.[0];
  if (!playlist) return res.json({ tracks: [] });

  const tracks = await fetch(
    `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?limit=30`,
    { headers: { Authorization: `Bearer ${token}` } }
  ).then(r => r.json());

  const items = (tracks.items || []).map(i => ({
    name: i.track.name,
    artist: i.track.artists[0].name
  }));

  res.json({ tracks: items });
}
