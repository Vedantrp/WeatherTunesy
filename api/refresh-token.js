import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const { refreshToken } = req.body;

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.SPOTIFY_CLIENT_ID,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET
    });

    const r = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });

    const json = await r.json();
    return res.status(200).json({ accessToken: json.access_token });
  } catch (err) {
    res.status(500).json({ error: "Token refresh failed" });
  }
}
