export default async function(req,res){
  const { language, token, save, tracks } = req.body;

  const query = {
    english:"english pop",
    hindi:"bollywood",
    punjabi:"punjabi hits",
    korean:"kpop",
    spanish:"latin hits"
  }[language] || "global hits";

  if(!save){
    const r = await fetch(
      `https://api.spotify.com/v1/search?q=${query}&type=track&limit=30`,
      { headers:{ Authorization:`Bearer ${token}` } }
    );

    const j = await r.json();
    const tr = j.tracks.items.map(t=>({
      name:t.name, uri:t.uri, artist:t.artists[0].name
    }));

    return res.json({ tracks:tr });
  }

  // --- Save playlist
  const create = await fetch(`https://api.spotify.com/v1/me/playlists`,{
    method:"POST",
    headers:{ Authorization:`Bearer ${token}`, "Content-Type":"application/json"},
    body:JSON.stringify({ name:"WeatherTunes", public:false })
  }).then(r=>r.json());

  await fetch(`https://api.spotify.com/v1/playlists/${create.id}/tracks`,{
    method:"POST",
    headers:{Authorization:`Bearer ${token}`, "Content-Type":"application/json"},
    body:JSON.stringify({ uris:tracks.map(t=>t.uri) })
  });

  res.json({ url:create.external_urls.spotify });
}
