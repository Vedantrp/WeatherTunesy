export default async function handler(req, res) {
  const { token } = req.body;
  if (!token) return res.status(401).json({ error: "Missing token" });

  const q = encodeURIComponent("mood playlist");

  const search = await fetch(
    `https://api.spotify.com/v1/search?q=${q}&type=playlist&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  ).then(r => r.json());

  const playlist = search.playlists.items[0];
  if (!playlist) return res.json({ tracks: [] });

  const tracks = await fetch(
    `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?limit=20`,
    { headers: { Authorization: `Bearer ${token}` } }
  ).then(r => r.json());

  const result = (tracks.items || []).map(t => ({
    name: t.track.name,
    artist: t.track.artists[0].name
  }));

  return res.json({ tracks: result });
}
