const langProfiles = {
  english: { market: "US", seeds: ["indie pop", "chill hits", "acoustic", "feel good"] },
  hindi: { market: "IN", seeds: ["bollywood hits", "arijit singh", "hindi chill", "hindustani acoustic"] },
  punjabi: { market: "IN", seeds: ["punjabi hits", "punjabi pop", "lofi punjabi"] },
  tamil: { market: "IN", seeds: ["tamil hits", "anirudh", "tamil chill"] },
  telugu: { market: "IN", seeds: ["telugu hits", "tollywood lo-fi", "sid sriram"] },
  kannada: { market: "IN", seeds: ["kannada hits", "kannada lo-fi"] },
  malayalam: { market: "IN", seeds: ["malayalam hits", "malayalam chill"] },
  bengali: { market: "IN", seeds: ["bengali indie", "bengali hits"] },
  marathi: { market: "IN", seeds: ["marathi hits", "marathi pop"] },
  korean: { market: "KR", seeds: ["k-pop", "k-pop chill", "k-indie"] },
  japanese: { market: "JP", seeds: ["j-pop", "anime songs", "city pop"] },
  spanish: { market: "ES", seeds: ["latin pop", "reggaeton suave", "latin chill"] },
  french: { market: "FR", seeds: ["french pop", "chanson française", "french chill"] },
  german: { market: "DE", seeds: ["german pop", "deutsche rap", "german chill"] },
  italian: { market: "IT", seeds: ["italian pop", "italian chill"] },
  arabic: { market: "AE", seeds: ["arabic chill", "arab pop"] },
};

const moodTerms = {
  sad: ["sad", "soft", "piano"],
  chill: ["chill", "lofi", "acoustic"],
  happy: ["happy", "feel good", "sunny vibes"],
  energetic: ["workout", "edm", "party"],
  romantic: ["romantic", "love", "heartfelt"],
};

async function sfetch(url, token) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 401) throw new Error("UNAUTHORIZED");
  return r.json();
}

export default async function handler(req, res) {
  try {
    const { token, language, mood } = req.body;
    if (!token) return res.status(401).json({ error: "No Spotify token" });

    const prof = langProfiles[language] || langProfiles.english;
    const terms = moodTerms[mood] || ["chill"];
    const market = prof.market;

    let queries = [];
    prof.seeds.forEach(seed => terms.forEach(m => queries.push(`${seed} ${m}`)));

    let tracks = [];

    for (let i = 0; i < 6 && i < queries.length; i++) {
      const q = encodeURIComponent(queries[i]);
      const pl = await sfetch(
        `https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${market}&limit=1`,
        token
      );

      const playlist = pl.playlists?.items?.[0];
      if (!playlist) continue;

      const t = await sfetch(
        `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?market=${market}&limit=80`,
        token
      );

      const items = (t.items || [])
        .map(x => x.track)
        .filter(Boolean)
        .map(tr => ({
          id: tr.id,
          uri: tr.uri,
          name: tr.name,
          artist: tr.artists?.[0]?.name || "Unknown",
          url: tr.external_urls?.spotify,
          // ✅ real album cover now, no more same image
          image: tr.album?.images?.[0]?.url || "",
        }));

      tracks.push(...items);
      if (tracks.length > 120) break;
    }

    // Remove duplicates
    const seen = new Set();
    const unique = tracks.filter(t => !seen.has(t.id) && seen.add(t.id));

    // Shuffle
    for (let i = unique.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unique[i], unique[j]] = [unique[j], unique[i]];
    }

    return res.json({ tracks: unique.slice(0, 40) }); // ✅ return 40
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error fetching songs" });
  }
}
