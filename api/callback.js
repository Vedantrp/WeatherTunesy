import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const code = req.query.code;

    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", process.env.SPOTIFY_REDIRECT_URI);
    params.append("client_id", process.env.SPOTIFY_CLIENT_ID);
    params.append("client_secret", process.env.SPOTIFY_CLIENT_SECRET);

    const r = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      body: params
    }).then(r=>r.json());

    const user = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${r.access_token}` }
    }).then(r=>r.json());

    return res.send(`
      <script>
        window.opener.postMessage({
          type:'SPOTIFY_AUTH_SUCCESS',
          token:'${r.access_token}',
          refreshToken:'${r.refresh_token}',
          user:${JSON.stringify(user)}
        }, "*");
        window.close();
      </script>
    `);
  } catch (e) {
    return res.send(`<script>alert("Login failed");window.close();</script>`);
  }
}
