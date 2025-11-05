import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const code = req.query.code;
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirect_uri = "https://weather-tunes-xi.vercel.app/api/callback"; // ✅ EXACT

    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri,
        client_id,
        client_secret,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) throw new Error(tokenData.error_description);

    const userProfile = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    }).then(r => r.json());

    return res.send(`
      <script>
        window.opener.postMessage(
          {
            type: "SPOTIFY_AUTH_SUCCESS",
            token: "${tokenData.access_token}",
            refreshToken: "${tokenData.refresh_token}",
            user: ${JSON.stringify(userProfile)}
          },
          "*"
        );
        window.close();
      </script>
    `);
  } catch (err) {
    console.error("SPOTIFY CALLBACK ERROR:", err);
    return res.send(`
      <script>
        window.opener.postMessage({ error: "Spotify login failed" }, "*");
        window.close();
      </script>
    `);
  }
}
