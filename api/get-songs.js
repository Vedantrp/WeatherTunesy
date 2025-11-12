const langProfiles = {
  english: {
    market:"US",
    include: [/^[\u0000-\u024F\s'&(),.!?-]+$/],
    exclude: [/[\u0900-\u097F\u0A00-\u0A7F\u0C00-\u0C7F\u0B80-\u0BFF]/]
  },
  hindi: {
    market:"IN",
    include: [/[\u0900-\u097F]/, /(bollywood|hindi|arijit|atif)/i],
    exclude: [/kpop|anime|spanish|reggaeton/i]
  },
  punjabi: {
    market:"IN",
    include: [/[\u0A00-\u0A7F]/, /(punjabi|sidhu|ap dhillon)/i],
    exclude: [/kpop|jpop|latin/i]
  },
  tamil:{
    market:"IN",
    include:[/[\u0B80-\u0BFF]/, /(tamil|kollywood|anirudh)/i]
  },
  telugu:{
    market:"IN",
    include:[/[\u0C00-\u0C7F]/, /(telugu|tollywood|sriram)/i]
  },
  korean:{
    market:"KR",
    include:[/[\uAC00-\uD7AF]/, /(kpop|korean)/i]
  },
  japanese:{
    market:"JP",
    include:[/[\u3040-\u30FF\u4E00-\u9FFF]/, /(jpop|japanese|anime)/i]
  },
  spanish:{
    market:"ES",
    include:[/(latin|reggaeton|español|spanish)/i]
  }
};

const moodTerms = {
  sad: ["sad", "acoustic", "piano", "lofi"],
  cozy: ["cozy", "lofi", "soft", "chill"],
  party: ["dance", "party", "edm", "bangers"],
  workout: ["workout", "boost", "gym"],
  happy: ["happy", "pop", "feel good", "summer"],
  rain: ["lofi", "acoustic", "piano"],
  winter: ["warm", "jazz", "cozy", "soul"]
};

async function sfetch(url, token){
  return fetch(url,{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json());
}

export default async function handler(req,res){
  try{
    const {token, language, mood} = req.body;
    const profile = langProfiles[language] || langProfiles.english;
    const terms = moodTerms[mood] || ["chill"];

    const q = encodeURIComponent(terms.join(" "));
    const playlist = await sfetch(
      `https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${profile.market}&limit=1`,
      token
    );

    const id = playlist.playlists.items[0].id;
    const tr = await sfetch(`https://api.spotify.com/v1/playlists/${id}/tracks?limit=100`, token);

    let songs = tr.items
      .filter(x => x?.track)
      .map(t => ({
        id:t.track.id,
        name:t.track.name,
        artist:t.track.artists[0].name,
        uri:t.track.uri,
        pop:t.track.popularity,
        langMatch:profile.include?.some(r=>r.test(t.track.name+" "+t.track.artists[0].name))
      }))
      .filter(s => s.langMatch && s.pop >= 40) // 🔥 popular & true-language only
      .slice(0,25);

    if(!songs.length) return res.json({tracks:[], note:"No matches, try different mood"});
    
    return res.json({tracks:songs});

  }catch(e){
    return res.status(500).json({error:"Song fetch failed"});
  }
}
