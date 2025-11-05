export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const { token, tracks = [], mood = "vibes" } = req.body || {};
    if (!token) return res.status(401).json({ error: "Missing token" });
    if (!tracks.length) return res.status(400).json({ error: "No tracks" });

    // Get user id from /me
    const me = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json());

    if (!me?.id) return res.status(401).json({ error: "Invalid/expired token" });

    // Create playlist
    const create = await fetch(`https://api.spotify.com/v1/users/${me.id}/playlists`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `WeatherTunes – ${mood}`,
        description: "Auto-generated weather mix",
        public: false
      })
    }).then(r => r.json());

    if (!create?.id) return res.status(400).json({ error: "Create failed" });

    // Add tracks
    await fetch(`https://api.spotify.com/v1/playlists/${create.id}/tracks`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ uris: tracks.slice(0, 100) })
    });

    return res.status(200).json({ url: create.external_urls?.spotify || null, id: create.id });
  } catch (e) {
    return res.status(500).json({ error: "Create playlist failed" });
  }
}
