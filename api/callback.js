// /api/callback.js
export default async function handler(req, res) {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send("Missing code");

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
      client_id: process.env.SPOTIFY_CLIENT_ID,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET
    });

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      const body = JSON.stringify(tokenData);
      res.setHeader("Content-Type", "text/html");
      return res.status(400).send(`<pre>Token exchange failed: ${body}</pre>`);
    }

    const userRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const user = await userRes.json();

    // Send token back to opener and close popup
    res.setHeader("Content-Type", "text/html");
    res.send(`
      <script>
        try {
          window.opener.postMessage(
            {
              type: "SPOTIFY_AUTH_SUCCESS",
              token: "${tokenData.access_token}",
              refresh: "${tokenData.refresh_token}",
              user: ${JSON.stringify(user)}
            },
            "*"
          );
        } catch(e) {
          // ignore
        }
        window.close();
      </script>
    `);
  } catch (err) {
    res.status(500).send("Callback crashed: " + (err.message || err));
  }
}
