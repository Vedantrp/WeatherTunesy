module.exports = async (req, res) => {
  const { token, userId, name, trackIds } = req.body;

  // 1. Create playlist
  const r1 = await fetch(
    `https://api.spotify.com/v1/users/${userId}/playlists`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        description: "WeatherTunes playlist",
        public: false
      })
    }
  );

  const playlist = await r1.json();

  if (!playlist.id) {
    return res.status(400).json({ error: "Playlist creation failed", playlist });
  }

  // 2. Add tracks
  const uris = trackIds.map((id) => `spotify:track:${id}`);

  await fetch(
    `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ uris })
    }
  );

  res.status(200).json({
    id: playlist.id,
    url: playlist.external_urls.spotify
  });
};
