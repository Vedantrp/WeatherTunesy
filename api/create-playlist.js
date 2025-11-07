export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

    const { token, userId, tracks, name = "WeatherTunes Mix" } = req.body;

    if (!token || !userId || !tracks?.length)
      return res.status(400).json({ error: "Missing data" });

    // 1️⃣ Create Playlist
    const create = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        description: "Weather-based auto playlist",
        public: false,
      }),
    });

    const playlist = await create.json();
    if (!playlist.id) return res.status(500).json({ error: "Create Failed" });

    // 2️⃣ Add Songs
    await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uris: tracks }),
    });

    return res.status(200).json({ link: playlist.external_urls.spotify });
  } catch (err) {
    console.error("CREATE PLAYLIST ERROR:", err);
    return res.status(500).json({ error: "Error creating playlist" });
  }
}
