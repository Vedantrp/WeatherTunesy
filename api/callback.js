import fetch from "node-fetch";

export default async function handler(req, res) {
  const code = req.query.code;

  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3000";

const redirect_uri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/callback`;


  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri,
    client_id: process.env.SPOTIFY_CLIENT_ID,
    client_secret: process.env.SPOTIFY_CLIENT_SECRET,
  });

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  const data = await tokenRes.json();

  if (data.error) {
    return res.status(400).send("Spotify Auth Failed: " + data.error);
  }

  const me = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  }).then((r) => r.json());

  return res.send(`
<script>
window.opener.postMessage({
  token: "${data.access_token}",
  refreshToken: "${data.refresh_token}",
  user: ${JSON.stringify(me)}
}, "*");
window.close();
</script>
`);
}
