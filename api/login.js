export default function handler(req, res) {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;

  const scopes = [
    "user-read-email",
    "playlist-modify-private",
    "playlist-modify-public"
  ].join("%20");

  const url =
    "https://accounts.spotify.com/authorize" +
    `?response_type=code` +
    `&client_id=${client_id}` +
    `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
    `&scope=${scopes}`;

  res.redirect(url);
}
