import fetch from "node-fetch";

export default async function handler(req, res) {
  const { code } = req.query;

  const redirect = process.env.NEXTAUTH_URL + "/api/callback";

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirect,
    client_id: process.env.SPOTIFY_CLIENT_ID,
    client_secret: process.env.SPOTIFY_CLIENT_SECRET,
  });

  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  const t = await r.json();
  const ur = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${t.access_token}` },
  }).then(r => r.json());

  return res.send(`
    <script>
      window.opener.postMessage(
        { type: "SPOTIFY_AUTH_SUCCESS", token: "${t.access_token}", refreshToken: "${t.refresh_token}", user: ${JSON.stringify(
          ur
        )} },
        "*"
      ); window.close();
    </script>
  `);
}
