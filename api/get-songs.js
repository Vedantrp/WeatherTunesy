export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "POST only" });
    }

    const { token, language = "english", mood = "chill" } = req.body || {};
    if (!token) return res.status(401).json({ error: "Missing token" });

    const langProfiles = {
      english: { market: "US", seeds: ["indie pop", "chill pop", "acoustic"] },
      hindi: { market: "IN", seeds: ["arijit singh", "bollywood chill", "lofi india"] },
      punjabi: { market: "IN", seeds: ["punjabi hits", "ap dhillon", "punjabi lofi"] },
      tamil: { market: "IN", seeds: ["tamil hits", "anirudh", "tamil lofi"] },
      telugu: { market: "IN", seeds: ["telugu hits", "sid sriram", "telugu lofi"] },
      marathi: { market: "IN", seeds: ["marathi songs", "marathi love"] },
      kannada: { market: "IN", seeds: ["kannada songs", "kannada lofi"] },
      malayalam: { market: "IN", seeds: ["malayalam songs", "mollywood lofi"] },
      bengali: { market: "IN", seeds: ["bengali songs", "bengali lofi"] },
      spanish: { market: "ES", seeds: ["latin pop", "latin chill"] },
      korean: { market: "KR", seeds: ["kpop chill", "k-indie"] },
      japanese: { market: "JP", seeds: ["jpop chill", "city pop"] },
      french: { market: "FR", seeds: ["french chill", "french pop"] },
      german: { market: "DE", seeds: ["german pop", "german chill"] },
      italian: { market: "IT", seeds: ["italian chill", "italian pop"] },
      chinese: { market: "HK", seeds: ["mandopop", "chinese chill"] },
      arabic: { market: "SA", seeds: ["arabic chill", "arab pop"] }
    };

    const moodTerms = {
      chill: ["chill", "lofi", "acoustic"],
      happy: ["happy", "summer", "feel good"],
      cozy: ["romantic", "soft", "warm"],
      intense: ["edm", "beats", "energy"],
      relaxed: ["soft", "ambient", "calm"]
    };

    const profile = langProfiles[language] || langProfiles.english;
    const terms = moodTerms[mood] || moodTerms.chill;
    const market = profile.market;

    async function spotify(url) {
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }});
      const d = await r.json();
      return d;
    }

    let playlists = [];
    for (let seed of profile.seeds) {
      const q = encodeURIComponent(`${seed} ${terms[0]}`);
      const data = await spotify(`https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${market}&limit=1`);
      const item = data?.playlists?.items?.[0];
      if (item) playlists.push(item);
      if (playlists.length >= 3) break;
    }

    if (!playlists.length) {
      return res.json({ tracks: [] });
    }

    let tracks = [];
    for (let pl of playlists) {
      const data = await spotify(`https://api.spotify.com/v1/playlists/${pl.id}/tracks?market=${market}&limit=100`);
      const arr = (data.items || [])
        .map(i => i.track)
        .filter(t => t?.id)
        .map(t => ({
          id: t.id,
          uri: t.uri,
          name: t.name,
          artist: t.artists?.[0]?.name,
          image: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url,
          url: t.external_urls?.spotify
        }));
      tracks = tracks.concat(arr);
    }

    // filter wrong language for English
    if (language === "english") {
      tracks = tracks.filter(t => !/[ऀ-ॿ]/.test(t.name + t.artist));
    }

    // shuffle
    tracks = [...new Map(tracks.map(t => [t.id, t])).values()];
    tracks.sort(() => Math.random() - 0.5);

    return res.json({ tracks: tracks.slice(0, 30) });

  } catch (err) {
    console.error("GET SONGS ERROR:", err);
    return res.status(500).json({ error: "Song fetch failed" });
  }
}
