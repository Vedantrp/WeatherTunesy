export const dynamic = "force-dynamic";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST")
      return res.status(405).json({ error: "POST only" });

    const { token, language = "english", mood = "chill" } = req.body || {};
    if (!token) return res.status(401).json({ error: "Missing Spotify token" });

    // -----------------------------
    // LANGUAGE PROFILES
    // -----------------------------
    const langProfiles = {
      english: { market: "US", keywords: ["english chill", "indie pop"] },
      hindi: { market: "IN", keywords: ["hindi chill", "arijit singh"] },
      punjabi: { market: "IN", keywords: ["punjabi chill", "ap dhillon"] },
      tamil: { market: "IN", keywords: ["tamil chill", "anirudh"] },
      telugu: { market: "IN", keywords: ["telugu chill", "sid sriram"] },
      marathi: { market: "IN", keywords: ["marathi hits", "marathi lo-fi"] },
      kannada: { market: "IN", keywords: ["kannada hits"] },
      malayalam: { market: "IN", keywords: ["malayalam chill"] },
      bengali: { market: "IN", keywords: ["bengali indie"] },
    };

    const lang = langProfiles[language] || langProfiles.english;

    // -----------------------------
    // MOODS
    // -----------------------------
    const moodTerms = {
      chill: ["chill", "lofi"],
      lofi: ["lofi", "sad"],
      energetic: ["energetic", "edm"],
      mellow: ["mellow", "acoustic"],
      cozy: ["cozy", "warm acoustic"],
    };

    const moodSet = moodTerms[mood] || moodTerms.chill;

    // -----------------------------
    // CREATE SEARCH QUERIES
    // -----------------------------
    const queries = [];
    for (const kw of lang.keywords) {
      for (const m of moodSet) {
        queries.push(`${kw} ${m}`);
      }
    }

    const playlists = [];

    // -----------------------------
    // SEARCH PLAYLISTS
    // -----------------------------
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

    // fallback
    if (playlists.length === 0) {
      const q = encodeURIComponent(lang.keywords[0]);
      const url = `https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${lang.market}&limit=1`;

      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const j = await r.json();
      if (j?.playlists?.items?.[0]) playlists.push(j.playlists.items[0]);
    }

    if (playlists.length === 0)
      return res.status(200).json({ tracks: [] });

    // -----------------------------
    // FETCH TRACKS
    // -----------------------------
    let tracks = [];
    for (const pl of playlists) {
      try {
        const url = `https://api.spotify.com/v1/playlists/${pl.id}/tracks?market=${lang.market}&limit=100`;

        const r = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const j = await r.json();

        const arr = (j.items || [])
          .map((i) => i.track)
          .filter(Boolean)
         .map((t) => ({
  id: t.id,
  uri: t.uri,               // REQUIRED to add songs to playlist
  name: t.name,
  artist: t.artists?.[0]?.name || "Unknown",
  url: t.external_urls?.spotify
}));


        tracks.push(...arr);
        if (tracks.length > 200) break;
      } catch (e) {
        console.error("Track fetch error:", e);
      }
    }

    // remove duplicates
    const seen = new Set();
    const unique = tracks.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });

    // -----------------------------
    // STRICT LANGUAGE FILTERING
    // -----------------------------
    const strictFilters = {
      english: [/english|uk|us|pop/i],
      hindi: [/hindi|bollywood|arijit/i],
      punjabi: [/punjabi|ap dhillon/i],
      tamil: [/tamil|anirudh|kollywood/i],
      telugu: [/telugu|sid sriram|tollywood/i],
      kannada: [/kannada/i],
      malayalam: [/malayalam/i],
      bengali: [/bengali/i],
      marathi: [/marathi/i],
    };

    const strictSet = strictFilters[language] || [];

    const filteredTracks = unique.filter((t) =>
      strictSet.some((regex) => regex.test(t.artist) || regex.test(t.name))
    );

    const finalTracks =
      filteredTracks.length > 10 ? filteredTracks : unique.slice(0, 40);

    // -----------------------------
    // SHUFFLE
    // -----------------------------
    for (let i = finalTracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [finalTracks[i], finalTracks[j]] = [finalTracks[j], finalTracks[i]];
    }

    return res.status(200).json({ tracks: finalTracks.slice(0, 40) });

  } catch (err) {
    console.error("SONG FETCH ERROR:", err);
    return res.status(500).json({ error: "Song fetch failed" });
  }
}
