// /api/login.js
export default async function handler(req, res) {
  try {
    const { SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI } = process.env;
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_REDIRECT_URI)
      return res.status(500).json({ error: "Missing Spotify env vars" });

    const scope = [
      "user-read-email",
      "playlist-modify-public",
      "playlist-modify-private"
    ].join(" ");

    const authUrl =
      "https://accounts.spotify.com/authorize" +
      `?response_type=code` +
      `&client_id=${encodeURIComponent(SPOTIFY_CLIENT_ID)}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&redirect_uri=${encodeURIComponent(SPOTIFY_REDIRECT_URI)}`;

    res.status(200).json({ authUrl });
  } catch (err) {
    res.status(500).json({ error: err.message || "Login error" });
  }
}
