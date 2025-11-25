// /api/login.js
export default function handler(req, res){
  try {
    if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

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
    ].join(" ");

    const authUrl = "https://accounts.spotify.com/authorize" +
      "?response_type=code" +
      &client_id=${encodeURIComponent(clientId)} +
      &scope=${encodeURIComponent(scope)} +
      &redirect_uri=${encodeURIComponent(redirectUri)};

    res.status(200).json({ authUrl });
  } catch (err){
    console.error("LOGIN ERROR", err);
    res.status(500).json({ error: "Login handler crash" });
  }
}
