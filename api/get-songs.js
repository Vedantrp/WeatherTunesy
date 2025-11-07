const profiles = {
  english: { market:"US", seeds:["chill pop","indie","feel good pop"] },
  hindi: { market:"IN", seeds:["bollywood","arijit singh","hindi acoustic"] },
  punjabi:{market:"IN",seeds:["punjabi pop","ap dhillon"]},
  tamil:{market:"IN",seeds:["tamil hits","anirudh"]},
  telugu:{market:"IN",seeds:["telugu indie","sid sriram"]},
  korean:{market:"KR",seeds:["kpop chill"]},
  japanese:{market:"JP",seeds:["jpop chill"]},
  spanish:{market:"ES",seeds:["latin chill"]}
};

export default async function handler(req,res){
  try{
    const { token,language,mood } = req.body;
    const p = profiles[language]||profiles.english;
    const q = encodeURIComponent(`${p.seeds[0]} ${mood}`);

    const s = await fetch(
      `https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${p.market}&limit=1`,
      { headers:{Authorization:`Bearer ${token}`} }
    ).then(r=>r.json());

    const pl = s.playlists.items[0];
    const t = await fetch(
      `https://api.spotify.com/v1/playlists/${pl.id}/tracks?limit=50`,
      { headers:{Authorization:`Bearer ${token}`} }
    ).then(r=>r.json());

    const out = (t.items||[]).map(i=>({
      name:i.track.name,
      artist:i.track.artists[0].name,
      uri:i.track.uri
    }));

    res.json({tracks:out});
  }catch(e){
    res.status(500).json({error:"Failed songs"});
  }
}
