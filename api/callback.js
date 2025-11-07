export default async function handler(req, res) {
  try {
    const code = req.query.code;
    const cid = process.env.SPOTIFY_CLIENT_ID;
    const sec = process.env.SPOTIFY_CLIENT_SECRET;
    const redirect = process.env.SPOTIFY_REDIRECT_URI;

    const basic = Buffer.from(`${cid}:${sec}`).toString("base64");
    const token = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(redirect)}`
    }).then(r => r.json());

    const user = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${token.access_token}` }
    }).then(r => r.json());

    res.send(`
      <script>
        window.opener.postMessage({
          type: "SPOTIFY_AUTH_SUCCESS",
          token: "${token.access_token}",
          user: ${JSON.stringify(user)}
        }, "*");
        window.close();
      </script>
    `);
  } catch (e) {
    console.error("CALLBACK ERROR:", e);
    res.status(500).send("<script>window.close()</script>");
  }
}
