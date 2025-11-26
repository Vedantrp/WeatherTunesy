module.exports = async (req, res) => {
  const code = req.query.code;

  if (!code) return res.status(400).json({ error: "Missing code" });

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
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
    return res.status(400).json({ error: "Invalid Token Response", token });
  }

  const userRes = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${token.access_token}` }
  });

  const user = await userRes.json();

  // Return JSON to frontend popup
  return res.status(200).send(`
    <script>
      window.opener.postMessage({
        type: "SPOTIFY_AUTH_SUCCESS",
        token: "${token.access_token}",
        refresh: "${token.refresh_token}",
        user: ${JSON.stringify(user)}
      }, "*");
      window.close();
    </script>
  `);
};
