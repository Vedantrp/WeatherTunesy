export const dynamic = "force-dynamic";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST")
      return res.status(405).json({ error: "POST only" });

    const { token, tracks } = req.body || {};
    if (!token) return res.status(401).json({ error: "Missing token" });
    if (!tracks || !tracks.length)
      return res.status(400).json({ error: "No tracks provided" });

    // 1) Get user profile to fetch user ID
    const userRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const user = await userRes.json();

    if (!user.id) {
      console.error("User fetch failed:", user);
      return res.status(400).json({ error: "Invalid Spotify token" });
    }

    // 2) Create playlist
    const createRes = await fetch(
      `https://api.spotify.com/v1/users/${user.id}/playlists`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `WeatherTunes — ${new Date().toLocaleDateString()}`,
          description: "Auto-generated weather-based playlist by WeatherTunes",
          public: false,
        }),
      }
    );

    const playlist = await createRes.json();

   if (!playlist || playlist.error) {
  console.error("Playlist creation failed:", playlist);
  return res.status(400).json({
    error: "Couldn't create playlist",
    detail: playlist.error || playlist
  });
}


    const playlistId = playlist.id;

    // 3) Add tracks
    const uris = tracks.map((t) => t.uri).filter(Boolean);

    if (uris.length) {
      await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ uris }),
        }
      );
    }

    // 4) Return the playlist URL
    return res.status(200).json({
      success: true,
      url: playlist.external_urls.spotify,
    });

  } catch (err) {
    console.error("CREATE PLAYLIST ERROR:", err);
    return res.status(500).json({ error: "Playlist creation failed" });
  }
}
