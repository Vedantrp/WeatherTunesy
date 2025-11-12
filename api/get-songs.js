import fetch from "node-fetch";

/** language profiles: market + seed phrases + include/exclude rules */
const langProfiles = {
  english: { market: "US", seeds: ["english chill pop","indie pop","feel good"], include: [/^[\u0000-\u024F\s'&().,!\-:]+$/i], exclude:[/[^\u0000-\u024F]/] },
  hindi:   { market: "IN", seeds: ["bollywood chill","arijit singh","hindi acoustic"], include:[/[\u0900-\u097F]/i, /\b(hindi|bollywood)\b/i], exclude:[] },
  punjabi: { market: "IN", seeds: ["punjabi hits","punjabi chill","ap dhillon"], include:[/[\u0A00-\u0A7F]/i, /\bpunjabi\b/i], exclude:[] },
  tamil:   { market: "IN", seeds: ["tamil hits","tamil lo-fi","anirudh"], include:[/[\u0B80-\u0BFF]/i, /\btamil\b/i], exclude:[] },
  telugu:  { market: "IN", seeds: ["telugu hits","tollywood lo-fi","sid sriram"], include:[/[\u0C00-\u0C7F]/i, /\btelugu|tollywood\b/i], exclude:[] },
  kannada: { market: "IN", seeds: ["kannada hits","kannada lo-fi","sandalwood songs"], include:[/[\u0C80-\u0CFF]/i, /\bkannada\b/i], exclude:[] },
  malayalam:{ market:"IN", seeds:["malayalam hits","malayalam chill","mollywood"], include:[/[\u0D00-\u0D7F]/i, /\bmalayalam|mollywood\b/i], exclude:[] },
  bengali: { market: "IN", seeds: ["bengali hits","bengali lo-fi","bengali indie"], include:[/[\u0980-\u09FF]/i, /\bbengali\b/i], exclude:[] },
  marathi: { market: "IN", seeds: ["marathi hits","marathi lo-fi","marathi pop"], include:[/[\u0900-\u097F]/i, /\bmarathi\b/i], exclude:[] },
  spanish: { market: "ES", seeds: ["latin chill","reggaeton suave","latin pop"], include:[/\b(español|spanish|latina?)\b/i], exclude:[] },
  french:  { market: "FR", seeds: ["french pop","chanson française","francophone chill"], include:[/\b(fr(?:ench)?|française|francophone)\b/i], exclude:[] },
  german:  { market: "DE", seeds: ["german pop","deutsche pop","german rap"], include:[/\b(deutsch|german|deutsche)\b/i], exclude:[] },
  italian: { market: "IT", seeds: ["italian pop","canzoni italiane","italian chill"], include:[/\b(italian|italiano)\b/i], exclude:[] },
  korean:  { market: "KR", seeds: ["k-pop chill","kpop dance","k-indie"], include:[/[\uAC00-\uD7AF]/, /\b(kpop|k-pop|korean)\b/i], exclude:[] },
  japanese:{ market: "JP", seeds: ["j-pop chill","anime songs","city pop"], include:[/[\u3040-\u30FF\u4E00-\u9FFF]/, /\b(jpop|j-pop|japanese)\b/i], exclude:[] },
  chinese: { market: "HK", seeds: ["c-pop","mandarin pop","cantopop"], include:[/[\u4E00-\u9FFF]/], exclude:[] },
  arabic:  { market: "SA", seeds: ["arabic chill","arab pop","arabic hits"], include:[/[\u0600-\u06FF]/, /\barab(ic)?\b/i], exclude:[] },
};

const moodTerms = {
  chill: ["chill","acoustic","lofi"],
  cozy: ["lofi","acoustic","rainy day"],
  upbeat: ["happy","feel good","summer"],
  peaceful: ["peaceful","piano","ambient"],
  intense: ["dark","bass","electro"],
  balanced: ["chill pop","easy"],
  mysterious: ["ambient","synthwave","mysterious"]
};

const j = (r) => r.json();
const sfetch = async (url, token) => {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }});
  if (r.status === 401) throw new Error("UNAUTHORIZED");
  return j(r);
};

const matchesLanguage = (track, langKey) => {
  const prof = langProfiles[langKey] || langProfiles.english;
  const name = `${(track.name||"")} ${(track.album?.name||"")} ${(track.artists?.[0]?.name||"")}`;
  if (prof.include?.length && !prof.include.some(rx => rx.test(name))) return false;
  if (prof.exclude?.length &&  prof.exclude.some(rx => rx.test(name))) return false;
  return true;
};

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
    const { token, language="english", mood="chill" } = req.body || {};
    if (!token) return res.status(401).json({ error: "Missing token" });

    const prof  = langProfiles[language] || langProfiles.english;
    const terms = moodTerms[mood] || ["chill"];
    const market = prof.market || "US";

    const queries = [];
    for (const seed of prof.seeds) for (const m of terms) queries.push(`${seed} ${m}`);

    const playlists = [];
    for (let i=0; i<Math.min(5, queries.length); i++) {
      const q = encodeURIComponent(queries[i]);
      const data = await sfetch(`https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${market}&limit=1`, token);
      const item = data?.playlists?.items?.[0];
      if (item) playlists.push(item);
    }
    if (!playlists.length) {
      const q = encodeURIComponent(prof.seeds[0]);
      const data = await sfetch(`https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${market}&limit=1`, token);
      const item = data?.playlists?.items?.[0];
      if (item) playlists.push(item);
    }

    let tracks = [];
    for (const pl of playlists) {
      const t = await sfetch(`https://api.spotify.com/v1/playlists/${pl.id}/tracks?market=${market}&limit=100`, token);
      const arr = (t.items || [])
        .map(i => i && i.track)
        .filter(Boolean)
        .filter(tr => tr.id && tr.uri && matchesLanguage(tr, language))
        .map(tr => ({
          id: tr.id,
          uri: tr.uri,
          name: tr.name,
          artist: tr.artists?.[0]?.name || "Unknown",
          image: tr.album?.images?.[1]?.url || tr.album?.images?.[0]?.url || "",
          url: tr.external_urls?.spotify
        }));
      tracks = tracks.concat(arr);
      if (tracks.length >= 200) break;
    }

    // dedupe + shuffle
    const seen = new Set(), unique = [];
    for (const t of tracks) { if (!seen.has(t.id)) { seen.add(t.id); unique.push(t); } }
    for (let i=unique.length-1; i>0; i--) { const j=Math.floor(Math.random()*(i+1)); [unique[i],unique[j]]=[unique[j],unique[i]]; }

    return res.status(200).json({ tracks: unique.slice(0, 50) });
  } catch (e) {
    if (e.message === "UNAUTHORIZED") return res.status(401).json({ error: "Spotify token expired" });
    return res.status(500).json({ error: "Song fetch failed" });
  }
}
