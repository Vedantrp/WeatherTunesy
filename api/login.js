export default function handler(req, res) {
  const redirect = encodeURIComponent(`${process.env.FRONTEND_URL}/api/callback`);
  const scope = "playlist-modify-private playlist-modify-public user-read-email";

  const url =
    `https://accounts.spotify.com/authorize?client_id=${process.env.SPOTIFY_CLIENT_ID}` +
    `&response_type=code&redirect_uri=${redirect}&scope=${scope}`;

  return res.status(200).json({ authUrl: url });
}
