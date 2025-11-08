export default async function handler(req, res) {
  const code = req.query.code;
  const redirect = process.env.SPOTIFY_REDIRECT_URI;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirect,
    client_id: process.env.SPOTIFY_CLIENT_ID,
    client_secret: process.env.SPOTIFY_CLIENT_SECRET
  });

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  const tokenJson = await tokenRes.json();
  const accessToken = tokenJson.access_token;

  // Fetch user
  const user = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${accessToken}` }
  }).then(r => r.json());

  // Return HTML that SAFELY handles whether popup or not
  return res.send(`
    <script>
      const data = {
        type: "SPOTIFY_SUCCESS",
        token: "${accessToken}",
        user: ${JSON.stringify(user)}
      };

      try {
        // ✅ Try popup message first
        if (window.opener) {
          window.opener.postMessage(data, "*");
          window.close();
        } else {
          // ✅ Fallback (no popup)
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          window.location.href = "/";
        }
      } catch(e) {
        console.error("Callback error:", e);
        window.location.href = "/";
      }
    </script>
  `);
}
