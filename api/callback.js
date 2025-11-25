export default async function handler(req, res){
  try {
    const { code } = req.query;
    if (!code) return res.status(400).send("Missing code");

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri){
      console.error("Missing env in callback");
      return res.status(500).send("Server misconfigured");
    }

    // exchange code for token
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type":"application/x-www-form-urlencoded",
        "Authorization":"Basic " + Buffer.from(${clientId}:${clientSecret}).toString("base64")
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri
      })
    });

    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error("Token error", tokenJson);
      const errMsg = tokenJson.error_description || tokenJson.error || "Token exchange failed";
      // send a front-end message if opened as popup
      return res.status(400).send(<script>window.opener && window.opener.postMessage({ type:'SPOTIFY_AUTH_ERROR', error:${JSON.stringify(errMsg)} }, '*'); window.close();</script>);
    }

    const accessToken = tokenJson.access_token;
    const refreshToken = tokenJson.refresh_token;

    // fetch user profile
    const profileRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: Bearer ${accessToken} }
    });
    const profileJson = await profileRes.json();

    // post message to opener window and close
    const payload = {
      type: "SPOTIFY_AUTH_SUCCESS",
      accessToken,
      refreshToken,
      user: profileJson
    };

    // return tiny html that posts message to opener window
    const html = `
      <html><body>
        <script>
          try {
            window.opener && window.opener.postMessage(${JSON.stringify(payload)}, "*");
          } catch(e){ console.error(e) }
          // close after a small timeout
          setTimeout(()=> window.close(), 600);
        </script>
        <p>Logging you in... If nothing happens, close this window and retry.</p>
      </body></html>
    `;
    res.setHeader("content-type","text/html");
    res.status(200).send(html);
  } catch (err){
    console.error("CALLBACK ERROR", err);
    res.status(500).send("Callback failed");
  }
}
