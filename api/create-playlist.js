import fetch from "node-fetch";

export default async function handler(req,res){
  const {token,tracks} = req.body;

  const me = await fetch("https://api.spotify.com/v1/me",{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json());
  const pl = await fetch(`https://api.spotify.com/v1/users/${me.id}/playlists`,{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      Authorization:`Bearer ${token}`
    },
    body:JSON.stringify({name:`WeatherTunes Mood Mix`,public:false})
  }).then(r=>r.json());

  await fetch(`https://api.spotify.com/v1/playlists/${pl.id}/tracks`,{
    method:"POST",
    headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
    body:JSON.stringify({uris:tracks.map(x=>x.uri)})
  });

  res.json({url:pl.external_urls.spotify});
}
