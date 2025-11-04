import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const code = req.query.code;
    const redirect_uri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/callback`;

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri,
      client_id: process.env.SPOTIFY_CLIENT_ID,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET,
    });

    const tokenReq = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const token = await tokenReq.json();
    if (token.error) throw new Error("Invalid token");

    const userReq = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });

    const user = await userReq.json();

    return res.send(`
      <script>
        window.opener.postMessage({
          type: 'SPOTIFY_AUTH_SUCCESS',
          token: '${token.access_token}',
          refreshToken: '${token.refresh_token}',
          user: ${JSON.stringify(user)}
        }, "*");
        window.close();
      </script>
    `);
  } catch (e) {
    return res.send(`<script>window.close();</script>`);
  }
}
