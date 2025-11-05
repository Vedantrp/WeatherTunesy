import fetch from "node-fetch";

export default async function handler(req,res){
  const code = req.query.code;
  const redirect = `${process.env.VERCEL_URL}/api/callback`;

  const params = new URLSearchParams({
    grant_type:"authorization_code",
    code,
    redirect_uri:redirect,
    client_id:process.env.SPOTIFY_CLIENT_ID,
    client_secret:process.env.SPOTIFY_CLIENT_SECRET
  });

  const r = await fetch("https://accounts.spotify.com/api/token",{
    method:"POST", headers:{ "Content-Type":"application/x-www-form-urlencoded"},
    body:params
  });
  const j = await r.json();

  const me = await fetch("https://api.spotify.com/v1/me",{
    headers:{ Authorization:`Bearer ${j.access_token}` }
  }).then(r=>r.json());

  res.send(`
  <script>
  window.opener.postMessage({
    token: "${j.access_token}",
    user: ${JSON.stringify(me)}
  }, "*");
  window.close();
  </script>`);
}
