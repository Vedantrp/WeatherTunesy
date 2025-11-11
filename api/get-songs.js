import fetch from "node-fetch";

const langProfiles = {
  english:  { market: "US", seeds: ["chill pop","indie pop","feel good","pop vibes"], requireLang: false },
  hindi:    { market: "IN", seeds: ["bollywood","arijit singh","hindi lo-fi","indian chill"], requireLang: true, langChars: /[\u0900-\u097F]/ },
  punjabi:  { market: "IN", seeds: ["punjabi hits","punjabi chill","ap dhillon"], requireLang: true, langChars: /[\u0A00-\u0A7F]/ },
  tamil:    { market: "IN", seeds: ["tamil hits","tamil lo-fi","anirudh"], requireLang: true, langChars: /[\u0B80-\u0BFF]/ },
  telugu:   { market: "IN", seeds: ["telugu hits","sid sriram","tollywood lo-fi"], requireLang: true, langChars: /[\u0C00-\u0C7F]/ },
  kannada:  { market: "IN", seeds: ["kannada hits","kannada lo-fi"], requireLang: true, langChars: /[\u0C80-\u0CFF]/ },
  malayalam:{ market: "IN", seeds: ["malayalam hits","malayalam chill"], requireLang: true, langChars: /[\u0D00-\u0D7F]/ },
  bengali:  { market: "IN", seeds: ["bengali hits","bengali lo-fi"], requireLang: true, langChars: /[\u0980-\u09FF]/ },
  marathi:  { market: "IN", seeds: ["marathi hits","marathi chill"], requireLang: true, langChars: /[\u0900-\u097F]/ },
  spanish:  { market: "ES", seeds: ["latin chill","reggaeton suave","latin pop"], requireLang: false },
  french:   { market: "FR", seeds: ["french pop","chanson française","fr chill"], requireLang: false },
  german:   { market: "DE", seeds: ["german pop","german rap"], requireLang: false },
  italian:  { market: "IT", seeds: ["italian pop","italian chill"], requireLang: false },
  korean:   { market: "KR", seeds: ["kpop","kpop chill","korean r&b"], requireLang: false },
  japanese: { market: "JP", seeds: ["jpop","anime songs","city pop"], requireLang: false },
  chinese:  { market: "HK", seeds: ["c-pop","mandopop","cantopop"], requireLang: false },
  arabic:   { market: "SA", seeds: ["arabic hits","arab chill"], requireLang: false },
};

const moodTerms = {
  chill: ["chill","vibe","lofi","soft"],
  lofi: ["lofi","study","sad"],
  gloomy: ["ambient","moody","dark"],
  summer: ["summer","happy","dance"],
  warmth: ["acoustic","calm","soft"],
  calm: ["calm","sleep","ambient"]
};

async function sfetch(url, token){
  const r = await fetch(url, { headers:{ Authorization:`Bearer ${token}` }});
  return r.json();
}

function matchesLang(track, prof) {
  const text = (track.name + " " + track.artists?.[0]?.name).toLowerCase();

  // English must not contain any non-latin alphabet
  if (prof === langProfiles.english) {
    return !/[^\u0000-\u007F]/.test(text);
  }

  // Languages requiring native script
  if (prof.requireLang) {
    return prof.langChars?.test(text);
  }

  return true;
}


export default async function handler(req, res){
  try{
    const { token, language="english", mood="chill" } = req.body;
    if (!token) return res.status(401).json({ error:"No token" });

    const prof = langProfiles[language] || langProfiles.english;
    const terms = moodTerms[mood] || moodTerms.chill;
    const market = prof.market;

    let pool = [];

    // fetch playlists based on language & mood
    for (const seed of prof.seeds.slice(0,3)){
      for (const term of terms.slice(0,2)){
        const q = encodeURIComponent(`${seed} ${term}`);
        const d = await sfetch(
          `https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${market}&limit=1`,
          token
        );
        const pl = d?.playlists?.items?.[0];
        if (!pl) continue;

        const tr = await sfetch(
          `https://api.spotify.com/v1/playlists/${pl.id}/tracks?market=${market}&limit=50`,
          token
        );

        for (const t of tr.items || []){
          const track = t.track;
          if (!track?.uri) continue;

          if (!matchesLang(track, prof)) continue; 

          pool.push({
            id: track.id,
            uri: track.uri,
            name: track.name,
            artist: track.artists?.[0]?.name,
            image: track.album?.images?.[1]?.url || track.album?.images?.[0]?.url,
            url: track.external_urls?.spotify
          });
        }
      }
    }

    // not enough songs? fallback global mood playlists
    if (pool.length < 10){
      const fallback = await sfetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(mood + " chill")}&type=playlist&market=US&limit=1`,
        token
      );

      const fpl = fallback?.playlists?.items?.[0];
      if (fpl){
        const tr = await sfetch(
          `https://api.spotify.com/v1/playlists/${fpl.id}/tracks?limit=50`,
          token
        );
        for (const t of tr.items || []){
          const track = t.track;
          if (!track?.uri) continue;
          pool.push({
            id: track.id,
            uri: track.uri,
            name: track.name,
            artist: track.artists?.[0]?.name,
            image: track.album?.images?.[1]?.url || track.album?.images?.[0]?.url,
            url: track.external_urls?.spotify
          });
        }
      }
    }

    // de-dupe + shuffle
    const seen = new Set();
    const unique = [];
    for (const t of pool){
      if (!seen.has(t.id)){
        seen.add(t.id);
        unique.push(t);
      }
    }
    for (let i = unique.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [unique[i], unique[j]] = [unique[j], unique[i]];
    }

    return res.json({ tracks: unique.slice(0,30) });
  } catch (e){
    return res.status(500).json({ error:"Song fetch failed" });
  }
}
