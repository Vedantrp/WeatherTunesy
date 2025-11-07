export default async function handler(req, res) {
  try {
    const { token, userId, tracks } = req.body;

    const create = await fetch(
      `https://api.spotify.com/v1/users/${userId}/playlists`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: "WeatherTunes Playlist 🌤️",
          description: "Auto playlist powered by weather",
          public: false
        })
      }
    ).then(r => r.json());

    const playlistId = create.id;

    await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ uris: tracks })
      }
    );

    res.json({ url: create.external_urls.spotify });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Playlist creation failed" });
  }
}
