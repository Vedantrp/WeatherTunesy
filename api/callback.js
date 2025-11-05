export default async function handler(req, res) {
  try {
    const code = req.query.code;

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: "https://weather-tunes-xi.vercel.app/api/callback", // ✅ SAME EXACT
      client_id: process.env.SPOTIFY_CLIENT_ID,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET
    });

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error_description);

    const me = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    }).then(r => r.json());

    res.send(`
      <script>
        window.opener.postMessage(
          {
            type: "SPOTIFY_AUTH_SUCCESS",
            token: "${tokenData.access_token}",
            refreshToken: "${tokenData.refresh_token}",
            user: ${JSON.stringify(me)}
          },
          "*"
        );
        window.close();
      </script>
    `);

  } catch (err) {
    console.error(err);
    res.send(`
      <script>
        alert("Spotify login failed.");
        window.close();
      </script>
    `);
  }
}
