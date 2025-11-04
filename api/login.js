export default function handler(req, res) {
 const redirect_uri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI;

  const client_id = process.env.SPOTIFY_CLIENT_ID;

  console.log("SPOTIFY LOGIN redirect ->", redirect_uri);

  const scope = [
    "playlist-modify-private",
    "playlist-modify-public",
    "user-read-email",
    "user-read-private"
  ].join(" ");

  const authUrl =
    `https://accounts.spotify.com/authorize?` +
    `response_type=code` +
    `&client_id=${client_id}` +
    `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
    `&scope=${encodeURIComponent(scope)}`;

  res.status(200).json({ authUrl });
}
