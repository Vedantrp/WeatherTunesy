// /api/get-tracks.js
// Fetches REAL tracks from Spotify based on mood + language, strictly filtered.

const langProfiles = {
  english: {
    market: "US",
    playlistTerms: ["english pop", "feel good pop", "indie pop", "acoustic pop", "lofi english"],
    include: [/^[\u0000-\u024F\s'&().,!\-:]+$/i], // Latin only
    exclude: [/[^\u0000-\u024F]/], // any non-latin char
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
    playlistTerms: ["latin hits", "reggaeton", "latin pop", "musica en español"],
    include: [/\b(spanish|español|latina?|reggaeton)\b/i],
    exclude: [],
  },
  korean: {
    market: "KR",
    playlistTerms: ["k-pop", "korean pop", "kpop chill", "kpop dance"],
    include: [/[\uAC00-\uD7AF]/, /\b(kpop|k-pop|korean)\b/i],
    exclude: [],
  },
  japanese: {
    market: "JP",
    playlistTerms: ["j-pop", "japanese pop", "anime songs", "j-pop chill"],
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
    playlistTerms: ["italian pop", "italiano", "canzoni italiane"],
    include: [/\b(italian|italiano)\b/i],
    exclude: [],
  },
  chinese: {
    market: "HK",
    playlistTerms: ["c-pop", "mandarin pop", "cantopop"],
    include: [/\b(c-pop|mandarin|canto(?:pop)?)\b/i, /[\u4E00-\u9FFF]/],
    exclude: [],
  },
};

function clean(str) {
  return (str || "").trim();
}

function matchesLanguage(track, langKey) {
  const prof = langProfiles[langKey] || langProfiles.english;
  const name = `${clean(track.name)} ${clean(track.album?.name)} ${clean(track.artists?.[0]?.name)}`;
  // If include regex exists, at least one must match
  if (prof.include && prof.include.length) {
    const ok = prof.include.some((rx) => rx.test(name));
    if (!ok) return false;
  }
  // Exclude if any exclude regex matches
  if (prof.exclude && prof.exclude.length) {
    const bad = prof.exclude.some((rx) => rx.test(name));
    if (bad) return false;
  }
  return true;
}

async function fetchJson(url, token) {
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (r.status === 401) throw new Error("UNAUTHORIZED");
  return r.json();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const { language = "english", mood = "relaxed", token } = req.body;
    if (!token) return res.status(401).json({ error: "Missing Spotify token" });

    const prof = langProfiles[language] || langProfiles.english;
    const moodTerms = {
      relaxed: ["chill", "acoustic", "soft"],
      cozy: ["lofi", "acoustic", "rainy day"],
      upbeat: ["happy", "feel good", "summer"],
      romantic: ["romantic", "love", "ballad"],
      party: ["party", "dance", "bangers"],
      workout: ["workout", "gym", "energy"],
      focus: ["focus", "study", "instrumental"],
      sleep: ["sleep", "calm", "ambient"],
      energetic: ["edm", "dance", "boost"],
      intense: ["dark", "bass", "electro"],
      tropical: ["tropical", "beach", "latin"],
      balanced: ["chill pop", "easy"],
      winter: ["cozy", "soft piano", "winter"],
      mysterious: ["ambient", "synthwave", "mysterious"],
    }[mood] || ["chill"];

    // Build playlist queries combining language + mood
    const queries = [];
    for (const base of prof.playlistTerms) {
      for (const m of moodTerms) {
        queries.push(`${base} ${m}`);
      }
    }

    // Search up to 5 playlists per language/mood and gather tracks
    const market = prof.market || "US";
    const playlists = [];
    for (let i = 0; i < Math.min(5, queries.length); i++) {
      const q = encodeURIComponent(queries[i]);
      const url = `https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${market}&limit=1`;
      const data = await fetchJson(url, token);
      const item = data?.playlists?.items?.[0];
      if (item) playlists.push(item);
    }

    // If no mood playlists found → fallback to main language playlists
if (!playlists.length) {
  for (const base of prof.playlistTerms) {
    const q = encodeURIComponent(base);
    const url = `https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${market}&limit=1`;
    const data = await fetchJson(url, token);
    const item = data?.playlists?.items?.[0];
    if (item) playlists.push(item);
    if (playlists.length >= 3) break;
  }
}


    // Fetch tracks from those playlists
    let all = [];
    for (const pl of playlists) {
      const turl = `https://api.spotify.com/v1/playlists/${pl.id}/tracks?market=${market}&limit=100`;
      const t = await fetchJson(turl, token);
      const items = t?.items || [];
      for (const it of items) {
        const tr = it?.track;
        if (tr && tr.id && tr.uri && matchesLanguage(tr, language)) {
          all.push({
            id: tr.id,
            uri: tr.uri,
            name: tr.name,
            artist: (tr.artists && tr.artists[0]?.name) || "Unknown",
          });
        }
      }
      if (all.length >= 120) break; // enough pool
    }

    // Deduplicate by id and shuffle
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

    return res.status(200).json({ tracks: unique.slice(0, 120) });
  } catch (err) {
    if (err.message === "UNAUTHORIZED") {
      return res.status(401).json({ error: "Spotify token expired" });
    }
    console.error("get-tracks error:", err);
    return res.status(500).json({ error: "Track fetch failed" });
  }
}
