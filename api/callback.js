// /api/callback.js

export default async function handler(req, res) {
  try {
    const code = req.query.code;

    if (!code) return res.status(400).send("Missing code");

    const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
    const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
    const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    });

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const token = await tokenRes.json();

    if (token.error) {
      console.error("Spotify token error:", token);
      return res.status(400).json(token);
    }

    const userRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });

    const user = await userRes.json();

    return res.send(`
      <script>
        window.opener.postMessage({
          type: "SPOTIFY_AUTH_SUCCESS",
          token: "${token.access_token}",
          user: ${JSON.stringify(user)}
        }, "*");
        window.close();
      </script>
    `);
  } catch (err) {
    console.error("CALLBACK ERROR:", err);
    return res.status(500).send("Callback crashed");
  }
}
