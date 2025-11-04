export default async function handler(req, res) {
  try {
    const code = req.query.code;

    if (!code) {
      console.log("NO CODE RETURNED from Spotify, closing popup.");
      return res.send("<script>window.close();</script>");
    }

    const redirect_uri = "https://weather-tunes-kappa.vercel.app/api/callback";

    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri,
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error("TOKEN ERROR:", tokenData);
      return res.send("<script>window.close();</script>");
    }

    const user = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    }).then(r => r.json());

    return res.send(`
      <script>
        window.opener.postMessage({
          type: 'SPOTIFY_AUTH_SUCCESS',
          token: '${tokenData.access_token}',
          refreshToken: '${tokenData.refresh_token}',
          user: ${JSON.stringify(user)}
        }, "*");
        window.close();
      </script>
    `);

  } catch (err) {
    console.error("Callback Error:", err);
    return res.send("<script>window.close();</script>");
  }
}
