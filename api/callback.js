export default async function handler(req, res) {
  try {
    const code = req.query.code;
    if (!code) {
      return res.status(400).send(`<script>
        window.opener && window.opener.postMessage({ type:'SPOTIFY_AUTH_ERROR' }, '*');
        window.close();
      </script>`);
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret
    });

    const tokenResp = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });
    const tokenData = await tokenResp.json();

    if (!tokenResp.ok || tokenData.error) {
      return res.status(400).send(`<script>
        window.opener && window.opener.postMessage({ type:'SPOTIFY_AUTH_ERROR' }, '*');
        window.close();
      </script>`);
    }

    // fetch user
    const me = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    }).then(r=>r.json());

    // return to opener
    return res.status(200).send(`
      <script>
        window.opener && window.opener.postMessage(
          {
            type: 'SPOTIFY_AUTH_SUCCESS',
            token: '${tokenData.access_token}',
            refreshToken: '${tokenData.refresh_token || ""}',
            user: ${JSON.stringify(me)}
          },
          '*'
        );
        window.close();
      </script>
    `);
  } catch (err) {
    console.error("CALLBACK ERROR:", err);
    res.send(`
<script>
  window.opener.postMessage({
    type: "SPOTIFY_AUTH_SUCCESS",
    token: "${accessToken}",
    user: ${JSON.stringify(user)}
  }, "*");

  window.close();
</script>`);
  }
}
