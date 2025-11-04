export default function handler(req, res) {
  try {
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const redirect_uri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/callback`;

    const scope = [
      "playlist-modify-private",
      "playlist-modify-public",
      "user-read-private",
      "user-read-email"
    ].join(" ");

    const authUrl =
      `https://accounts.spotify.com/authorize?` +
      `client_id=${client_id}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
      `&scope=${encodeURIComponent(scope)}`;

    return res.status(200).json({ authUrl });
  } catch (e) {
    return res.status(500).json({ error: "Auth URL failed" });
  }
}
