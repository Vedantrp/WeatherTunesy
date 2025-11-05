import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const code = req.query.code;
    if (!code) {
      return res.status(400).send("Missing code");
    }

    const redirect_uri = "https://weather-tunes-xi.vercel.app/api/callback";

    // ✅ Base64 client auth
    const authHeader = Buffer.from(
      process.env.SPOTIFY_CLIENT_ID + ":" + process.env.SPOTIFY_CLIENT_SECRET
    ).toString("base64");

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri
    });

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${authHeader}`
      },
      body
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error("Spotify token error:", tokenData);
      return res.status(400).send("Spotify Auth Failed");
    }

    // ✅ Fetch user profile
    const userRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const user = await userRes.json();

    return res.send(`
      <script>
        window.opener.postMessage({
          type: 'SPOTIFY_AUTH_SUCCESS',
          accessToken: '${tokenData.access_token}',
          refreshToken: '${tokenData.refresh_token}',
          user: ${JSON.stringify(user)}
        }, '*');
        window.close();
      </script>
    `);
  } catch (err) {
    console.error("Callback error:", err);
    res.status(500).send("Callback failed");
  }
}
