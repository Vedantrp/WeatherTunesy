export default async function handler(req, res) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken)
      return res.status(400).json({ error: "Missing refresh token" });

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.SPOTIFY_CLIENT_ID,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET,
    });

    const r = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const data = await r.json();
    if (!data.access_token) throw new Error("Refresh failed");

    res.json({
      accessToken: data.access_token
    });

  } catch (e) {
    console.error("REFRESH ERROR:", e);
    res.status(500).json({ error: "Token refresh failed" });
  }
}
