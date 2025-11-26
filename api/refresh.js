// /api/refresh.js
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
    const { refresh } = req.body || {};
    if (!refresh) return res.status(400).json({ error: "Missing refresh token" });

    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refresh,
      client_id: process.env.SPOTIFY_CLIENT_ID,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET
    });

    const r = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params
    });
    const data = await r.json();
    if (!data.access_token) return res.status(400).json({ error: "Spotify refresh failed", detail: data });
    res.status(200).json({ token: data.access_token });
  } catch (err) {
    res.status(500).json({ error: err.message || "Refresh failed" });
  }
}
