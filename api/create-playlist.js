export default async function handler(req, res) {
  try {
    if (req.method !== "POST")
      return res.status(405).json({ error: "POST only" });

    const { token, userId, name, trackIds } = req.body || {};

    if (!token) return res.status(400).json({ error: "Missing token" });
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    // Create playlist
    const r1 = await fetch(
      `https://api.spotify.com/v1/users/${userId}/playlists`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description: "WeatherTunes playlist",
          public: false,
        }),
      }
    );

    const playlist = await r1.json();
    if (!playlist.id)
      return res.status(400).json({ error: "Failed to create playlist" });

    // Add tracks
    const uris = trackIds.map((id) => `spotify:track:${id}`);

    await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uris }),
    });

    res.json({
      id: playlist.id,
      url: playlist.external_urls.spotify,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Server crashed" });
  }
}
