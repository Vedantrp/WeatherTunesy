// /api/login.js
export default function handler(req, res) {
  try {
    // CORS - allow any origin (adjust for prod to your domain only)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const redirect_uri = (process.env.NEXTAUTH_URL || "https://weather-tunes-kappa.vercel.app") + "/api/callback";
    if (!client_id) {
      console.error("Missing SPOTIFY_CLIENT_ID");
      return res.status(500).json({ error: "Missing SPOTIFY_CLIENT_ID" });
    }

    const scope = [
      "playlist-modify-private",
      "playlist-modify-public",
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
    console.log("Generated authUrl");
    return res.status(200).json({ authUrl });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Login route failed" });
  }
}
