// /api/login.js

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Only GET allowed" });
    }

    const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
    const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

    if (!CLIENT_ID || !REDIRECT_URI) {
      console.error("Missing env vars");
      return res.status(500).json({ error: "Missing env vars" });
    }

    const scope =
      "user-read-email user-read-private playlist-read-private playlist-read-collaborative";

    const params = new URLSearchParams({
      response_type: "code",
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope,
    }).toString();

    return res.status(200).json({
      authUrl: `https://accounts.spotify.com/authorize?${params}`
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ error: "Login failed" });
  }
}
