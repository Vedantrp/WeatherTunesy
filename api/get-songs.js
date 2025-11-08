// Strict language profiles + seeds
const langProfiles = {
  english:  { market:"US", seeds:["indie pop","chill pop","feel good"], include:[/^[\u0000-\u024F\s'&().,!\-:]+$/], exclude:[/[\u0900-\u097F\u0A00-\u0A7F\u0B80-\u0BFF\u0C00-\u0C7F]/] },
  hindi:    { market:"IN", seeds:["bollywood","arijit singh","hindi lo-fi"], include:[/[\u0900-\u097F]/i,/\b(hindi|bollywood)\b/i], exclude:[] },
  punjabi:  { market:"IN", seeds:["punjabi hits","ap dhillon","punjabi pop"], include:[/[\u0A00-\u0A7F]/i,/\bpunjabi\b/i], exclude:[] },
  tamil:    { market:"IN", seeds:["tamil hits","anirudh","kollywood lo-fi"], include:[/[\u0B80-\u0BFF]/i,/\btamil\b/i], exclude:[] },
  telugu:   { market:"IN", seeds:["telugu","sid sriram","tollywood"], include:[/[\u0C00-\u0C7F]/i,/\btelugu|tollywood\b/i], exclude:[] },
  kannada:  { market:"IN", seeds:["kannada hits","sandalwood"], include:[/[\u0C80-\u0CFF]/i], exclude:[] },
  malayalam:{ market:"IN", seeds:["malayalam","mollywood"], include:[/[\u0D00-\u0D7F]/i], exclude:[] },
  bengali:  { market:"IN", seeds:["bengali hits","bengali indie"], include:[/[\u0980-\u09FF]/i], exclude:[] },
  marathi:  { market:"IN", seeds:["marathi","marathi pop"], include:[/\bmarathi\b/i,/[\u0900-\u097F]/i], exclude:[] },
  spanish:  { market:"ES", seeds:["latin pop","reggaeton suave","baladas"], include:[/\b(español|spanish|latina?)\b/i], exclude:[] },
  french:   { market:"FR", seeds:["french pop","chanson française"], include:[/\b(fr|french|française)\b/i], exclude:[] },
  german:   { market:"DE", seeds:["german pop","deutsche rap"], include:[/\b(deutsch|german|deutsche)\b/i], exclude:[] },
  italian:  { market:"IT", seeds:["italian pop","canzoni italiane"], include:[/\b(italian|italiano)\b/i], exclude:[] },
  korean:   { market:"KR", seeds:["kpop","k-indie"], include:[/[\uAC00-\uD7AF]/,/\b(kpop|k-pop|korean)\b/i], exclude:[] },
  japanese: { market:"JP", seeds:["jpop","anime songs","city pop"], include:[/[\u3040-\u30FF\u4E00-\u9FFF]/,/\b(jpop|j-pop|japanese)\b/i], exclude:[] },
  chinese:  { market:"HK", seeds:["c-pop","mandarin pop","cantopop"], include:[/[\u4E00-\u9FFF]/], exclude:[] },
  arabic:   { market:"SA", seeds:["arabic hits","arab pop"], include:[/[\u0600-\u06FF]/], exclude:[] },
};

const moodTerms = {
  chill:["chill","acoustic","lofi"],
  summer:["summer","feel good","sunny"],
  lofi:["lofi","rainy day","study"],
  gloomy:["ambient","moody","late night"],
};

function matchesLanguage(tr, langKey){
  const prof = langProfiles[langKey] || langProfiles.english;
  const name = `${tr.name||""} ${tr.album?.name||""} ${(tr.artists?.[0]?.name)||""}`;
  if(prof.include?.length && !prof.include.some(rx => rx.test(name))) return false;
  if(prof.exclude?.length && prof.exclude.some(rx => rx.test(name))) return false;
  return true;
}

async function s(url, token){
  const r = await fetch(url,{headers:{Authorization:`Bearer ${token}`}});
  if(r.status===401) throw new Error("UNAUTHORIZED");
  return r.json();
}

export default async function handler(req,res){
  try{
    const { token, language="english", mood="chill" } = req.body||{};
    if(!token) return res.status(401).json({ error:"Missing token" });

    const prof = langProfiles[language] || langProfiles.english;
    const terms = moodTerms[mood] || ["chill"];
    const queries = [];
    for(const seed of prof.seeds){ for(const m of terms) queries.push(`${seed} ${m}`); }

    const market = prof.market || "US";
    const playlists=[];
    for(let i=0;i<Math.min(4,queries.length);i++){
      const q=encodeURIComponent(queries[i]);
      const res1=await s(`https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${market}&limit=1`, token);
      const item=res1?.playlists?.items?.[0];
      if(item) playlists.push(item);
    }
    if(!playlists.length){
      const q=encodeURIComponent(prof.seeds[0]);
      const res1=await s(`https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${market}&limit=1`, token);
      const item=res1?.playlists?.items?.[0];
      if(item) playlists.push(item);
    }

    let out=[];
    for(const pl of playlists){
      const t=await s(`https://api.spotify.com/v1/playlists/${pl.id}/tracks?market=${market}&limit=100`, token);
      for(const it of (t.items||[])){
        const tr=it?.track; if(!tr||!tr.id||!tr.uri) continue;
        if(!matchesLanguage(tr, language)) continue;
        out.push({
          id:tr.id, uri:tr.uri, name:tr.name,
          artist:(tr.artists?.[0]?.name)||"Unknown",
          image:tr.album?.images?.[1]?.url || tr.album?.images?.[0]?.url || "",
          url:tr.external_urls?.spotify || "",
          preview:tr.preview_url || "" // 30-sec previews (not all have)
        });
      }
      if(out.length>=150) break;
    }

    // dedupe + shuffle + cap
    const seen=new Set(); const uniq=[];
    for(const t of out){ if(!seen.has(t.id)){ seen.add(t.id); uniq.push(t);} }
    for(let i=uniq.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [uniq[i],uniq[j]]=[uniq[j],uniq[i]]; }

    res.json({ tracks: uniq.slice(0,35) });
  }catch(e){
    if(e.message==="UNAUTHORIZED") return res.status(401).json({ error:"Spotify token expired" });
    console.error("get-songs error:",e);
    res.status(500).json({ error:"Song fetch failed" });
  }
}
