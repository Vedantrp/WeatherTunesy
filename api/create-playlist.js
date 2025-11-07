export default async function handler(req, res) {
  try {
    const { token, tracks = [], name = "WeatherTunes Mix", description = "" } = req.body || {};
    if (!token) return res.status(401).json({ error: "Missing token" });
    if (!tracks.length) return res.status(400).json({ error: "No tracks to add" });

    // User
    const user = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json());
    if (!user?.id) return res.status(400).json({ error: "Invalid user" });

    // Create playlist
    const playlist = await fetch(`https://api.spotify.com/v1/users/${user.id}/playlists`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        description,
        public: false
      })
    }).then(r => r.json());

    if (!playlist?.id) return res.status(500).json({ error: "Failed to create playlist" });

    // Add tracks
    await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ uris: tracks })
    });

    res.json({ url: playlist.external_urls.spotify });
  } catch (e) {
    console.error("CREATE PLAYLIST ERROR:", e);
    res.status(500).json({ error: "Internal error" });
  }
}
