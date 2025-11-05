export default function handler(req, res) {
  const redirect = encodeURIComponent(`${process.env.SITE_URL}/api/callback`);
  const scope = "playlist-modify-public playlist-modify-private user-read-email";

  const authUrl =
    `https://accounts.spotify.com/authorize?client_id=${process.env.SPOTIFY_CLIENT_ID}` +
    `&response_type=code&redirect_uri=${redirect}&scope=${scope}`;

  res.json({ authUrl });
}
