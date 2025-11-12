import fetch from "node-fetch";

export default async function handler(req,res){
  const code = req.query.code;
  const body = new URLSearchParams({
    grant_type:"authorization_code",
    code,
    redirect_uri:process.env.SPOTIFY_REDIRECT_URI,
    client_id:process.env.SPOTIFY_CLIENT_ID,
    client_secret:process.env.SPOTIFY_CLIENT_SECRET
  });

  const r = await fetch("https://accounts.spotify.com/api/token",{
    method:"POST", headers:{ "Content-Type":"application/x-www-form-urlencoded" }, body
  });
  const json = await r.json();

  const me = await fetch("https://api.spotify.com/v1/me",{ headers:{Authorization:`Bearer ${json.access_token}`}});
  const user = await me.json();

  res.send(`
  <script>
    window.opener.postMessage({ type:"SPOTIFY_AUTH_SUCCESS", token:"${json.access_token}", user:${JSON.stringify(user)} }, "*");
    window.close();
  </script>`);
}
