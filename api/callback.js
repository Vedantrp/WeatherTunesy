import fetch from "node-fetch";

export default async function handler(req, res) {
  const code = req.query.code;
  const redirect = `${process.env.SPOTIFY_REDIRECT_URI}/api/callback`;

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: redirect,
      client_id: process.env.SPOTIFY_CLIENT_ID,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET
    })
  });

  const token = await tokenRes.json();

  if (!token.access_token) {
    return res.status(400).send(`Auth failed: ${token.error_description}`);
  }

  const userRes = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${token.access_token}` }
  });
  const user = await userRes.json();

  return res.send(`
    <script>
      window.opener.postMessage({
        type: "SPOTIFY_AUTH",
        token: "${token.access_token}",
        refresh: "${token.refresh_token}",
        user: ${JSON.stringify(user)}
      }, "*");
      window.close();
    </script>
  `);
}
