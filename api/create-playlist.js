export default async function handler(req, res) {
  try {
    if (req.method !== "POST")
      return res.status(405).json({ error: "Only POST allowed" });

    const { token, userId, tracks } = req.body;

    if (!token || !userId || !tracks?.length) {
      return res.status(400).json({ error: "Missing data for playlist" });
    }

    // 1️⃣ Create empty playlist
    const playlistRes = await fetch(
      `https://api.spotify.com/v1/users/${userId}/playlists`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: `WeatherTunes Mix 🎵`,
          description: `Auto-generated weather-based playlist 🌦️`,
          public: false
        })
      }
    );

    const playlist = await playlistRes.json();
    if (!playlist.id) return res.status(500).json({ error: "Playlist failed" });

    // 2️⃣ Add tracks
    await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ uris: tracks.slice(0, 35) })
    });

    return res.status(200).json({
      playlistId: playlist.id,
      playlistUrl: playlist.external_urls.spotify
    });
  } catch (err) {
    console.error("Create playlist error:", err);
    res.status(500).json({ error: "Create playlist failed" });
  }
}
