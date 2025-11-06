// api/login.js

export default function handler(req, res) {
  // CRITICAL FIX: Use FRONTEND_URL from your .env file, not SITE_URL
  const redirect = encodeURIComponent(`${process.env.FRONTEND_URL}/api/callback`);
  const scope = "playlist-modify-public playlist-modify-private user-read-email";

  const authUrl =
    `https://accounts.spotify.com/authorize?client_id=${process.env.SPOTIFY_CLIENT_ID}` +
    `&response_type=code&redirect_uri=${redirect}&scope=${scope}`;

  // This pattern is correct and matches your app.js
  res.json({ authUrl });
}
