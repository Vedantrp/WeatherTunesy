export default async function handler(req, res) {
  const code = req.query.code;
  if (!code) return res.status(400).send("No code");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    client_id: process.env.SPOTIFY_CLIENT_ID,
    client_secret: process.env.SPOTIFY_CLIENT_SECRET
  });

  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  const tok = await r.json();
  if (!tok.access_token) return res.send("Auth failed");

  const userR = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${tok.access_token}` }
  });
  const user = await userR.json();

  return res.send(`
    <script>
      window.opener.postMessage({
        type: "SPOTIFY_AUTH_SUCCESS",
        token: "${tok.access_token}",
        refreshToken: "${tok.refresh_token}",
        user: ${JSON.stringify(user)}
      }, "*");
      window.close();
    </script>
  `);
}
