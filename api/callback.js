import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const code = req.query.code;
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri,
      client_id,
      client_secret,
    });

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      return res.send(`<script>window.opener.postMessage({type:'SPOTIFY_AUTH_ERROR', error:${JSON.stringify(tokenData)}}, '*');window.close();</script>`);
    }

    const meRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const user = await meRes.json();

    return res.send(`
      <script>
        window.opener && window.opener.postMessage(
          {
            type: "SPOTIFY_AUTH_SUCCESS",
            accessToken: "${tokenData.access_token}",
            refreshToken: "${tokenData.refresh_token || ""}",
            user: ${JSON.stringify(user)}
          },
          "*"
        );
        window.close();
      </script>
    `);
  } catch (e) {
    return res.send(`<script>window.opener && window.opener.postMessage({type:'SPOTIFY_AUTH_ERROR', error:'callback_failed'}, '*');window.close();</script>`);
  }
}
