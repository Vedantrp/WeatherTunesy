// api/callback.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  const code = req.query.code;
  
  // CRITICAL FIX: Use FRONTEND_URL to match your .env file
  const redirect = `${process.env.FRONTEND_URL}/api/callback`;

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirect,
    client_id: process.env.SPOTIFY_CLIENT_ID,
    client_secret: process.env.SPOTIFY_CLIENT_SECRET
  });

  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });
  
  const j = await r.json();

  res.json({ accessToken: j.access_token });
}
