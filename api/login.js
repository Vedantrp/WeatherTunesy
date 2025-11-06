// /api/login.js
export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Only GET allowed" });
  }

  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  const clientId = process.env.SPOTIFY_CLIENT_ID;

  if (!redirectUri || !clientId) {
    return res.status(500).json({
      error: "Missing env vars SPOTIFY_CLIENT_ID or SPOTIFY_REDIRECT_URI",
    });
  }

  const scope = [
    "playlist-modify-private",
    "playlist-modify-public",
    "user-read-email"
  ].join("%20");

  const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${scope}`;

  return res.status(200).json({ authUrl });
}
