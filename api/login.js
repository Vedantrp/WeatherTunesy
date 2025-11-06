// /api/login.js
export default function handler(req, res) {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return res.status(500).json({
        error: "ENV VARS FAIL",
        clientId: !!clientId,
        redirectUri: !!redirectUri
      });
    }

    const scope = [
      "playlist-modify-private",
      "playlist-modify-public",
      "user-read-email"
    ].join("%20");

    const authUrl = `https://accounts.spotify.com/authorize` +
      `?client_id=${clientId}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${scope}`;

    return res.status(200).json({ authUrl });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ error: "Login handler crash" });
  }
}
