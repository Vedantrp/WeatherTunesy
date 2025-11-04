import fetch from "node-fetch";

export default async function handler(req, res) {
  const code = req.query.code;
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri,
    client_id,
    client_secret,
  });

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  const tokenData = await tokenRes.json();

  const userRes = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });

  const userData = await userRes.json();

  return res.send(`
    <script>
      window.opener.postMessage(
        {
          type:"SPOTIFY_AUTH_SUCCESS",
          accessToken:"${tokenData.access_token}",
          refreshToken:"${tokenData.refresh_token}",
          user:${JSON.stringify(userData)}
        },
        "*"
      );
      window.close();
    </script>
  `);
}
