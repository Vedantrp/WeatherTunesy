import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send("Missing code");

    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri,
      client_id,
      client_secret
    });

    const tokenResp = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });
    const tokenData = await tokenResp.json();
    if (tokenData.error) {
      return res.status(400).send(`<script>window.opener && window.opener.postMessage({ error: "${tokenData.error}" }, "*"); window.close();</script>`);
    }

    const meResp = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const user = await meResp.json();

    return res.send(`
      <script>
        if (window.opener && typeof window.opener.postMessage === 'function') {
          window.opener.postMessage({
            type: 'SPOTIFY_AUTH_SUCCESS',
            token: '${tokenData.access_token}',
            refreshToken: '${tokenData.refresh_token || ""}',
            user: ${JSON.stringify(user)}
          }, '*');
        }
        window.close();
      </script>
    `);
  } catch (e) {
    console.error("CALLBACK ERROR:", e);
    return res
      .status(500)
      .send(`<script>window.opener && window.opener.postMessage({ error: "Callback failed" }, "*"); window.close();</script>`);
  }
}
