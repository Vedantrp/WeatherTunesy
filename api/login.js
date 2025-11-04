// /api/login.js
export default function handler(req, res) {
  const redirectUri = encodeURIComponent(process.env.SPOTIFY_REDIRECT_URI);

  const authUrl =
    "https://accounts.spotify.com/authorize" +
    `?client_id=${process.env.SPOTIFY_CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${redirectUri}` +
    `&scope=playlist-modify-private playlist-modify-public user-read-email`;

  return res.status(200).json({ authUrl });
}
