// /api/create-playlist.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { accessToken, playlistName, description, trackUris } = req.body;

    // Get user profile
    const userRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const user = await userRes.json();

    // Create playlist
    const playlistRes = await fetch(`https://api.spotify.com/v1/users/${user.id}/playlists`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: playlistName, description, public: true }),
    });

    const playlist = await playlistRes.json();

    // Add tracks
    await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uris: trackUris }),
    });

    res.status(200).json({
      playlist: {
        id: playlist.id,
        name: playlist.name,
        url: playlist.external_urls.spotify,
      },
    });
  } catch (error) {
    console.error("Create Playlist Error:", error);
    res.status(500).json({ error: "Failed to create Spotify playlist" });
  }
}
