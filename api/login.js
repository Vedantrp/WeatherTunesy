// /api/login.js
export default function handler(req, res) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(500).json({
      error: "ENV MISSING",
      clientId: !!clientId,
      redirectUri: !!redirectUri
    });
  }

  const scopes = [
    "playlist-modify-private",
    "playlist-modify-public",
    "user-read-email"
  ].join("%20");

  const authUrl = `https://accounts.spotify.com/authorize` +
    `?client_id=${clientId}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${scopes}`;

  res.status(200).json({ authUrl });
}
