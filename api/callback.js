import fetch from "node-fetch";

export default async function handler(req, res) {
  const code = req.query.code;
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI } = process.env;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    client_id: SPOTIFY_CLIENT_ID,
    client_secret: SPOTIFY_CLIENT_SECRET,
  });

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token;

  const userRes = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const userData = await userRes.json();

  return res.send(`
    <script>
      window.opener.postMessage({
        type: "SPOTIFY_AUTH",
        accessToken: "${accessToken}",
        refreshToken: "${refreshToken}",
        user: ${JSON.stringify(userData)}
      }, "*");
      window.close();
    </script>
  `);
}
