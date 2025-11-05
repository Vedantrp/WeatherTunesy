export default function handler(req, res) {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const base = process.env.NEXT_PUBLIC_SITE_URL;   // ✅ must end WITHOUT slash
  const redirect_uri = `${base}/api/callback`;     // ✅ always one slash

  const scope = [
    "user-read-email",
    "playlist-modify-private",
    "playlist-modify-public"
  ].join(" ");

  const authUrl =
    `https://accounts.spotify.com/authorize` +
    `?client_id=${client_id}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
    `&scope=${encodeURIComponent(scope)}`;

  return res.status(200).json({ authUrl });
}
