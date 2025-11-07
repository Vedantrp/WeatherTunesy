export default async function handler(req,res){
  const code = req.query.code;
  const creds = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64");

  const token = await fetch("https://accounts.spotify.com/api/token",{
    method:"POST",
    headers:{Authorization:`Basic ${creds}`,"Content-Type":"application/x-www-form-urlencoded"},
    body:`grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(process.env.SPOTIFY_REDIRECT_URI)}`
  }).then(r=>r.json());

  const user = await fetch("https://api.spotify.com/v1/me",{
    headers:{Authorization:`Bearer ${token.access_token}`}
  }).then(r=>r.json());

  res.send(`
    <script>
      window.opener.postMessage({
        type:"SPOTIFY_AUTH_SUCCESS",
        token:"${token.access_token}",
        user:${JSON.stringify(user)}
      },"*");
      window.close();
    </script>
  `);
}
