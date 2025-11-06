import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
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
      body,
    });

    const tokenData = await tokenRes.json();

    const userRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json();

    res.setHeader("Content-Type", "text/html");

    return res.send(`
      <script>
        if (window.opener) {
          window.opener.postMessage({
            type: "SPOTIFY_AUTH_SUCCESS",
            token: "${tokenData.access_token}",
            refreshToken: "${tokenData.refresh_token}",
            user: ${JSON.stringify(userData)}
          }, "*");
          window.close();
        } else {
          document.body.innerHTML = "<h2>✅ Logged in. You can close this tab.</h2>";
        }
      </script>
    `);

  } catch (err) {
    console.error("Callback Error:", err);
    res.send(`
      <script>
        if (window.opener) {
          window.opener.postMessage({ error: "auth_failed" }, "*");
          window.close();
        } else {
          document.body.innerHTML = "<h2>❌ Login failed.</h2>";
        }
      </script>
    `);
  }
}
 
