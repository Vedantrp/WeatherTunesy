export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end(); // Handle preflight requests
  }

  // ...rest of your logic below
}

// /api/login.js
export default async function handler(req, res) {
  try {
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirect_uri = `${process.env.NEXTAUTH_URL || "https://weather-tunes-kappa.vercel.app"}/api/callback`;

    console.log("ENV CHECK:", {
      id: client_id,
      secret: client_secret ? "set" : "missing",
      url: process.env.NEXTAUTH_URL,
    });

    if (!client_id || !client_secret) {
      return res.status(500).json({ error: "Missing Spotify credentials" });
    }

    const scope = "playlist-modify-public playlist-modify-private user-read-email user-read-private";
    const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${client_id}&scope=${encodeURIComponent(
      scope
    )}&redirect_uri=${encodeURIComponent(redirect_uri)}`;

    return res.status(200).json({ authUrl });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Failed to create Spotify auth URL" });
  }
}
