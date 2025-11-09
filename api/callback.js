import fetch from "node-fetch";

export default async function handler(req, res) {
  const code = req.query.code;
  if (!code) return res.status(400).send("No code");

  try {
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET
      })
    });

    const data = await tokenRes.json();
    if (!data.access_token) return res.status(400).send("Token error");

    const userRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${data.access_token}` }
    });

    const user = await userRes.json();
    const htmlUser = encodeURIComponent(JSON.stringify(user));

    // Secure callback UI
    res.send(`
<!DOCTYPE html>
<html>
<body style="background:#0b0f1a;color:white;font-family:sans-serif;text-align:center;padding-top:50px;">
  <h2>✅ Login successful</h2>
  <p>Returning to app…</p>

<script>
(function(){
  const payload = {
    type: "SPOTIFY_AUTH_SUCCESS",
    token: "${data.access_token}",
    user: ${JSON.stringify(user)}
  };

  if (window.opener) {
    window.opener.postMessage(payload, "*");
    window.close();
  } else if (window.parent) {
    window.parent.postMessage(payload, "*");
  } else {
    document.body.innerHTML = "<h3>Login complete. Please return to app.</h3>";
  }
})();
</script>
</body>
</html>
    `);

  } catch(e) {
    console.error(e);
    res.status(500).send("Callback crash");
  }
}
