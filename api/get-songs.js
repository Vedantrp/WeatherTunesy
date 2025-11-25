export const dynamic = "force-dynamic";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST")
      return res.status(405).json({ error: "POST only" });

    const { token, language = "english", mood = "chill" } = req.body || {};
    if (!token) return res.status(401).json({ error: "Missing Spotify token" });

    // -----------------------------
    // Language profiles
    // -----------------------------
    const langProfiles = {
      english: { market: "US", keywords: ["english chill", "indie pop", "soft pop"] },
      hindi: { market: "IN", keywords: ["hindi chill", "bollywood chill", "arijit singh"] },
      punjabi: { market: "IN", keywords: ["punjabi chill", "punjabi hits", "ap dhillon"] },
      tamil: { market: "IN", keywords: ["tamil chill", "kollywood", "anirudh"] },
      telugu: { market: "IN", keywords: ["telugu chill", "tollywood", "sid sriram"] },
      kannada: { market: "IN", keywords: ["kannada hits"] },
      malayalam: { market: "IN", keywords: ["malayalam chill"] },
      bengali: { market: "IN", keywords: ["bengali indie"] },
      marathi: { market: "IN", keywords: ["marathi hits"] },
    };

    const lang = langProfiles[language] || langProfiles.english;

    // -----------------------------
    // Mood terms
    // -----------------------------
    const moodTerms = {
      chill: ["chill", "lofi", "soft"],
      lofi: ["lofi", "sad", "study"],
      energetic: ["energetic", "edm", "dance"],
      mellow: ["mellow", "acoustic", "soft acoustic"],
      cozy: ["cozy", "warm acoustic"],
    };

    const moodSet = moodTerms[mood] || moodTerms.chill;

    // -----------------------------
    // Build search queries
    // -----------------------------
    const queries = [];
    for (const kw of lang.keywords) {
      for (const m of moodSet) {
        queries.push(`${kw} ${m}`);
      }
    }

    // -----------------------------
    // Search playlists
    // -----------------------------
    const playlists = [];

    for (let i = 0; i < Math.min(6, queries.length); i++) {
      const q = encodeURIComponent(queries[i]);
      const url = `https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${lang.market}&limit=1`;

      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (r.status === 401)
        return res.status(401).json({ error: "Spotify token expired" });

      const j = await r.json();
      const p = j?.playlists?.items?.[0];
      if (p) playlists.push(p);
    }

    // fallback search if nothing found
    if (playlists.length === 0) {
      const q = encodeURIComponent(lang.keywords[0]);
      const url = `https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${lang.market}&limit=1`;
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      if (j?.playlists?.items?.[0]) playlists.push(j.playlists.items[0]);
    }

    if (playlists.length === 0) return res.status(200).json({ tracks: [] });

    // -----------------------------
    // Fetch tracks from playlists
    // -----------------------------
    let tracks = [];
    for (const pl of playlists) {
      try {
        const url = `https://api.spotify.com/v1/playlists/${pl.id}/tracks?market=${lang.market}&limit=100`;
        const r = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (r.status === 401)
          return res.status(401).json({ error: "Spotify token expired" });

        const j = await r.json();
        const arr = (j.items || [])
          .map((i) => i.track)
          .filter(Boolean)
          .map((t) => ({
            id: t.id,
            uri: t.uri, // REQUIRED for playlist creation
            name: t.name,
            artist: t.artists?.[0]?.name || "Unknown",
            url: t.external_urls?.spotify || null,
          }));

        tracks.push(...arr);
        if (tracks.length > 300) break;
      } catch (e) {
        console.error("Track fetch error:", e);
      }
    }

    // remove duplicates
    const seen = new Set();
    const unique = [];
    for (const t of tracks) {
      if (!t || !t.id) continue;
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      unique.push(t);
    }

    // -----------------------------
    // Strict language regex filters
    // -----------------------------
    const strictFilters = {
      english: [/english|uk|us|pop|indie|soft pop/i],
      hindi: [/hindi|bollywood|arijit|arpit|atif/i],
      punjabi: [/punjabi|ap dhillon|diljit|badshah/i],
      tamil: [/tamil|kollywood|anirudh|yuvan/i],
      telugu: [/telugu|tollywood|sid sriram|deva/i],
      kannada: [/kannada|sandalwood/i],
      malayalam: [/malayalam|mollywood/i],
      bengali: [/bengali|bangla/i],
      marathi: [/marathi|lavani/i],
    };

    const strictSet = strictFilters[language] || [];

    let filteredTracks = unique.filter((t) =>
      strictSet.some((rgx) => rgx.test(t.artist) || rgx.test(t.name))
    );

    // fallback: if strict filter yields too few tracks, return a larger chunk of unique
    if (filteredTracks.length < 10) {
      filteredTracks = unique.slice(0, 60);
    }

    // shuffle
    for (let i = filteredTracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filteredTracks[i], filteredTracks[j]] = [filteredTracks[j], filteredTracks[i]];
    }

    const out = filteredTracks.slice(0, 40);

    return res.status(200).json({ tracks: out });
  } catch (err) {
    console.error("SONG FETCH ERROR:", err);
    return res.status(500).json({ error: "Song fetch failed", detail: err.message });
  }
}
