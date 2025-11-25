import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "GET only" });
    }
 
    const code = req.query.code;
    if (!code) {
      return res.status(400).send("No code provided");
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return res.status(500).send("Missing environment variables");
    }

    // 1️⃣ Exchange CODE ➜ ACCESS TOKEN
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return res.status(400).send("Token error: " + tokenData.error_description);
    }

    // 2️⃣ Get user profile
    const userRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: Bearer ${tokenData.access_token} },
    });

    const userData = await userRes.json();

    // 3️⃣ Return a small HTML page to send data back to opener
    return res.send(`
      <script>
        window.opener.postMessage({
          type: "SPOTIFY_AUTH_SUCCESS",
          token: "${tokenData.access_token}",
          refreshToken: "${tokenData.refresh_token || ""}",
          user: ${JSON.stringify(userData)}
        }, "*");
        window.close();
      </script>
    `);

  } catch (e) {
    console.error("CALLBACK ERROR:", e);
    return res.status(500).send("Callback failed");
  }
}
