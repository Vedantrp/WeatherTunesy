export default function handler(req, res) {
  const redirect = encodeURIComponent("https://weather-tunes-xi.vercel.app/api/callback");

  const authUrl =
    `https://accounts.spotify.com/authorize?client_id=${process.env.SPOTIFY_CLIENT_ID}` +
    `&response_type=code&redirect_uri=${redirect}` +
    `&scope=user-read-email playlist-modify-private playlist-modify-public`;

  res.json({ authUrl });
}
