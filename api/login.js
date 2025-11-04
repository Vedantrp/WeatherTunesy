export default async function handler(req, res) {
  const redirect = process.env.NEXTAUTH_URL + "/api/callback";
  const scope = "playlist-modify-private playlist-modify-public user-read-email";

  const url = `https://accounts.spotify.com/authorize?response_type=code&client_id=${process.env.SPOTIFY_CLIENT_ID}&scope=${encodeURIComponent(
    scope
  )}&redirect_uri=${encodeURIComponent(redirect)}`;

  res.redirect(url);
}
