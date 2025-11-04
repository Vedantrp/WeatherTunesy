export default async function handler(req, res) {
  try {
    const code = req.query.code;
    const redirect_uri = "https://weather-tunes-kappa.vercel.app/api/callback";

    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri,
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET,
      }),
    });

    const tokenData = await tokenResponse.json();

    const userResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userResponse.json();

    return res.send(`
      <script>
        window.opener.postMessage({
          type: "SPOTIFY_AUTH_SUCCESS",
          token: "${tokenData.access_token}",
          refreshToken: "${tokenData.refresh_token}",
          user: ${JSON.stringify(userData)}
        }, "*");
        window.close();
      </script>
    `);
  } catch (err) {
    return res.send(`<script>alert("Login failed");window.close()</script>`);
  }
}
