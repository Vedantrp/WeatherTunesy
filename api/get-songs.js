// /api/get-songs.js
// POST only
// Body: { token: string, language?: string, mood?: string, limit?: number }
// Response: { tracks: [ { id, uri, name, artist, album, image, url } ], sourceCount: number }

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const body = (req.body && typeof req.body === "object") ? req.body : JSON.parse(await bufferToString(req));
    const { token, language = "english", mood = "chill", limit = 35 } = body || {};

    if (!token) return res.status(401).json({ error: "Missing Spotify token" });

    // --- Language profiles (playlist seeds & basic include/exclude checks) ---
    const langProfiles = {
      english: {
        market: "US",
        playlistTerms: ["english pop", "feel good pop", "indie pop", "acoustic pop", "lofi english"],
        include: [/^[\u0000-\u024F\s'&().,!\-:]+$/i], // latin script
      },
      hindi: {
        market: "IN",
        playlistTerms: ["bollywood", "hindi hits", "arijit singh", "bollywood acoustic", "hindi chill"],
        include: [/[\u0900-\u097F]/, /\b(hindi|bollywood)\b/i],
      },
      punjabi: {
        market: "IN",
        playlistTerms: ["punjabi hits", "punjabi pop", "ap dhillon"],
        include: [/[\u0A00-\u0A7F]/, /\bpunjabi\b/i],
      },
      tamil: {
        market: "IN",
        playlistTerms: ["tamil hits", "kollywood", "tamil lo-fi"],
        include: [/[\u0B80-\u0BFF]/, /\btamil\b/i],
      },
      telugu: {
        market: "IN",
        playlistTerms: ["telugu hits", "tollywood", "telugu lo-fi"],
        include: [/[\u0C00-\u0C7F]/, /\btelugu\b/i],
      },
      kannada: {
        market: "IN",
        playlistTerms: ["kannada hits", "kannada chill", "sandalwood"],
        include: [/[\u0C80-\u0CFF]/, /\bkannada\b/i],
      },
      malayalam: {
        market: "IN",
        playlistTerms: ["malayalam hits", "mollywood", "malayalam chill"],
        include: [/[\u0D00-\u0D7F]/, /\b(malayalam|mollywood)\b/i],
      },
      bengali: {
        market: "IN",
        playlistTerms: ["bengali hits", "bengali indie", "bangla hits"],
        include: [/[\u0980-\u09FF]/, /\b(bengali|bangla)\b/i],
      },
      marathi: {
        market: "IN",
        playlistTerms: ["marathi hits", "marathi pop"],
        include: [/\bmarathi\b/i],
      },
      spanish: {
        market: "ES",
        playlistTerms: ["latin hits", "reggaeton", "latin pop", "musica en español"],
        include: [/\b(spanish|español|latina?|reggaeton)\b/i],
      },
      portuguese: {
        market: "BR",
        playlistTerms: ["brazilian pop", "brazilian hits", "mpb"],
        include: [/\b(portuguese|brazil|brasil)\b/i],
      },
      french: {
        market: "FR",
        playlistTerms: ["chanson française", "french pop", "francophone"],
        include: [/\b(fr(?:ench)?|française|francophone)\b/i],
      },
      german: {
        market: "DE",
        playlistTerms: ["german pop", "deutsche pop"],
        include: [/\b(deutsch|german|deutsche)\b/i],
      },
      italian: {
        market: "IT",
        playlistTerms: ["italian pop", "italiano", "canzoni italiane"],
        include: [/\b(italian|italiano)\b/i],
      },
      korean: {
        market: "KR",
        playlistTerms: ["k-pop", "korean pop", "kpop chill"],
        include: [/[\uAC00-\uD7AF]/, /\b(kpop|k-pop|korean)\b/i],
      },
      japanese: {
        market: "JP",
        playlistTerms: ["j-pop", "anime songs", "city pop", "japanese pop"],
        include: [/[\u3040-\u30FF\u4E00-\u9FFF]/, /\b(jpop|j-pop|japanese)\b/i],
      },
      chinese: {
        market: "HK",
        playlistTerms: ["c-pop", "mandarin pop", "cantopop", "mandarin hits"],
        include: [/[\u4E00-\u9FFF]/, /\b(mandarin|c-pop|cantopop)\b/i],
      },
      arabic: {
        market: "SA",
        playlistTerms: ["arabic pop", "arabic hits", "arab pop"],
        include: [/\b(arabic|arab|arabia)\b/i],
      },
    };

    const profile = langProfiles[language.toLowerCase()] || langProfiles.english;
    const market = profile.market || "US";

    const moodMap = {
      chill: ["chill", "acoustic", "lofi"],
      relaxed: ["chill", "acoustic", "soft"],
      cozy: ["lofi", "acoustic", "rainy day"],
      upbeat: ["happy", "feel good", "summer"],
      romantic: ["romantic", "love", "ballad"],
      party: ["party", "dance", "bangers"],
      workout: ["workout", "gym", "energy"],
      focus: ["focus", "study", "instrumental", "ambient"],
      sleep: ["sleep", "calm", "ambient"],
      energetic: ["edm", "dance", "boost"],
      mysterious: ["ambient", "synthwave", "mysterious"],
      tropical: ["tropical", "beach", "latin"],
      winter: ["cozy", "soft piano", "winter"],
      default: ["chill", "easy"],
    };

    const moodTerms = moodMap[mood] || moodMap.default;

    // Helper: fetch with Authorization header and JSON parsing + basic errors
    async function fetchJson(url, opts = {}) {
      const headers = { Authorization: `Bearer ${token}`, ...(opts.headers || {}) };
      const r = await fetch(url, { ...opts, headers });
      if (r.status === 401) throw new Error("UNAUTHORIZED");
      if (r.status === 429) throw new Error("RATE_LIMIT");
      const txt = await r.text();
      try {
        return JSON.parse(txt);
      } catch {
        // return text as fallback in error case
        return { raw: txt, status: r.status };
      }
    }

    // --- Build queries: combine playlistTerms + moodTerms (prioritize language seeds) ---
    const queries = [];
    for (const seed of profile.playlistTerms) {
      for (const m of moodTerms) queries.push(`${seed} ${m}`);
    }
    // add pure seeds too (if not already)
    for (const s of profile.playlistTerms) queries.push(s);

    // limit how many playlist searches we run (avoid too many requests)
    const maxPlaylistQueries = Math.min(6, queries.length);

    // 1) Try to find playlists that match language + mood
    const playlists = [];
    for (let i = 0; i < maxPlaylistQueries; i++) {
      const q = encodeURIComponent(queries[i]);
      const url = `https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${market}&limit=1`;
      try {
        const data = await fetchJson(url);
        const item = data?.playlists?.items?.[0];
        if (item) playlists.push(item);
      } catch (err) {
        if (err.message === "UNAUTHORIZED") return res.status(401).json({ error: "Spotify token expired" });
        if (err.message === "RATE_LIMIT") return res.status(429).json({ error: "Spotify rate limit" });
        // continue on other errors
        console.warn("playlist search error:", err.message || err);
      }
    }

    // If we couldn't find many playlists, also try plain language seeds
    if (!playlists.length) {
      for (const base of profile.playlistTerms.slice(0, 4)) {
        const q = encodeURIComponent(base);
        const url = `https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${market}&limit=1`;
        try {
          const data = await fetchJson(url);
          const item = data?.playlists?.items?.[0];
          if (item) playlists.push(item);
          if (playlists.length >= 3) break;
        } catch (e) { /* ignore */ }
      }
    }

    // 2) From playlists, collect tracks (up to a reasonable pool)
    let pool = [];
    const maxPoolSize = 200; // how many tracks to gather before slicing
    for (const pl of playlists) {
      try {
        const turl = `https://api.spotify.com/v1/playlists/${pl.id}/tracks?market=${market}&limit=100`;
        const tdata = await fetchJson(turl);
        const items = tdata?.items || [];
        for (const it of items) {
          const tr = it?.track;
          if (!tr || !tr.id) continue;
          const candidate = {
            id: tr.id,
            uri: tr.uri,
            name: tr.name,
            artist: (tr.artists && tr.artists[0]?.name) || "Unknown",
            album: tr.album?.name || "",
            image: (tr.album?.images && tr.album.images[0]?.url) || null,
            url: tr.external_urls?.spotify || null,
            raw: tr,
          };
          // language-filter check: will use matchesLanguage below
          pool.push(candidate);
        }
      } catch (err) {
        if (err.message === "UNAUTHORIZED") return res.status(401).json({ error: "Spotify token expired" });
        console.warn("playlist tracks fetch err", err.message || err);
      }
      if (pool.length >= maxPoolSize) break;
    }

    // Helper: check language heuristics for a track (title/artist/album)
    function matchesLanguage(track, langKey) {
      const prof = langProfiles[langKey] || langProfiles.english;
      const name = `${(track.name || "")} ${(track.album || "")} ${(track.artist || "")}`;
      if (prof.include && prof.include.length) {
        const ok = prof.include.some((rx) => rx.test(name));
        if (!ok) return false;
      }
      if (prof.exclude && prof.exclude.length) {
        const bad = prof.exclude.some((rx) => rx.test(name));
        if (bad) return false;
      }
      return true;
    }

    // Filter pool by language (if pool is empty or too small we'll fallback to track-search)
    let filtered = pool.filter((t) => matchesLanguage(t, language));

    // If filtered is too small (e.g., < limit/2), also attempt direct track search queries
    if (filtered.length < Math.max(10, Math.floor(limit / 2))) {
      // Build several track search queries combining language seeds + mood terms
      const trackQueries = [];
      for (const seed of profile.playlistTerms.slice(0, 4)) {
        for (const m of moodTerms.slice(0, 3)) {
          trackQueries.push(`${seed} ${m}`);
        }
      }
      // add plain seed terms
      for (const s of profile.playlistTerms.slice(0, 3)) trackQueries.push(s);

      for (let i = 0; i < Math.min(6, trackQueries.length); i++) {
        const q = encodeURIComponent(trackQueries[i]);
        const url = `https://api.spotify.com/v1/search?q=${q}&type=track&market=${market}&limit=50`;
        try {
          const data = await fetchJson(url);
          const items = data?.tracks?.items || [];
          for (const tr of items) {
            if (!tr || !tr.id) continue;
            const candidate = {
              id: tr.id,
              uri: tr.uri,
              name: tr.name,
              artist: (tr.artists && tr.artists[0]?.name) || "Unknown",
              album: tr.album?.name || "",
              image: (tr.album?.images && tr.album.images[0]?.url) || null,
              url: tr.external_urls?.spotify || null,
              raw: tr,
            };
            if (matchesLanguage(candidate, language)) filtered.push(candidate);
            else {
              // keep as fallback candidate
              pool.push(candidate);
            }
          }
        } catch (err) {
          if (err.message === "UNAUTHORIZED") return res.status(401).json({ error: "Spotify token expired" });
          console.warn("track search err:", err.message || err);
        }
        if (filtered.length >= maxPoolSize) break;
      }
    }

    // If still nothing matched, fallback to best-effort: use pool (may contain mixed languages)
    if (!filtered.length) {
      filtered = pool.slice();
    }

    // Deduplicate by id
    const seen = new Set();
    const unique = [];
    for (const t of filtered) {
      if (!t.id) continue;
      if (!seen.has(t.id)) {
        seen.add(t.id);
        unique.push(t);
      }
    }

    // Shuffle (Fisher-Yates)
    for (let i = unique.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unique[i], unique[j]] = [unique[j], unique[i]];
    }

    // Final slice to requested limit (max 120 to be safe)
    const finalLimit = Math.min(Math.max(1, parseInt(limit, 10) || 35), 120);
    const results = unique.slice(0, finalLimit).map((t) => ({
      id: t.id,
      uri: t.uri,
      name: t.name,
      artist: t.artist,
      album: t.album,
      image: t.image,
      url: t.url,
    }));

    // If zero results, give helpful message
    if (!results.length) {
      return res.status(200).json({
        tracks: [],
        note: "No songs matched. Try different language/mood or ensure Spotify token has correct scopes.",
      });
    }

    return res.status(200).json({
      tracks: results,
      sourceCount: playlists.length,
      note: `Returned ${results.length} tracks (language=${language}, mood=${mood}).`,
    });
  } catch (err) {
    console.error("get-songs error:", err && err.stack ? err.stack : err);
    if (err.message === "UNAUTHORIZED") return res.status(401).json({ error: "Spotify token expired" });
    return res.status(500).json({ error: "Song fetch failed", details: String(err && err.message ? err.message : err) });
  }
}

// --- helper function for platforms where req.body may be a raw stream (fallback) ---
async function bufferToString(req) {
  return new Promise((resolve, reject) => {
    try {
      let data = "";
      req.on("data", chunk => data += chunk.toString());
      req.on("end", () => resolve(data || "{}"));
      req.on("error", reject);
    } catch (e) {
      resolve("{}");
    }
  });
      }
