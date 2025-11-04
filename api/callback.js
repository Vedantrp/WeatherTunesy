import fetch from "node-fetch";

export default async function handler(req, res) {
  console.log("✅ Spotify callback triggered");

  const code = req.query.code;
  if (!code) {
    return res.send(`
      <h2>❌ No code received from Spotify</h2>
      <p>Means Spotify blocked redirect.</p>
      <button onclick="window.close()">Close</button>
    `);
  }

  try {
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI,
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET
      })
    });

    const tokenData = await tokenRes.json();
    console.log("🔐 Token Data:", tokenData);

    if (tokenData.error) {
      return res.send(`
        <h2>⚠️ Spotify Token Error</h2>
        <p>${tokenData.error}</p>
        <p>${tokenData.error_description || ""}</p>
        <button onclick="window.close()">Close</button>
      `);
    }

    const userRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    const user = await userRes.json();
    console.log("👤 Spotify User:", user);

    return res.send(`
      <h2>✅ Login Success</h2>
      <p>Sending data back to your app…</p>

      <script>
        window.opener.postMessage({
          type: "SPOTIFY_AUTH_SUCCESS",
          token: "${tokenData.access_token}",
          refreshToken: "${tokenData.refresh_token || ""}",
          user: ${JSON.stringify(user)}
        }, "*");

        setTimeout(() => window.close(), 1000);
      </script>
    `);

  } catch (e) {
    console.error("Callback Error:", e);
    return res.send("<h2>❌ Callback crashed</h2><p>Check console logs</p>");
  }
}
