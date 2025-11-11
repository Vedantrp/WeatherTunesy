import fetch from "node-fetch";

export default async function handler(req, res) {
  const code = req.query.code;
  if (!code) return res.status(400).send("No code");

  try {
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
    const data = await tokenRes.json();
    if (!data.access_token) return res.status(400).send("Token error");

    const meRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${data.access_token}` }
    });
    const user = await meRes.json();

    res.setHeader("Content-Type","text/html; charset=utf-8");
    res.end(`
<!DOCTYPE html><html><body style="background:#0b0f1a;color:white;font-family:sans-serif;text-align:center;padding-top:40px">
<h2>✅ Login successful</h2><p>Returning to app…</p>
<script>
(function(){
  var payload = { type:"SPOTIFY_AUTH_SUCCESS", token:"${data.access_token}", user:${JSON.stringify(user)} };
  try {
    if (window.opener) { window.opener.postMessage(payload,"*"); window.close(); return; }
    if (window.parent) { window.parent.postMessage(payload,"*"); return; }
  } catch(_) {}
  document.body.innerHTML = "<h3>Login complete. Please return to the app window.</h3>";
})();
</script>
</body></html>
    `);
  } catch (e) {
    console.error("CALLBACK ERR", e);
    res.status(500).send("Callback crash");
  }
}
