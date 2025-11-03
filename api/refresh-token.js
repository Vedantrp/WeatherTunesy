// /api/refresh-token.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { refreshToken } = req.body;
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
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
      return res.status(400).json({ error: tokenData.error_description });
    }

    res.status(200).json({
      accessToken: tokenData.access_token,
      expiresIn: tokenData.expires_in,
    });
  } catch (error) {
    console.error("Token Refresh Error:", error);
    res.status(500).json({ error: "Failed to refresh Spotify token" });
  }
}
