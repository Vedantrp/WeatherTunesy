// /api/callback.js
export default async function handler(req, res) {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send("Missing ?code= from Spotify");
  }

  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirect_uri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/callback`;

  try {
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri,
        client_id,
        client_secret
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.status(400).send("Spotify Token Error: " + (tokenData.error || "Unknown"));
    }

    // Get profile
    const userRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const userData = await userRes.json();

    // Send back to popup
    return res.send(`
      <script>
        window.opener.postMessage(
          {
            type: "SPOTIFY_AUTH_SUCCESS",
            accessToken: "${tokenData.access_token}",
            refreshToken: "${tokenData.refresh_token}",
            user: ${JSON.stringify(userData)}
          },
          "*"
        );
        window.close();
      </script>
    `);
  } catch (e) {
    return res.status(500).send("Callback failed");
  }
}
