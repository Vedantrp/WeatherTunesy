// /api/login.js
export default function handler(req, res) {
  try {
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const redirect_uri = (process.env.NEXTAUTH_URL || process.env.BASE_URL || "https://weather-tunes-kappa.vercel.app") + "/api/callback";
    if (!client_id) return res.status(500).json({ error: "Server misconfigured: missing SPOTIFY_CLIENT_ID" });

    const scope = [
      "playlist-modify-public",
      "playlist-modify-private",
      "user-read-email",
      "user-read-private"
    ].join(" ");

    const params = new URLSearchParams({
      response_type: "code",
      client_id,
      scope,
      redirect_uri,
      show_dialog: "true"
    });

    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
    res.status(200).json({ authUrl });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login route failed" });
  }
}
