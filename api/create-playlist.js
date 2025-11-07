export default async function handler(req,res){
  const { token, tracks, mood } = req.body;

  const me = await fetch("https://api.spotify.com/v1/me", {
    headers:{Authorization:`Bearer ${token}`}
  }).then(r=>r.json());

  const p = await fetch(
    `https://api.spotify.com/v1/users/${me.id}/playlists`,
    {
      method:"POST",
      headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
      body:JSON.stringify({
        name:`WeatherTunes – ${mood}`,
        public:false
      })
    }
  ).then(r=>r.json());

  await fetch(`https://api.spotify.com/v1/playlists/${p.id}/tracks`,{
    method:"POST",
    headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
    body:JSON.stringify({uris:tracks.map(t=>t.uri)})
  });

  res.json({playlistUrl:p.external_urls.spotify});
}
