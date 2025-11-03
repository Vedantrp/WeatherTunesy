// /api/login.js
export default async function handler(req, res) {
  // === 1️⃣ Add CORS headers (for cross-origin frontend) ===
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end(); // quick response to preflight
  }

  // === 2️⃣ Actual Spotify login logic ===
  try {
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const redirect_uri = `${process.env.NEXTAUTH_URL || "https://weather-tunes-kappa.vercel.app"}/api/callback`;

    const scope = [
      "user-read-private",
      "user-read-email",
      "playlist-modify-public",
      "playlist-modify-private"
    ].join(" ");

    const authUrl = new URL("https://accounts.spotify.com/authorize");
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("client_id", client_id);
    authUrl.searchParams.append("scope", scope);
    authUrl.searchParams.append("redirect_uri", redirect_uri);

    return res.status(200).json({ authUrl: authUrl.toString() });
  } catch (error) {
    console.error("Login API error:", error);
    return res.status(500).json({ error: "Failed to generate Spotify login URL" });
  }
}
