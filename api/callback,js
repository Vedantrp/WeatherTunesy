// /api/callback.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const code = req.query.code;
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirect_uri = `${process.env.NEXTAUTH_URL || "https://weather-tunes-kappa.vercel.app"}/api/callback`;

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri,
      client_id,
      client_secret,
    });

    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return res.status(400).json({ error: tokenData.error_description || "Spotify authorization failed" });
    }

    const userResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userResponse.json();

    // Send data back to popup via postMessage
    return res.send(`
      <script>
        window.opener.postMessage(
          {
            type: 'SPOTIFY_AUTH_SUCCESS',
            token: '${tokenData.access_token}',
            refreshToken: '${tokenData.refresh_token}',
            user: ${JSON.stringify(userData)}
          },
          '*'
        );
        window.close();
      </script>
    `);
  } catch (error) {
    console.error("Callback Error:", error);
    res.status(500).send(`<script>window.opener.postMessage({ error: 'Callback failed' }, '*');window.close();</script>`);
  }
}
