import fetch from "node-fetch";

const profiles = {
  english:{ market:"US", queries:["english chill","indie pop","focus study"] },
  hindi:{ market:"IN", queries:["bollywood chill","arijit singh","lofi hindi"] },
  punjabi:{ market:"IN", queries:["punjabi lo-fi","ap dhillon","punjabi chill"] },
  marathi:{ market:"IN", queries:["marathi songs","marathi chill","marathi lofi"] },
  bengali:{ market:"IN", queries:["bengali indie","bengali chill"] },
  tamil:{ market:"IN", queries:["tamil lofi","kollywood chill"] },
  telugu:{ market:"IN", queries:["telugu lofi","tollywood chill"] },
  kannada:{ market:"IN", queries:["kannada songs","kannada chill"] },
  malayalam:{ market:"IN", queries:["malayalam chill","malayalam indie"] },
  korean:{ market:"KR", queries:["kpop chill","k r&b"] },
  japanese:{ market:"JP", queries:["jpop chill","anime chill"] },
  spanish:{ market:"ES", queries:["latin chill","reggaeton suave"] }
};

async function s(url,token){
  return (await fetch(url,{headers:{Authorization:`Bearer ${token}`}})).json();
}

export default async function handler(req,res){
  try{
    const {token,language,mood} = req.body;
    const p = profiles[language] || profiles.english;
    let all=[];

    for(const q of p.queries){
      const pl = await s(`https://api.spotify.com/v1/search?q=${encodeURIComponent(`${q} ${mood}`)}&type=playlist&market=${p.market}&limit=1`,token);
      const id = pl?.playlists?.items?.[0]?.id;
      if(!id) continue;

      const tracks=await s(`https://api.spotify.com/v1/playlists/${id}/tracks?market=${p.market}&limit=100`,token);
      all.push(...(tracks.items||[]).map(x=>x.track).filter(Boolean));
      if(all.length>150) break;
    }

    const uniq={},out=[];
    for(const t of all){
      if(!t?.id || uniq[t.id]) continue;
      uniq[t.id]=1;
      out.push({ id:t.id, uri:t.uri, name:t.name, artist:t.artists[0].name });
      if(out.length>=40) break;
    }

    res.json({tracks:out});
  }catch(e){
    res.status(500).json({error:"Song fetch error"});
  }
}
