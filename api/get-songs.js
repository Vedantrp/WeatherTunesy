const langProfiles = {
  english:   { market:"US", seeds:["chill pop","indie pop","feel good"] },
  hindi:     { market:"IN", seeds:["bollywood chill","hindi acoustic","arijit singh"] },
  punjabi:   { market:"IN", seeds:["punjabi hits","punjabi lo-fi","ap dhillon"] },
  tamil:     { market:"IN", seeds:["tamil hits","tamil lo-fi","anirudh"] },
  telugu:    { market:"IN", seeds:["telugu hits","tollywood lo-fi","sid sriram"] },
  kannada:   { market:"IN", seeds:["kannada hits","kannada lo-fi","sandalwood songs"] },
  malayalam: { market:"IN", seeds:["malayalam hits","malayalam chill","mollywood songs"] },
  bengali:   { market:"IN", seeds:["bengali hits","bengali lo-fi","bengali indie"] },
  marathi:   { market:"IN", seeds:["marathi hits","marathi lo-fi","marathi pop"] },
  gujarati:  { market:"IN", seeds:["gujarati hits","gujarati lo-fi","gujarati pop"] },

  spanish:   { market:"ES", seeds:["latin chill","latin pop","reggaeton"] },
  french:    { market:"FR", seeds:["french pop","chanson française","francophone chill"] },
  german:    { market:"DE", seeds:["german pop","deutsche rap","german indie"] },
  italian:   { market:"IT", seeds:["italian pop","italian chill","canzoni italiane"] },
  arabic:    { market:"SA", seeds:["arabic pop","arabic chill","arabic hits"] },
  korean:    { market:"KR", seeds:["k-pop","k-indie","kpop chill"] },
  japanese:  { market:"JP", seeds:["j-pop","anime songs","city pop"] },
  chinese:   { market:"HK", seeds:["c-pop","mandarin chill","chinese pop"] }
};


const moods = {
  chill:["chill","acoustic","lofi"],
  summer:["summer","happy","tropical"],
  lofi:["lofi","rainy","soft"],
  sad:["sad","soft","piano"]
};

async function api(url, token) {
  const r = await fetch(url, { headers:{Authorization:`Bearer ${token}`}});
  return r.json();
}

export default async function handler(req,res){
  try {
    const { token, language="english", mood="chill" } = req.body;
    if (!token) return res.status(401).json({ error:"No token" });

    const prof = langProfiles[language] || langProfiles.english;
    const moodSeeds = moods[mood] || moods.chill;

    const queries = [];
    prof.seeds.forEach(s => moodSeeds.forEach(m => queries.push(`${s} ${m}`)));

    let all = [];

    for (let i=0;i<3;i++){
      const q = encodeURIComponent(queries[i]);
      const p = await api(`https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${prof.market}&limit=1`,token);

      const pl = p.playlists?.items?.[0];
      if (!pl) continue;

      const tr = await api(`https://api.spotify.com/v1/playlists/${pl.id}/tracks?limit=100`,token);
      tr.items?.forEach(t=>{
        if (t.track)
          all.push({
            id:t.track.id,
            name:t.track.name,
            artist:t.track.artists[0].name,
            uri:t.track.uri
          });
      });
    }

    // Unique & shuffle
    const seen = new Set();
    const final = [];
    for(const t of all){
      if(!seen.has(t.id)){
        seen.add(t.id);
        final.push(t);
      }
    }
    final.sort(()=>Math.random()-0.5);

    res.json({ tracks: final.slice(0,50) });

  }catch(e){
    res.status(500).json({ error:"server fail" });
  }
}
