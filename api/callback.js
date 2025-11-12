import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send("Missing code");

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type":"application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      return res.status(400).send(`Auth failed: ${tokenData.error_description || "Unknown"}`);
    }

    const me = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    }).then(r => r.json());

    // Post token back to opener
    return res.send(`
      <script>
        try {
          (window.opener || window.parent).postMessage(
            {
              type:'SPOTIFY_AUTH_SUCCESS',
              token: ${JSON.stringify(tokenData.access_token)},
              user: ${JSON.stringify(me)}
            },
            '*'
          );
        } catch(e) {}
        setTimeout(()=>window.close(), 100);
      </script>
    `);
  } catch (e) {
    return res.status(500).send("Callback crash");
  }
}
