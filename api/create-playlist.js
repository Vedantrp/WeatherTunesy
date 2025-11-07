export default async function handler(req, res) {
  try {
    const { token, tracks } = req.body;
    if (!token) return res.status(400).json({ error: "Missing token" });

    // 1) Get User ID
    const userData = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json());

    // 2) Create Playlist
    const playlist = await fetch(
      `https://api.spotify.com/v1/users/${userData.id}/playlists`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: "WeatherTunes Mix 🌦️🎵",
          public: false,
          description: "Songs auto-generated based on weather mood"
        })
      }
    ).then(r => r.json());

    // 3) Add tracks
    await fetch(
      `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ uris: tracks })
      }
    );

    res.json({ url: playlist.external_urls.spotify });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Playlist failed" });
  }
}
