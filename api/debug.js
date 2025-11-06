
export default function handler(req, res) {
  res.json({
    CLIENT_ID: process.env.SPOTIFY_CLIENT_ID ?? "❌ NULL",
    REDIRECT: process.env.SPOTIFY_REDIRECT_URI ?? "❌ NULL"
  });
}
 
