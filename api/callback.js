// /api/callback.js
export default async function handler(req, res) {
  try {
    const code = req.query.code;
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;

    if (!code) {
      return res.status(400).send("❌ Missing code from Spotify");
    }

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri,
        client_id,
        client_secret
      })
    });

    const tokenData = await tokenRes.json();
    console.log("🎧 Spotify Token Response:", tokenData);

    if (tokenData.error) {
      return res.send(`
        <script>
          window.opener.postMessage({ error: "${tokenData.error}" }, "*");
          window.close();
        </script>
      `);
    }

    const userRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: "Bearer " + tokenData.access_token }
    });

    const user = await userRes.json();

    return res.send(`
      <script>
        window.opener.postMessage({
          token: "${tokenData.access_token}",
          refresh: "${tokenData.refresh_token}",
          user: ${JSON.stringify(user)}
        }, "*");
        window.close();
      </script>
    `);

  } catch (err) {
    console.error("❌ Callback Error:", err);
    return res.send(`
      <script>
        window.opener.postMessage({ error: "callback_crashed" }, "*");
        window.close();
      </script>
    `);
  }
}
