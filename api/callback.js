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
      headers: {"Content-Type":"application/x-www-form-urlencoded"},
      body
    });
    const tokens = await tokenResp.json();
    if (tokens.error) {
      return res.send(`<script>
        window.opener && window.opener.postMessage({type:"SPOTIFY_AUTH_ERROR", error:"${tokens.error}"}, "*");
        window.close();
      </script>`);
    }

    const me = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    }).then(r => r.json());

    return res.send(`
      <script>
        if (window.opener) {
          window.opener.postMessage({
            type: "SPOTIFY_AUTH_SUCCESS",
            token: "${tokens.access_token}",
            refreshToken: "${tokens.refresh_token || ""}",
            user: ${JSON.stringify(me)}
          }, "*");
        }
        window.close();
      </script>
    `);
  } catch (e) {
    return res.send(`<script>
      window.opener && window.opener.postMessage({type:"SPOTIFY_AUTH_ERROR"}, "*");
      window.close();
    </script>`);
  }
}
