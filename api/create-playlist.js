export default async function handler(req, res) {
  try {
    const { token, name, description, uris = [] } = req.body || {};
    if (!token) return res.status(401).json({ error: "Missing token" });
    if (!uris.length) return res.status(400).json({ error: "No URIs" });

    const me = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r=>r.json());

    const created = await fetch(`https://api.spotify.com/v1/users/${me.id}/playlists`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type":"application/json"
      },
      body: JSON.stringify({
        name: name || "WeatherTunes Mix",
        description: description || "Auto-generated weather mix",
        public: false
      })
    }).then(r=>r.json());

    if (!created?.id) return res.status(500).json({ error: "Create failed" });

    await fetch(`https://api.spotify.com/v1/playlists/${created.id}/tracks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type":"application/json"
      },
      body: JSON.stringify({ uris })
    });

    res.json({ id: created.id, url: created.external_urls?.spotify });
  } catch (e) {
    res.status(500).json({ error: "Create failed" });
  }
}
