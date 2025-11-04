// /api/get-tracks.js
// Spotify track fetcher with language + mood + fallback
// ✅ Always returns ~35 real songs in selected language

const langProfiles = {
  english: {
    market: "US",
    playlistTerms: ["english pop", "feel good pop", "indie pop", "acoustic pop", "lofi english"],
    include: [/^[\u0000-\u024F\s'&().,!\-:]+$/i],
    exclude: [/[^\u0000-\u024F]/],
  },
  hindi: {
    market: "IN",
    playlistTerms: ["bollywood", "hindi hits", "arijit singh", "bollywood acoustic", "hindi chill"],
    include: [/[\u0900-\u097F]/i, /\b(hindi|bollywood)\b/i],
    exclude: [],
  },
  punjabi: {
    market: "IN",
    playlistTerms: ["punjabi hits", "ap dhillon", "punjabi pop"],
    include: [/[\u0A00-\u0A7F]/i, /\bpunjabi\b/i],
    exclude: [],
  },
  telugu: {
    market: "IN",
    playlistTerms: ["telugu hits", "tollywood", "telugu lo-fi"],
    include: [/[\u0C00-\u0C7F]/i, /\btelugu\b/i, /\btollywood\b/i],
    exclude: [],
  },
  tamil: {
    market: "IN",
    playlistTerms: ["tamil hits", "kollywood", "tamil lo-fi"],
    include: [/[\u0B80-\u0BFF]/i, /\btamil\b/i, /\bkollywood\b/i],
    exclude: [],
  },
  spanish: {
    market: "ES",
    playlistTerms: ["latin hits", "reggaeton", "latin pop"],
    include: [/\b(spanish|español|latin|reggaeton)\b/i],
    exclude: [],
  },
  korean: {
    market: "KR",
    playlistTerms: ["k-pop", "korean pop", "kpop chill"],
    include: [/[\uAC00-\uD7AF]/, /\b(kpop|k-pop|korean)\b/i],
    exclude: [],
  },
  japanese: {
    market: "JP",
    playlistTerms: ["j-pop", "japanese pop", "anime songs"],
    include: [/[\u3040-\u30FF\u4E00-\u9FFF]/, /\b(jpop|j-pop|japanese)\b/i],
    exclude: [],
  },
  french: {
    market: "FR",
    playlistTerms: ["chanson française", "french pop", "francophone"],
    include: [/\b(fr(?:ench)?|française|francophone)\b/i],
    exclude: [],
  },
  german: {
    market: "DE",
    playlistTerms: ["german pop", "deutsche pop", "german rap"],
    include: [/\b(deutsch|german|deutsche)\b/i],
    exclude: [],
  },
  italian: {
    market: "IT",
    playlistTerms: ["italian pop", "italiano"],
    include: [/\b(italian|italiano)\b/i],
    exclude: [],
  },
  chinese: {
    market: "HK",
    playlistTerms: ["c-pop", "mandarin pop", "cantopop"],
    include: [/\b(c-pop|mandarin|canto)\b/i, /[\u4E00-\u9FFF]/],
    exclude: [],
  },
};

// helper
function clean(s) {
  return (s || "").trim();
}
function matchesLanguage(track, langKey) {
  const p = langProfiles[langKey] || langProfiles.english;
  const name = `${clean(track.name)} ${clean(track.album?.name)} ${clean(track.artists?.[0]?.name)}`;
  if (p.include.some(rx => rx.test(name)) === false) return false;
  if (p.exclude.some(rx => rx.test(name))) return false;
  return true;
}
async function fetchJson(url, token) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 401) throw new Error("UNAUTHORIZED");
  return r.json();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const { language = "english", mood = "relaxed", token } = req.body;
    if (!token) return res.status(401).json({ error: "Missing Spotify token" });

    const p = langProfiles[language] || langProfiles.english;
    const market = p.market;

    const moodTerms =
      {
        relaxed: ["chill", "acoustic", "soft"],
        cozy: ["lofi", "rainy day", "soft"],
        upbeat: ["happy", "feel good", "summer"],
        romantic: ["love", "romantic", "ballad"],
        party: ["party", "dance", "bangers"],
        workout: ["workout", "gym", "pump"],
        focus: ["focus", "study", "instrumental"],
        sleep: ["sleep", "ambient", "calm"],
        energetic: ["edm", "boost", "hyper"],
        intense: ["dark", "bass", "trap"],
        tropical: ["tropical", "beach", "latin"],
        balanced: ["chill pop", "easy"],
        winter: ["winter", "snow", "cozy"],
        mysterious: ["mysterious", "synthwave", "dreamwave"],
      }[mood] || ["chill"];

    // --- 1) Build queries
    const queries = [];
    for (const base of p.playlistTerms)
      for (const m of moodTerms) queries.push(`${base} ${m}`);

    // --- 2) Fetch playlists
    const playlists = [];
    for (let i = 0; i < 5 && i < queries.length; i++) {
      const q = encodeURIComponent(queries[i]);
      const url = `https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${market}&limit=1`;
      const data = await fetchJson(url, token);
      const item = data?.playlists?.items?.[0];
      if (item) playlists.push(item);
    }

    // fallback to pure language playlists
    if (!playlists.length) {
      for (const base of p.playlistTerms) {
        const q = encodeURIComponent(base);
        const url = `https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${market}&limit=1`;
        const data = await fetchJson(url, token);
        const item = data?.playlists?.items?.[0];
        if (item) playlists.push(item);
        if (playlists.length >= 3) break;
      }
    }

    // --- 3) fetch tracks from playlists
    let all = [];
    for (const pl of playlists) {
      const turl = `https://api.spotify.com/v1/playlists/${pl.id}/tracks?market=${market}&limit=100`;
      const t = await fetchJson(turl, token);
      for (const it of t?.items || []) {
        const tr = it?.track;
        if (tr?.id && matchesLanguage(tr, language)) {
          all.push({
            id: tr.id,
            uri: tr.uri,
            name: tr.name,
            artist: tr.artists?.[0]?.name,
          });
        }
      }
      if (all.length >= 150) break;
    }

    // fallback: TOP TRACKS (1–50)
    if (all.length < 35) {
      const url = `https://api.spotify.com/v1/browse/new-releases?country=${market}&limit=50`;
      const top = await fetchJson(url, token);
      for (const alb of top.albums?.items || []) {
        const turl = `https://api.spotify.com/v1/albums/${alb.id}/tracks?limit=10`;
        const t = await fetchJson(turl, token);
        for (const tr of t.items || []) {
          if (matchesLanguage(tr, language)) {
            all.push({
              id: tr.id,
              uri: tr.uri,
              name: tr.name,
              artist: tr.artists?.[0]?.name,
            });
          }
        }
      }
    }

    // dedupe + shuffle + return 35
    const seen = new Set();
    const unique = [];
    for (const t of all) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        unique.push(t);
      }
    }
    for (let i = unique.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unique[i], unique[j]] = [unique[j], unique[i]];
    }

    return res.status(200).json({ tracks: unique.slice(0, 35) });
  } catch (err) {
    if (err.message === "UNAUTHORIZED")
      return res.status(401).json({ error: "Spotify token expired" });

    return res.status(500).json({ error: "Track fetch failed" });
  }
}
