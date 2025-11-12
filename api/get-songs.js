const langProfiles = {
  english: {
    market:"US",
    include:[/^[\u0000-\u024F\s'&(),.!?-]+$/], // Latin only
    exclude:[/[\u0900-\u097F\u0A00-\u0A7F\u0C00-\u0C7F\u0B80-\u0BFF]/] // Indic ranges
  },
  hindi:   { market:"IN", include:[/[\u0900-\u097F]/, /(bollywood|hindi|arijit|atif)/i] },
  punjabi: { market:"IN", include:[/[\u0A00-\u0A7F]/, /(punjabi|sidhu|ap dhillon)/i] },
  tamil:   { market:"IN", include:[/[\u0B80-\u0BFF]/, /(tamil|kollywood|anirudh)/i] },
  telugu:  { market:"IN", include:[/[\u0C00-\u0C7F]/, /(telugu|tollywood|sriram)/i] },
  kannada: { market:"IN", include:[/(kannada|sandalwood)/i] },
  malayalam:{market:"IN", include:[/(malayalam|mollywood)/i] },
  bengali: { market:"IN", include:[/(bengali)/i] },
  marathi: { market:"IN", include:[/(marathi)/i] },
  spanish: { market:"ES", include:[/(latin|reggaeton|español|spanish)/i] },
  french:  { market:"FR", include:[/(française|french|francophone)/i] },
  german:  { market:"DE", include:[/(deutsch|german)/i] },
  italian: { market:"IT", include:[/(italian|italiano)/i] },
  korean:  { market:"KR", include:[/[\uAC00-\uD7AF]/, /(kpop|korean)/i] },
  japanese:{ market:"JP", include:[/[\u3040-\u30FF\u4E00-\u9FFF]/, /(jpop|japanese|anime)/i] },
  chinese: { market:"HK", include:[/[\u4E00-\u9FFF]/, /(c-pop|mandarin|cantopop)/i] },
  arabic:  { market:"SA", include:[/(arabic|arab|arabi)/i] }
};

const moodTerms = {
  sad: ["sad","acoustic","piano","lofi"],
  cozy:["cozy","lofi","soft","chill","warm"],
  party:["dance","party","edm","bangers"],
  workout:["workout","boost","gym","energy"],
  happy:["happy","pop","feel good","summer"],
  chill:["chill","soft","indie","lofi"],
  rain:["lofi","acoustic","piano"],
  winter:["warm","jazz","cozy","soul"]
};

async function sfetch(url, token){
  const r = await fetch(url,{headers:{Authorization:`Bearer ${token}`}});
  return r.json();
}
function passesLang(profile, name, artist){
  const blob = `${name} ${artist}`;
  if (profile.include && !profile.include.some(rx => rx.test(blob))) return false;
  if (profile.exclude && profile.exclude.some(rx => rx.test(blob))) return false;
  return true;
}

export default async function handler(req, res){
  try{
    const { token, language="english", mood="chill" } = req.body || {};
    if (!token) return res.status(401).json({ error: "Missing token" });

    const profile = langProfiles[language] || langProfiles.english;
    const terms = moodTerms[mood] || ["chill"];
    const market = profile.market || "US";

    // Build 5 queries mixing language sense + mood
    const seeds = [
      `${language} ${terms[0]}`,
      `${language} ${terms[1] || ""}`,
      `${terms.join(" ")}`,
      `${language} top hits`,
      `${language} lofi`
    ];

    // gather playlist ids
    const playlists = [];
    for (const qRaw of seeds.slice(0,5)) {
      const q = encodeURIComponent(qRaw.trim().replace(/\s+/g,' '));
      const data = await sfetch(`https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${market}&limit=1`, token);
      const item = data?.playlists?.items?.[0];
      if (item) playlists.push(item.id);
    }
    if (!playlists.length) {
      return res.json({ tracks: [] });
    }

    // fetch tracks
    let all = [];
    for (const id of playlists) {
      const tr = await sfetch(`https://api.spotify.com/v1/playlists/${id}/tracks?market=${market}&limit=100`, token);
      const rows = (tr.items || [])
        .map(i => i && i.track)
        .filter(Boolean)
        .map(t => ({
          id: t.id,
          uri: t.uri,
          name: t.name,
          artist: t.artists?.[0]?.name || "Unknown",
          image: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url || "",
          url: t.external_urls?.spotify || "",
          pop: t.popularity || 0
        }))
        .filter(t => t.id && t.uri);
      all = all.concat(rows);
      if (all.length >= 300) break;
    }

    // language filter + popularity filter + dedupe + shuffle
    const seen = new Set();
    const filtered = [];
    for (const t of all) {
      if (seen.has(t.id)) continue;
      if (!passesLang(profile, t.name, t.artist)) continue;
      if (t.pop < 35) continue;
      seen.add(t.id);
      filtered.push(t);
    }
    for (let i = filtered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
    }

    return res.json({ tracks: filtered.slice(0, 50) });
  } catch (e) {
    console.error("GET-SONGS ERROR:", e);
    return res.status(500).json({ error: "Song fetch failed" });
  }
}
