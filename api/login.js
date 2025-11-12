export default function handler(req, res) {
  try {
    if (req.method !== "GET") return res.status(405).json({ error: "Only GET allowed" });

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const redirect = process.env.SPOTIFY_REDIRECT_URI;

    if (!clientId || !redirect) {
      return res.status(500).json({ error: "Missing env", clientId: !!clientId, redirect: !!redirect });
    }

    const scope = [
      "playlist-modify-private",
      "playlist-modify-public",
      "user-read-email"
    ].join("%20");

    const authUrl =
      `https://accounts.spotify.com/authorize?client_id=${clientId}` +
      `&response_type=code&redirect_uri=${encodeURIComponent(redirect)}` +
      `&scope=${scope}`;

    return res.status(200).json({ authUrl });
  } catch (e) {
    return res.status(500).json({ error: "Login handler crash" });
  }
}
