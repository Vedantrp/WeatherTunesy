export default function handler(req, res) {
  const redirect = process.env.SPOTIFY_REDIRECT_URI;
  const client = process.env.SPOTIFY_CLIENT_ID;

  const scope = "playlist-modify-private playlist-modify-public user-read-email";

  const authUrl =
    `https://accounts.spotify.com/authorize?client_id=${client}` +
    `&response_type=code&redirect_uri=${encodeURIComponent(redirect)}` +
    `&scope=${encodeURIComponent(scope)}`;

  res.status(200).json({ authUrl });
}
