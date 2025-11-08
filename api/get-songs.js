// api/get-songs.js

const langProfiles = {
  english: { 
    market: "US",
    seeds: [
      "english indie",
      "acoustic pop english",
      "chill pop english",
      "soft rock english",
      "usa pop",
      "uk indie",
      "english lofi"
    ]
  },

  hindi: { market:"IN", seeds:["bollywood","hindi acoustic","arijit singh"] },
  punjabi:{ market:"IN", seeds:["punjabi hits","ap dhillon","punjabi chill"] },
  tamil:{ market:"IN", seeds:["tamil hits","tamil lo-fi","anirudh"] },
  telugu:{ market:"IN", seeds:["telugu hits","sid sriram","tollywood lofi"] },
  kannada:{ market:"IN", seeds:["kannada hits","kannada lo-fi","sandalwood"] },
  malayalam:{ market:"IN", seeds:["malayalam hits","mollywood","malayalam lofi"] },
  bengali:{ market:"IN", seeds:["bengali indie","bangla chill","bengali lo-fi"] },
  marathi:{ market:"IN", seeds:["marathi pop","marathi indie","marathi lofi"] },
  spanish:{ market:"ES", seeds:["latin pop","reggaeton","latin chill"] },
  french:{ market:"FR", seeds:["french pop","chanson","french indie"] },
  german:{ market:"DE", seeds:["german pop","german rap","deutsch chill"] },
  italian:{ market:"IT", seeds:["italian pop","italian indie","italian chill"] },
  korean:{ market:"KR", seeds:["kpop","k chill","k indie"] },
  japanese:{ market:"JP", seeds:["jpop","anime songs","city pop"] },
  chinese:{ market:"HK", seeds:["mandopop","c-pop","chinese pop"] },
  arabic:{ market:"SA", seeds:["arab pop","arab chill","arabic hits"] },
};

const moodTerms = {
  sad:["sad","emotional","piano"],
  chill:["chill","lofi","acoustic"],
  happy:["happy","summer","feel good"],
  energetic:["energetic","edm","dance"],
  party:["party","bangers","club"]
};

async function sfetch(url, token) {
  const r = await fetch(url, { headers:{Authorization:`Bearer ${token}`} });
  if (r.status === 401) throw new Error("UNAUTHORIZED");
  return r.json();
}

// ❌ Languages we filter out for English
const nonEnglishRegex = /[^\u0000-\u007F]+/; // unicode
const indiaWords = /(bollywood|arijit|atif|neha|tseries|sidhu|punjabi|hindi|raag|desi|kumar|mithoon|armaan|armaan malik|hindi pop)/i;

export default async function handler(req,res){
  try {
    const { token, language="english", mood="chill" } = req.body || {};
    if(!token) return res.status(401).json({error:"Missing token"});

    const prof = langProfiles[language] || langProfiles.english;
    const terms = moodTerms[mood] || ["chill"];
    const market = prof.market;

    let queries=[];
    for(const seed of prof.seeds){
      for(const m of terms){
        queries.push(`${seed} ${m}`);
      }
    }

    let playlists=[];
    for(let i=0;i<4;i++){
      const q = encodeURIComponent(queries[i]);
      const d = await sfetch(
        `https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${market}&limit=1`,
        token
      );
      const item = d?.playlists?.items?.[0];
      if(item) playlists.push(item);
    }

    let tracks=[];
    for(const pl of playlists){
      const d = await sfetch(
        `https://api.spotify.com/v1/playlists/${pl.id}/tracks?market=${market}&limit=100`,
        token
      );
      const arr = (d.items||[])
        .map(i=>i?.track)
        .filter(Boolean)
        .map(tr => ({
          id:tr.id,
          uri:tr.uri,
          name:tr.name,
          artist:tr.artists?.[0]?.name || "",
          image:tr.album?.images?.[1]?.url || tr.album?.images?.[0]?.url,
          url:tr.external_urls?.spotify
        }));

      tracks = tracks.concat(arr);
    }

    // ✅ English filter – STRONG
  // ✅ English language filter (balanced)
if (language === "english") {

  const indianKeywords = /(bollywood|arijit|atif|neha|tseries|sidhu|punjabi|hindi|raag|armaan|shraddha kapoor|sonu nigam|aditya|mithoon|jubin|ar rahman|desi|bhajan)/i;

  const indianScripts = /[\u0900-\u097F\u0A00-\u0A7F]/; // Hindi + Punjabi unicode

  tracks = tracks.filter(t => {
    const title = (t.name || "").toLowerCase();
    const artist = (t.artist || "").toLowerCase();

    // ❌ block clear Indian scripts/keywords
    if (indianScripts.test(title) || indianScripts.test(artist)) return false;
    if (indianKeywords.test(title) || indianKeywords.test(artist)) return false;

    // ✅ allow English, even with symbols or emojis
    return true;
  });
}


    // ✅ remove duplicates
    const seen = new Set();
    const unique = [];
    for(const t of tracks){
      if(!seen.has(t.id)){
        seen.add(t.id);
        unique.push(t);
      }
    }

    res.json({tracks: unique.slice(0, 50)});

  } catch(e){
    if(e.message==="UNAUTHORIZED")
      return res.status(401).json({error:"Spotify token expired"});

    console.error("ERR",e);
    res.status(500).json({error:"Song fetch failed"});
  }
}
