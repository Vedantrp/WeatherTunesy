export default async function handler(req, res) {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const redirect_uri = "https://weather-tunes-kappa.vercel.app/api/callback";

  const scope =
    "user-read-email user-read-private playlist-modify-private playlist-modify-public";

  const authUrl = `https://accounts.spotify.com/authorize?` +
    `client_id=${client_id}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
    `&scope=${encodeURIComponent(scope)}`;

  res.status(200).json({ authUrl });
}
