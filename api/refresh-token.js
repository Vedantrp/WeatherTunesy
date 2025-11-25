// api/refresh-token.js
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ error: "Missing refreshToken" });

    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
    if (!client_id || !client_secret) {
      console.error("REFRESH: missing envs");
      return res.status(500).json({ error: "ENV VARS FAIL" });
    }

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken
    });

    const r = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(${client_id}:${client_secret}).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: body.toString()
    });

    const json = await r.json();
    if (!r.ok) {
      console.error("REFRESH FAILED:", json);
      return res.status(502).json({ error: "Token refresh failed", details: json });
    }

    return res.status(200).json({ accessToken: json.access_token, expiresIn: json.expires_in });
  } catch (err) {
    console.error("REFRESH ERROR:", err);
    return res.status(500).json({ error: "Token refresh crashed" });
  }
}
