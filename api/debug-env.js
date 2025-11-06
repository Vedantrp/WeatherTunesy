export default function handler(req, res) {
  res.json({
    SPOTIFY_REDIRECT_URI: process.env.SPOTIFY_REDIRECT_URI || null,
    SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID ? "✅" : "❌",
  });
}
