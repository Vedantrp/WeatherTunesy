// api/callback.js
// Node / Next serverless handler for Spotify OAuth callback.
// It exchanges code => tokens, fetches /v1/me, posts message to opener.

export default async function handler(req, res) {
  try {
    // Only GET (Spotify will redirect with ?code=)
    if (req.method !== "GET") {
      return res.status(405).send("Method Not Allowed");
    }

    const code = req.query.code;
    if (!code) {
      console.error("CALLBACK: missing code query param", req.query);
      return res.status(400).send("Missing code");
    }

    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;

    if (!client_id || !client_secret || !redirect_uri) {
      console.error("CALLBACK: missing envs", {
        client_id: !!client_id,
        client_secret: !!client_secret,
        redirect_uri: !!redirect_uri
      });
      return res.status(500).send("Server env configuration error");
    }

    // Exchange code for tokens
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri
    });

    const tokenResp = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + Buffer.from(${client_id}:${client_secret}).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: body.toString()
    });

    const tokenData = await tokenResp.json();
    if (!tokenResp.ok) {
      console.error("CALLBACK: token exchange failed", tokenData);
      // Send a minimal postMessage to the opener so the popup doesn't hang
      return res.status(502).send(`
        <script>
          window.opener && window.opener.postMessage({ type: 'SPOTIFY_AUTH_ERROR', error: ${JSON.stringify(tokenData)} }, "*");
          window.close();
        </script>
      `);
    }

    // tokenData has access_token, refresh_token, expires_in
    const access_token = tokenData.access_token;

    // Get user's profile
    const userResp = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: Bearer ${access_token} }
    });
    const userData = await userResp.json();
    if (!userResp.ok) {
      console.error("CALLBACK: user fetch failed", userData);
      return res.status(502).send(`
        <script>
          window.opener && window.opener.postMessage({ type: 'SPOTIFY_AUTH_ERROR', error: ${JSON.stringify(userData)} }, "*");
          window.close();
        </script>
      `);
    }

    // Successful — post to opener and close popup
    // Escape tokens & user safely into the HTML string
    const safe = (v) => JSON.stringify(v).replace(/</g, "\\u003c");

    return res.status(200).send(`
      <html>
        <body>
          <script>
            try {
              window.opener && window.opener.postMessage({
                type: 'SPOTIFY_AUTH_SUCCESS',
                token: ${safe(tokenData.access_token)},
                refreshToken: ${safe(tokenData.refresh_token)},
                expiresIn: ${safe(tokenData.expires_in)},
                user: ${safe(userData)}
              }, '*');
            } catch (e) {
              console.error('postMessage error', e);
            }
            window.close();
          </script>
          <div style="font-family:sans-serif;padding:20px">Logging in... you can close this window.</div>
        </body>
      </html>
    `);
  } catch (err) {
    console.error("CALLBACK ERROR:", err);
    // Log full error and return a short page so user knows to check server logs
    return res.status(500).send(`
      <html><body>
        <h3>Server error during Spotify callback</h3>
        <pre>${String(err.message || err)}</pre>
        <p>Check server logs for details.</p>
      </body></html>
    `);
  }
}
