module.exports = async (req, res) => {
  const { refresh } = req.body;

  if (!refresh) {
    return res.status(400).json({ error: "Missing refresh token" });
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refresh,
    client_id: process.env.SPOTIFY_CLIENT_ID,
    client_secret: process.env.SPOTIFY_CLIENT_SECRET
  });

  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  const token = await r.json();

  if (!token.access_token) {
    return res.status(400).json({ error: "Failed to refresh token" });
  }

  res.status(200).json({ token: token.access_token });
};
