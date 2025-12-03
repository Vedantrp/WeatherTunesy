// /api/get-songs.js
// POST body: { token: string, language?: string, mood?: string, limit?: number }
// Returns: { tracks: [...], sourceCount, note }

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    // parse body (supports raw stream fallback)
    const rawBody = req.body && typeof req.body === "object" ? req.body : JSON.parse(await bufferToString(req));
    const token = rawBody.token;
    const language = (rawBody.language || "english").toLowerCase();
    const mood = (rawBody.mood || "chill").toLowerCase();
    const limit = Math.min(Math.max(1, parseInt(rawBody.limit, 10) || 35), 120);

    if (!token) return res.status(401).json({ error: "Missing Spotify token" });

    // language profiles (only essential parts shown; you can expand)
    const profiles = {
      english: { market: "US", playlistTerms: ["english pop", "indie pop", "acoustic pop", "lofi english"] },
      hindi:  { market: "IN", playlistTerms: ["hindi hits", "bollywood", "bollywood classics", "arijit singh", "hindi chill"] },
      punjabi:{ market: "IN", playlistTerms: ["punjabi hits", "punjabi pop"] },
      // ... other languages (keep your existing map if you have it)
    };
    const profile = profiles[language] || profiles.english;
    const market = profile.market || "US";

    // mood map (keeps searches relevant)
    const moodMap = {
      chill: ["chill","acoustic","lofi"],
      cozy: ["lofi","rain","acoustic"],
      upbeat: ["happy","feel good","summer"],
      mysterious: ["ambient","synthwave"],
      default: ["chill"]
    };
    const moodTerms = moodMap[mood] || moodMap.default;

    // Strong Hindi heuristics: Devanagari script OR common Hindi words
    const hindiScriptRx = /[\u0900-\u097F]/;
    const commonHindiWords = ["pyaar","pyar","dil","jaan","mera","meri","tum","teri","tere","kab","kaise","hai","ho","chaha","chahat","kabhi","zindagi","duniya","saath","sajna","sajan","yaar","yaari","bollywood","filmi","ishq","arijit"];

    function looksHindi(text) {
      if (!text) return false;
      if (hindiScriptRx.test(text)) return true;
      const lower = text.toLowerCase();
      // check for presence of any common Hindi word
      for (const w of commonHindiWords) if (lower.includes(w)) return true;
      return false;
    }

    // Helper fetch Json with auth
    async function fetchJson(url, opts = {}) {
      const headers = { Authorization: `Bearer ${token}`, ...(opts.headers || {}) };
      const r = await fetch(url, { ...opts, headers });
      if (r.status === 401) throw new Error("UNAUTHORIZED");
      if (r.status === 429) throw new Error("RATE_LIMIT");
      const text = await r.text();
      try { return JSON.parse(text); } catch { return { raw: text, status: r.status }; }
    }

    // Build prioritized playlist queries — if language is hindi append keywords
    const queries = [];
    for (const seed of profile.playlistTerms) {
      for (const m of moodTerms) {
        if (language === "hindi") queries.push(`${seed} ${m} hindi bollywood`);
        else queries.push(`${seed} ${m}`);
      }
    }
    // add seeds without mood (again prefer language keyword for Hindi)
    for (const seed of profile.playlistTerms) queries.push(language === "hindi" ? `${seed} bollywood hindi` : seed);

    const playlists = [];
    const maxPlaylistSearches = Math.min(6, queries.length);
    for (let i = 0; i < maxPlaylistSearches; i++) {
      const q = encodeURIComponent(queries[i]);
      const url = `https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${market}&limit=1`;
      try {
        const data = await fetchJson(url);
        const item = data?.playlists?.items?.[0];
        if (item) playlists.push(item);
      } catch (err) {
        if (err.message === "UNAUTHORIZED") return res.status(401).json({ error: "Spotify token expired" });
        console.warn("playlist search error", err.message || err);
      }
    }

    // If no playlist found, try a fallback language-specific search (Hindi gets explicit 'bollywood')
    if (!playlists.length) {
      for (const seed of profile.playlistTerms.slice(0, 4)) {
        const q = encodeURIComponent(language === "hindi" ? `${seed} bollywood hindi` : seed);
        try {
          const d = await fetchJson(`https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${market}&limit=1`);
          const item = d?.playlists?.items?.[0];
          if (item) playlists.push(item);
          if (playlists.length >= 3) break;
        } catch (e) { /* ignore */ }
      }
    }

    // collect track pool from playlists
    let pool = [];
    for (const pl of playlists) {
      try {
        const turl = `https://api.spotify.com/v1/playlists/${pl.id}/tracks?market=${market}&limit=100`;
        const td = await fetchJson(turl);
        const items = td?.items || [];
        for (const it of items) {
          const tr = it?.track;
          if (!tr || !tr.id) continue;
          pool.push({
            id: tr.id,
            uri: tr.uri,
            name: tr.name,
            artist: (tr.artists && tr.artists[0]?.name) || "Unknown",
            album: tr.album?.name || "",
            image: tr.album?.images?.[0]?.url || null,
            url: tr.external_urls?.spotify || null,
            raw: tr
          });
        }
      } catch (err) {
        if (err.message === "UNAUTHORIZED") return res.status(401).json({ error: "Spotify token expired" });
        console.warn("playlist tracks fetch err", err.message || err);
      }
      if (pool.length >= 200) break;
    }

    // Language filter: prefer tracks that match language heuristics
    function matchesLanguageCandidate(t) {
      if (!t) return false;
      // If Hindi requested -> check Devanagari OR common Hindi words in title/artist/album
      if (language === "hindi") {
        if (looksHindi(`${t.name} ${t.artist} ${t.album}`)) return true;
        // also prefer tracks where album or artist includes 'bollywood' or 'filmi'
        const lower = `${t.name} ${t.artist} ${t.album}`.toLowerCase();
        if (lower.includes("bollywood") || lower.includes("filmi")) return true;
        return false;
      }
      // For other languages you can use script checks or keywords; basic fallback:
      if (language === "english") {
        // ensure not containing Devanagari (avoid Hindi bleed into English)
        if (hindiScriptRx.test(`${t.name} ${t.artist} ${t.album}`)) return false;
        return true; // accept by default for english
      }
      // default: accept
      return true;
    }

    // Filter pool
    let filtered = pool.filter(matchesLanguageCandidate);

    // If insufficient filtered results for Hindi, run direct track searches with explicit "hindi" keywords
    if (language === "hindi" && filtered.length < Math.max(12, Math.floor(limit / 2))) {
      const trackSearchQueries = [];
      for (const seed of profile.playlistTerms.slice(0, 4)) {
        for (const m of moodTerms.slice(0, 3)) trackSearchQueries.push(`${seed} ${m} bollywood hindi`);
      }
      for (let i = 0; i < Math.min(6, trackSearchQueries.length); i++) {
        const q = encodeURIComponent(trackSearchQueries[i]);
        try {
          const data = await fetchJson(`https://api.spotify.com/v1/search?q=${q}&type=track&market=${market}&limit=50`);
          const items = data?.tracks?.items || [];
          for (const tr of items) {
            if (!tr || !tr.id) continue;
            const candidate = {
              id: tr.id,
              uri: tr.uri,
              name: tr.name,
              artist: (tr.artists && tr.artists[0]?.name) || "Unknown",
              album: tr.album?.name || "",
              image: tr.album?.images?.[0]?.url || null,
              url: tr.external_urls?.spotify || null,
              raw: tr
            };
            if (matchesLanguageCandidate(candidate)) filtered.push(candidate);
            else pool.push(candidate);
          }
        } catch (e) {
          if (e.message === "UNAUTHORIZED") return res.status(401).json({ error: "Spotify token expired" });
          console.warn("track search error", e.message || e);
        }
        if (filtered.length >= 200) break;
      }
    }

    // final fallback: if filtered empty, use pool (but mark note)
    if (!filtered.length) filtered = pool.slice();

    // dedupe
    const seen = new Set();
    const unique = [];
    for (const t of filtered) {
      if (!t.id || seen.has(t.id)) continue;
      seen.add(t.id);
      unique.push(t);
    }

    // shuffle
    for (let i = unique.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unique[i], unique[j]] = [unique[j], unique[i]];
    }

    const results = unique.slice(0, limit).map(t => ({
      id: t.id, uri: t.uri, name: t.name, artist: t.artist, album: t.album, image: t.image, url: t.url
    }));

    if (!results.length) {
      return res.status(200).json({ tracks: [], note: "No Hindi-like tracks found. Try nearby city or different mood." });
    }

    // If some returned items aren't strongly Hindi but overall language requested was Hindi, include a note
    let note = `Returned ${results.length} tracks for language=${language} mood=${mood}`;
    if (language === "hindi") {
      const hindiCount = results.filter(r => looksHindi(`${r.name} ${r.artist} ${r.album}`)).length;
      if (hindiCount < Math.ceil(results.length * 0.6)) {
        note += `. Only ${hindiCount}/${results.length} look strongly Hindi — consider retrying with 'bollywood' mood or different city.`;
      }
    }

    return res.status(200).json({ tracks: results, sourceCount: playlists.length, note });
  } catch (err) {
    console.error("get-songs error:", err && err.stack ? err.stack : err);
    if (err.message === "UNAUTHORIZED") return res.status(401).json({ error: "Spotify token expired" });
    if (err.message === "RATE_LIMIT") return res.status(429).json({ error: "Spotify rate limit" });
    return res.status(500).json({ error: "Song fetch failed", details: String(err && err.message ? err.message : err) });
  }
}

// fallback helper to read raw body if necessary (serverless)
async function bufferToString(req) {
  return new Promise((resolve, reject) => {
    try {
      let data = "";
      req.on("data", chunk => data += chunk.toString());
      req.on("end", () => resolve(data || "{}"));
      req.on("error", reject);
    } catch (e) { resolve("{}"); }
  });
    }    }

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
