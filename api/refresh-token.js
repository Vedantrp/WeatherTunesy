export default async function handler(req,res){
  const {refreshToken} = req.body;

  const body = new URLSearchParams({
    grant_type:"refresh_token",
    refresh_token:refreshToken,
    client_id:process.env.SPOTIFY_CLIENT_ID,
    client_secret:process.env.SPOTIFY_CLIENT_SECRET
  });

  const r = await fetch("https://accounts.spotify.com/api/token",{
    method:"POST",
    headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body
  });

  const d = await r.json();
  res.json({accessToken:d.access_token});
}
