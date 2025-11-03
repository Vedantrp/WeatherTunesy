// /api/callback.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const code = req.query.code;
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirect_uri = (process.env.NEXTAUTH_URL || process.env.BASE_URL || "https://weather-tunes-kappa.vercel.app") + "/api/callback";

    if (!code) {
      return res.status(400).send("Missing code");
    }
    if (!client_id || !client_secret) {
      console.error("Missing client id/secret");
      return res.status(500).send("Server misconfigured");
    }

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri,
      client_id,
      client_secret
    });

    const tokenResp = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });

    const tokenData = await tokenResp.json();
    if (!tokenResp.ok) {
      console.error("Token exchange failed:", tokenData);
      return res.status(400).send("Token exchange failed: " + (tokenData.error_description || JSON.stringify(tokenData)));
    }

    const access_token = tokenData.access_token;
    const refresh_token = tokenData.refresh_token;

    // fetch user profile
    const userResp = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const userData = await userResp.json();

    // send script to popup to postMessage to opener
    return res.send(`
      <html><body>
        <script>
          try {
            const payload = {
              type: "SPOTIFY_AUTH_SUCCESS",
              token: ${JSON.stringify(access_token)},
              refreshToken: ${JSON.stringify(refresh_token)},
              user: ${JSON.stringify(userData)}
            };
            window.opener.postMessage(payload, "*");
            window.close();
          } catch(e) {
            window.opener.postMessage({ type: "SPOTIFY_AUTH_ERROR", error: e?.message || "callback error" }, "*");
            window.close();
          }
        </script>
        <p>Authentication complete. You can close this window.</p>
      </body></html>
    `);
  } catch (err) {
    console.error("Callback error:", err);
    res.status(500).send(`<script>window.opener.postMessage({ type: "SPOTIFY_AUTH_ERROR", error: "Callback failed" }, "*");window.close();</script>`);
  }
}
