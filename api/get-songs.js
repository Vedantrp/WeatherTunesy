const langProfiles = {
  english: {
    market: "US",
    seeds: ["english pop", "indie pop", "pop classics", "acoustic english"],
    mustNotContain: /[\u0900-\u097F\u0A00-\u0A7F\u0B80-\u0BFF\u0C00-\u0C7F\u4E00-\u9FFF\uAC00-\uD7AF]/
  },
  hindi: { market: "IN", seeds: ["hindi mix","bollywood hits","arijit singh","bollywood acoustic"], mustContain: /[\u0900-\u097F]/ },
  punjabi: { market: "IN", seeds: ["punjabi hits","ap dhillon","punjabi mix"], mustContain: /[\u0A00-\u0A7F]/ },
  tamil: { market: "IN", seeds: ["tamil hits","kollywood","anirudh lo-fi"], mustContain: /[\u0B80-\u0BFF]/ },
  telugu: { market: "IN", seeds: ["telugu hits","tollywood lo-fi"], mustContain: /[\u0C00-\u0C7F]/ },
  kannada: { market: "IN", seeds: ["kannada hits"], mustContain: /[\u0C80-\u0CFF]/ },
  malayalam: { market: "IN", seeds: ["malayalam hits"], mustContain: /[\u0D00-\u0D7F]/ },
  bengali: { market: "IN", seeds: ["bengali hits"], mustContain: /[\u0980-\u09FF]/ },
  marathi: { market: "IN", seeds: ["marathi hits"], mustContain: /[\u0900-\u097F]/ },
  spanish: { market: "ES", seeds: ["latin pop","reggaeton suave"] },
  korean: { market: "KR", seeds: ["k-pop","korean indie"], mustContain: /[\uAC00-\uD7AF]/ },
  japanese: { market: "JP", seeds: ["j-pop","anime soundtrack"], mustContain: /[\u3040-\u30FF]/ },
  chinese: { market: "TW", seeds: ["c-pop","mandarin chill"], mustContain: /[\u4E00-\u9FFF]/ },
  arabic: { market: "AE", seeds: ["arab pop","arabic chill"], mustContain: /[\u0600-\u06FF]/ },
};

const moodTerms = {
  chill: ["chill","lofi","acoustic"],
  happy: ["happy","feel good","pop"],
  sad: ["sad","piano","soft"],
  party: ["party","dance","club"],
  energetic: ["edm","boost","workout"]
};

async function sfetch(url, token) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return r.json();
}

function validateLanguage(track, profile) {
  const text = (track.name + " " + (track.artists?.[0]?.name || "")).toLowerCase();
  if (profile.mustContain && !profile.mustContain.test(text)) return false;
  if (profile.mustNotContain && profile.mustNotContain.test(text)) return false;
  return true;
}

export default async function handler(req, res) {
  try {
    const { token, language = "english", mood = "chill" } = req.body || {};
    if (!token) return res.status(401).json({ error: "Spotify token required" });

    const p = langProfiles[language] || langProfiles.english;
    const terms = moodTerms[mood] || ["chill"];
    const queries = [];
    for (const s of p.seeds) for (const m of terms) queries.push(`${s} ${m}`);

    let tracks = [];
    for (let i = 0; i < Math.min(4, queries.length); i++) {
      const q = encodeURIComponent(queries[i]);
      const data = await sfetch(`https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${p.market}&limit=1`, token);
      const pl = data?.playlists?.items?.[0];
      if (!pl) continue;

      const items = await sfetch(`https://api.spotify.com/v1/playlists/${pl.id}/tracks?market=${p.market}&limit=80`, token);
      for (const it of items.items || []) {
        const tr = it.track;
        if (!tr?.id) continue;
        if (!validateLanguage(tr, p)) continue;

        tracks.push({
          id: tr.id,
          uri: tr.uri,
          name: tr.name,
          artist: tr.artists?.[0]?.name || "Unknown",
          image: tr.album?.images?.[1]?.url || tr.album?.images?.[0]?.url,
          link: tr.external_urls?.spotify
        });
      }
      if (tracks.length >= 160) break;
    }

    // dedupe + shuffle
    const uniq = [...new Map(tracks.map(t => [t.id, t])).values()];
    for (let i = uniq.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [uniq[i], uniq[j]] = [uniq[j], uniq[i]];
    }

    res.json({ tracks: uniq.slice(0, 40) });
  } catch (e) {
    console.error("GET-SONGS ERROR:", e);
    res.status(500).json({ error: "Song fetch failed" });
  }
}
