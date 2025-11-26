// /api/create-playlist.js
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

    const { token, userId, name = "WeatherTunes Playlist", trackIds = [] } = req.body || {};
    if (!token) return res.status(400).json({ error: "Missing token" });
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    // Create playlist
    const r1 = await fetch(`https://api.spotify.com/v1/users/${encodeURIComponent(userId)}/playlists`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        description: "Auto-created by WeatherTunes",
        public: false
      })
    });
    const playlist = await r1.json();
    if (!playlist.id) return res.status(400).json({ error: "Failed to create playlist", detail: playlist });

    // Add tracks
    const uris = trackIds.map(id => `spotify:track:${id}`);
    const r2 = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ uris })
    });
    const added = await r2.json();

    res.status(200).json({ id: playlist.id, url: playlist.external_urls?.spotify, added });
  } catch (err) {
    res.status(500).json({ error: err.message || "create-playlist crashed" });
  }
}
