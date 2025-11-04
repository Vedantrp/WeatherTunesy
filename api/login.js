export default async function handler(req, res) {
  const redirect = process.env.SPOTIFY_REDIRECT_URI;
  const scope = "user-read-email playlist-modify-private playlist-modify-public";

  const url =
    "https://accounts.spotify.com/authorize" +
    `?client_id=${process.env.SPOTIFY_CLIENT_ID}` +
    "&response_type=code" +
    `&redirect_uri=${encodeURIComponent(redirect)}` +
    `&scope=${encodeURIComponent(scope)}`;

  res.redirect(url);
}
