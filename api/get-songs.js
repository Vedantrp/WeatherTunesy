const langProfiles = {
  english: {
    market:"US",
    include:[/^[\u0000-\u024F\s'&(),.!?-]+$/],
    exclude:[/[\u0900-\u097F\u0A00-\u0A7F\u0C00-\u0C7F\u0B80-\u0BFF]/]
  },
  hindi:{ market:"IN", include:[/[\u0900-\u097F]/, /(bollywood|arijit|atif|hind|india)/i] },
  punjabi:{ market:"IN", include:[/[\u0A00-\u0A7F]/, /(punjabi|sidhu|ap dhillon)/i] },
  tamil:{ market:"IN", include:[/[\u0B80-\u0BFF]/, /(tamil|kollywood|anirudh)/i] },
  telugu:{ market:"IN", include:[/[\u0C00-\u0C7F]/, /(telugu|tollywood|sriram)/i] },
  kannada:{ market:"IN", include:[/(kannada)/i] },
  malayalam:{ market:"IN", include:[/(malayalam)/i] },
  bengali:{ market:"IN", include:[/(bengali)/i] },
  marathi:{ market:"IN", include:[/(marathi)/i] },
  spanish:{ market:"ES", include:[/(latin|reggaeton|español|spanish)/i] },
  french:{ market:"FR", include:[/(french|française)/i] },
  german:{ market:"DE", include:[/(german|deutsch)/i] },
  italian:{ market:"IT", include:[/(italian|italiano)/i] },
  korean:{ market:"KR", include:[/(kpop|korean)/i, /[\uAC00-\uD7AF]/] },
  japanese:{ market:"JP", include:[/(jpop|japanese|anime)/i, /[\u3040-\u30FF\u4E00-\u9FFF]/] },
  chinese:{ market:"HK", include:[/(mandarin|c-pop|chinese)/i, /[\u4E00-\u9FFF]/] },
  arabic:{ market:"SA", include:[/(arabic|arab)/i] },
};

const moodTerms = {
  sad:["sad","acoustic","piano","lofi","emotional"],
  cozy:["cozy","warm","soft","jazz","lofi","soul"],
  party:["party","edm","dance","house","banger"],
  workout:["gym","workout","energy","bass","boost"],
  happy:["happy","pop","feel good","summer","vibes"],
  chill:["chill","indie","soft","lofi","acoustic"],
  rain:["rain","lofi","acoustic","soothing"],
  winter:["warm","jazz","lofi","soft"]
};

function passesLang(profile, name, artist){
  const blob = `${name} ${artist}`;
  if (profile.include && !profile.include.some(rx => rx.test(blob))) return false;
  if (profile.exclude && profile.exclude.some(rx => rx.test(blob))) return false;
  return true;
}

async function sfetch(url, token){
  const r = await fetch(url,{headers:{Authorization:`Bearer ${token}`}});
  return r.json();
}

export default async function handler(req, res){
  try {
    const { token, language="english", mood="chill" } = req.body || {};
    if (!token) return res.status(401).json({ error:"Missing token" });

    const profile = langProfiles[language] || langProfiles.english;
    const terms = moodTerms[mood] || ["chill"];
    const market = profile.market;

    const searches = [
      `${language} ${terms[0]}`,
      `${language} ${terms[1] || ""}`,
      `${language} top hits`,
      `${mood} mix`,
      `${language} vibe`,
      `${language} chill`,
    ];

    let all = [];
    for (const qRaw of searches) {
      const q = encodeURIComponent(qRaw.trim());
      const data = await sfetch(
        `https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${market}&limit=3`,
        token
      );

      for (const pl of data?.playlists?.items || []) {
        const tracks = await sfetch(
          `https://api.spotify.com/v1/playlists/${pl.id}/tracks?market=${market}&limit=80`,
          token
        );

        for (const i of tracks.items || []) {
          const t = i.track;
          if (!t || !t.id) continue;

          all.push({
            id: t.id,
            uri: t.uri,
            name: t.name,
            artist: t.artists?.[0]?.name,
            image: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url,
            url: t.external_urls?.spotify,
            pop: t.popularity || 30
          });
        }
      }

      if (all.length >= 200) break;
    }

    // Deduplicate + language + popularity >= 25 (earlier 35)
    const seen = new Set();
    const filtered = [];

    for (const t of all) {
      if (seen.has(t.id)) continue;
      if (!passesLang(profile, t.name, t.artist)) continue;
      if (t.pop < 25) continue;
      seen.add(t.id);
      filtered.push(t);
      if (filtered.length >= 70) break;
    }

    // Shuffle
    for (let i = filtered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
    }

    return res.json({ tracks: filtered.slice(0, 50) });

  } catch (e) {
    console.error("GET-SONGS ERROR:", e);
    return res.status(500).json({ error:"Song fetch failed" });
  }
}
