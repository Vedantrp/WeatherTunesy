// api/login.js

export default function handler(req, res) {
  // CRITICAL FIX: Use FRONTEND_URL to match your .env file
  const redirect = encodeURIComponent(`${process.env.FRONTEND_URL}/api/callback`);
  const scope = "playlist-modify-public playlist-modify-private user-read-email";

  const authUrl =
    `https://accounts.spotify.com/authorize?client_id=${process.env.SPOTIFY_CLIENT_ID}` +
    `&response_type=code&redirect_uri=${redirect}&scope=${scope}`;

  res.json({ authUrl });
}
