// /api/callback.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const code = req.query.code;
    if (!code) {
      return res
        .status(400)
        .send(`<script>window.opener.postMessage({ error: 'Missing authorization code' }, '*'); window.close();</script>`);
    }

    // Spotify credentials
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

    // Handle both local and Vercel environments dynamically
    const baseUrl =
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    const redirect_uri = `${baseUrl}/api/callback`;

    // Exchange authorization code for access + refresh tokens
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

    if (!tokenResponse.ok || tokenData.error) {
      console.error("Spotify Token Error:", tokenData);
      return res.status(400).send(`
        <script>
          window.opener.postMessage({
            error: 'Spotify token exchange failed: ${tokenData.error_description || "Unknown error"}'
          }, '*');
          window.close();
        </script>
      `);
    }

    // Fetch user profile with access token
    const userResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userData = await userResponse.json();

    if (!userResponse.ok) {
      console.error("Spotify User Fetch Error:", userData);
      return res.status(400).send(`
        <script>
          window.opener.postMessage({
            error: 'Failed to fetch user info from Spotify.'
          }, '*');
          window.close();
        </script>
      `);
    }

    // ✅ Send access/refresh tokens + user info back to frontend popup
    res.setHeader("Content-Type", "text/html");
    return res.send(`
      <script>
        window.opener.postMessage(
          {
            type: "SPOTIFY_AUTH_SUCCESS",
            token: "${tokenData.access_token}",
            refreshToken: "${tokenData.refresh_token || ""}",
            user: ${JSON.stringify(userData)}
          },
          window.opener.origin || "*"
        );
        window.close();
      </script>
    `);
  } catch (error) {
    console.error("Callback Error:", error);
    res.status(500).send(`
      <script>
        window.opener.postMessage({ error: "Spotify callback failed" }, "*");
        window.close();
      </script>
    `);
  }
}
