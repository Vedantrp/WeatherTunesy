export default async function handler(req,res){
  const {token, tracks} = req.body;

  const me = await fetch("https://api.spotify.com/v1/me",{headers:{Authorization:`Bearer ${token}`}});
  const meData = await me.json();

  const pl = await fetch(`https://api.spotify.com/v1/users/${meData.id}/playlists`,{
    method:"POST",
    headers:{
      Authorization:`Bearer ${token}`,
      "Content-Type":"application/json"
    },
    body: JSON.stringify({
      name:"WeatherTunes Playlist",
      description:"Auto created",
      public:false
    })
  }).then(r=>r.json());

  const uris = tracks.map(t=>t.uri);
  await fetch(`https://api.spotify.com/v1/playlists/${pl.id}/tracks`,{
    method:"POST",
    headers:{
      Authorization:`Bearer ${token}`,
      "Content-Type":"application/json"
    },
    body: JSON.stringify({ uris })
  });

  res.json({ url: pl.external_urls.spotify });
}
