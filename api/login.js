export default async function handler(req, res) {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const redirect_uri = "https://weather-tunes-kappa.vercel.app/api/callback";

  console.log("LOGIN --> redirect_uri:", redirect_uri);
  console.log("LOGIN --> client_id:", client_id);

  const scope = [
    "playlist-modify-private",
    "playlist-modify-public",
    "user-read-email",
    "user-read-private"
  ].join(" ");

  const authUrl =
    `https://accounts.spotify.com/authorize?response_type=code` +
    `&client_id=${client_id}` +
    `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
    `&scope=${encodeURIComponent(scope)}`;

  console.log("LOGIN --> authUrl:", authUrl);

  res.status(200).json({ authUrl });
}
