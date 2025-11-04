// /api/callback.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const code = req.query.code;

    const redirect_uri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI; // ✅ now present!

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri,
      client_id: process.env.SPOTIFY_CLIENT_ID,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET
    });

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });

    const tokenData = await tokenRes.json();

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
    const userData = await userRes.json();

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
    console.error("Spotify callback error >> ", err);
    return res.send(`
      <script>
        window.opener.postMessage({ error: "Callback failed" }, "*");
        window.close();
      </script>
    `);
  }
}
