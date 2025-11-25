export default async function handler(req, res) {
  try {
    if (req.method !== "POST")
      return res.status(405).json({ error: "POST only" });

    const { token, language = "english", mood = "chill" } = req.body || {};
    if (!token) return res.status(401).json({ error: "Missing Spotify token" });

    // -----------------------------
    // 1) LANGUAGE DEFINITIONS
    // -----------------------------
    const langProfiles = {
      english: {
        market: "US",
        keywords: ["english chill", "indie pop", "uk pop", "us chill", "soft pop"],
      },
      hindi: {
        market: "IN",
        keywords: ["hindi chill", "bollywood chill", "arijit singh", "hindi acoustic"],
      },
      punjabi: {
        market: "IN",
        keywords: ["punjabi chill", "punjabi hits", "ap dhillon", "punjabi lo-fi"],
      },
      tamil: {
        market: "IN",
        keywords: ["tamil chill", "anirudh", "kollywood lo-fi"],
      },
      telugu: {
        market: "IN",
        keywords: ["telugu chill", "sid sriram", "tollywood lo-fi"],
      },
      kannada: {
        market: "IN",
        keywords: ["kannada hits", "kannada lo-fi"],
      },
      malayalam: {
        market: "IN",
        keywords: ["malayalam hits", "mollywood chill"],
      },
      bengali: {
        market: "IN",
        keywords: ["bengali hits", "bengali lo-fi", "bengali indie"],
      },
      marathi: {
        market: "IN",
        keywords: ["marathi hits", "marathi lo-fi"],
      },
      spanish: {
        market: "ES",
        keywords: ["latin chill", "reggaeton suave", "spanish chill"],
      },
      french: {
        market: "FR",
        keywords: ["french chill", "french pop", "chanson française"],
      },
      german: {
        market: "DE",
        keywords: ["german chill", "german pop"],
      },
      italian: {
        market: "IT",
        keywords: ["italian chill", "italian pop"],
      },
      korean: {
        market: "KR",
        keywords: ["korean chill", "kpop chill", "k-indie"],
      },
      japanese: {
        market: "JP",
        keywords: ["jpop chill", "city pop", "anime lo-fi"],
      },
      chinese: {
        market: "HK",
        keywords: ["c-pop chill", "mandarin pop"],
      },
      arabic: {
        market: "SA",
        keywords: ["arabic chill", "arab lo-fi"],
      },
    };

    const lang = langProfiles[language] || langProfiles.english;

    // -----------------------------
    // 2) MOOD DEFINITIONS
    // -----------------------------
    const moodTerms = {
      chill: ["chill", "lofi", "soft"],
      lofi: ["lofi", "sad chill"],
      mellow: ["mellow", "soft acoustic"],
      energetic: ["energetic", "edm", "dance"],
      summer: ["summer vibes", "feel good"],
      calm: ["calm", "ambient"],
      mysterious: ["synthwave", "ambient"],
      cozy: ["cozy", "warm acoustic"],
    };

    const moodSet = moodTerms[mood] || moodTerms.chill;

    // -----------------------------
    // 3) MAKE SEARCH QUERY LIST
    // -----------------------------
    const queries = [];
    for (const kw of lang.keywords) {
      for (const m of moodSet) {
        queries.push(${kw} ${m});
      }
    }

    // -----------------------------
    // 4) SEARCH PLAYLISTS
    // -----------------------------
    const playlists = [];

    for (let i = 0; i < Math.min(6, queries.length); i++) {
      const q = encodeURIComponent(queries[i]);
      const url = https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${lang.market}&limit=1;

      const r = await fetch(url, {
        headers: { Authorization: Bearer ${token} },
      });

      if (r.status === 401)
        return res.status(401).json({ error: "Spotify token expired" });

      const j = await r.json();
      const p = j?.playlists?.items?.[0];
      if (p) playlists.push(p);
    }

    // Fallback if zero playlists found
    if (playlists.length === 0) {
      const q = encodeURIComponent(lang.keywords[0]);
      const url = https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${lang.market}&limit=1;
      const r = await fetch(url, {
        headers: { Authorization: Bearer ${token} },
      });
      const j = await r.json();
      if (j?.playlists?.items?.[0]) playlists.push(j.playlists.items[0]);
    }

    if (playlists.length === 0)
      return res.status(200).json({ tracks: [] });

    // -----------------------------
    // 5) FETCH TRACKS FROM PLAYLISTS
    // -----------------------------
    let tracks = [];
    for (const pl of playlists) {
      try {
        const url = https://api.spotify.com/v1/playlists/${pl.id}/tracks?market=${lang.market}&limit=100;
        const r = await fetch(url, {
          headers: { Authorization: Bearer ${token} },
        });
        const j = await r.json();

        const arr = (j.items || [])
          .map((i) => i.track)
          .filter(Boolean)
          .map((t) => ({
            id: t.id,
            uri: t.uri,
            name: t.name,
            artist: t.artists?.[0]?.name || "Unknown",
            image: t.album?.images?.[0]?.url || null,
            url: t.external_urls?.spotify || null,
          }));

        tracks.push(...arr);
        if (tracks.length > 200) break;
      } catch (e) {
        console.error("Track fetch error:", e);
      }
    }

    // -----------------------------
    // 6) REMOVE DUPLICATES
    // -----------------------------
    const seen = new Set();
    const unique = [];

    for (const t of tracks) {
      if (t.id && !seen.has(t.id)) {
        seen.add(t.id);
        unique.push(t);
      }
    }

    // -----------------------------
    // 7) STRICT LANGUAGE FILTERING
    // -----------------------------
    const langFilters = {
      english: [/english|uk|us|pop/i],
      hindi: [/hindi|bollywood|arijit/i],
      punjabi: [/punjabi|ap dhillon/i],
      tamil: [/tamil|kollywood|anirudh/i],
      telugu: [/telugu|tollywood|sid sriram/i],
      kannada: [/kannada/i],
      malayalam: [/malayalam|mollywood/i],
      bengali: [/bengali/i],
      marathi: [/marathi/i],
      spanish: [/latin|reggaeton|spanish/i],
      french: [/french|français/i],
      german: [/german/i],
      italian: [/italian/i],
      korean: [/kpop|korean/i],
      japanese: [/jpop|anime|city pop/i],
      chinese: [/c-pop|mandarin/i],
      arabic: [/arabic|arab|khaleeji/i],
    };

    const filterSet = langFilters[language] || [];

    const finalFiltered = unique.filter((t) => {
      return filterSet.some((rgx) => rgx.test(t.artist) || rgx.test(t.name));
    });

    // fallback if over-filtered
    const finalTracks =
      finalFiltered.length >= 10 ? finalFiltered : unique.slice(0, 40);

    // -----------------------------
    // 8) SHUFFLE
    // -----------------------------
    for (let i = finalTracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [finalTracks[i], finalTracks[j]] = [finalTracks[j], finalTracks[i]];
    }

    return res.status(200).json({
      tracks: finalTracks.slice(0, 35),
    });
  } catch (err) {
    console.error("SONG FETCH ERROR:", err);
    return res.status(500).json({ error: "Song fetch failed" });
  }
}
