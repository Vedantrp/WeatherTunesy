export const dynamic = "force-dynamic";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST")
      return res.status(405).json({ error: "POST only" });

    const { refresh_token } = req.body || {};
    if (!refresh_token) return res.status(400).json({ error: "Missing refresh_token" });

    const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
    const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

    if (!CLIENT_ID || !CLIENT_SECRET) {
      console.error("Missing spotify client env vars");
      return res.status(500).json({ error: "Server misconfigured" });
    }

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    });

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error("Refresh token failed:", tokenData);
      return res.status(400).json({ error: "Refresh failed", detail: tokenData });
    }

    // Spotify returns access_token and sometimes a new refresh_token.
    return res.status(200).json({
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
      refresh_token: tokenData.refresh_token || null,
    });
  } catch (err) {
    console.error("REFRESH TOKEN ERROR:", err);
    return res.status(500).json({ error: "Refresh failed", detail: err.message });
  }
}
