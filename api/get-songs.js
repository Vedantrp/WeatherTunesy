const profiles = {
  english:{market:"US", seeds:["chill pop","indie pop","feel good"]},
  hindi:{market:"IN", seeds:["bollywood chill","arijit singh"]},
  punjabi:{market:"IN", seeds:["punjabi hits","ap dhillon"]},
  tamil:{market:"IN", seeds:["tamil hits","anirudh"]},
  telugu:{market:"IN", seeds:["telugu hits","sid sriram"]},
  kannada:{market:"IN", seeds:["kannada lo-fi"]},
  malayalam:{market:"IN", seeds:["malayalam hits"]},
  bengali:{market:"IN", seeds:["bengali lo-fi"]},
  marathi:{market:"IN", seeds:["marathi hits"]},
  korean:{market:"KR", seeds:["k-pop chill"]},
  japanese:{market:"JP", seeds:["j-pop chill"]},
  spanish:{market:"ES", seeds:["latin chill"]}
}; 

export default async function handler(req,res){
  const { token, language, mood } = req.body;
  const p = profiles[language] || profiles.english;

  const q = encodeURIComponent(`${p.seeds[0]} ${mood}`);

  const search = await fetch(
    `https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${p.market}&limit=1`,
    { headers:{Authorization:`Bearer ${token}`} }
  ).then(r=>r.json());

  const pl = search.playlists.items[0];

  const tr = await fetch(
    `https://api.spotify.com/v1/playlists/${pl.id}/tracks?limit=80`,
    { headers:{Authorization:`Bearer ${token}`} }
  ).then(r=>r.json());

  const list = (tr.items||[])
  .map(i=>({
    name:i.track.name,
    artist:i.track.artists[0].name,
    uri:i.track.uri
  }))
  .slice(0,35);

  res.json({tracks:list});
}
