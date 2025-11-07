const langProfiles = {
  english: { market: "US", seeds: ["chill pop", "indie pop", "feel good"] },
  hindi: { market: "IN", seeds: ["bollywood chill", "arijit singh", "hindi acoustic"] },
  punjabi: { market: "IN", seeds: ["punjabi hits", "punjabi chill", "ap dhillon"] },
  tamil: { market: "IN", seeds: ["tamil hits", "tamil lo-fi", "anirudh"] },
  telugu: { market: "IN", seeds: ["telugu hits", "tollywood lo-fi", "sid sriram"] },
  korean: { market: "KR", seeds: ["k-pop chill", "kpop dance", "k-indie"] },
  japanese: { market: "JP", seeds: ["j-pop chill", "anime songs", "city pop"] },
  spanish: { market: "ES", seeds: ["latin chill", "reggaeton suave", "latin pop"] },  // ✅ comma added
  kannada: { market: "IN", seeds: ["kannada hits", "kannada lo-fi", "sandalwood songs"] },
  malayalam: { market: "IN", seeds: ["malayalam hits", "malayalam chill", "mollywood songs"] },
  bengali: { market: "IN", seeds: ["bengali hits", "bengali indie", "bengali lo-fi"] },
  marathi: { market: "IN", seeds: ["marathi hits", "marathi pop", "marathi lo-fi"] },
  french: { market: "FR", seeds: ["french pop", "chanson française", "francophone chill"] },
  italian: { market: "IT", seeds: ["italian pop", "canzoni italiane", "italian chill"] },
  german: { market: "DE", seeds: ["german pop", "german rap", "deutsche chill"] },
  arabic: { market: "SA", seeds: ["arabic chill", "arab pop", "arabic hits"] },
};

const moodTerms = {
  sad: ["sad", "soft", "piano"],
  chill: ["chill", "acoustic", "lofi"],
  happy: ["happy", "feel good", "summer"],
  energetic: ["energy", "dance", "edm"],
  party: ["party", "bangers", "dance"]
};

async function sfetch(url, token) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 401) throw new Error("UNAUTHORIZED");
  return r.json();
}

export default async function handler(req, res) {
  console.log("BODY:", req.body); // ✅ Debug line

  try {
    const { token, language = "english", mood = "chill" } = req.body || {};
    if (!token) return res.status(401).json({ error: "Missing token" });

    const prof = langProfiles[language] || langProfiles.english;
    const terms = moodTerms[mood] || ["chill"];
    const market = prof.market || "US";

    const queries = [];
    for (const seed of prof.seeds) {
      for (const m of terms) queries.push(`${seed} ${m}`);
    }

    const playlists = [];
    for (let i = 0; i < Math.min(4, queries.length); i++) {
      const q = encodeURIComponent(queries[i]);
      const data = await sfetch(
        `https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${market}&limit=1`,
        token
      );
      const item = data?.playlists?.items?.[0];
      if (item) playlists.push(item);
    }

    if (!playlists.length) {
      const data = await sfetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(prof.seeds[0])}&type=playlist&market=${market}&limit=1`,
        token
      );
      const item = data?.playlists?.items?.[0];
      if (item) playlists.push(item);
    }

    let tracks = [];
    for (const pl of playlists) {
      const t = await sfetch(
        `https://api.spotify.com/v1/playlists/${pl.id}/tracks?market=${market}&limit=100`,
        token
      );
      const arr = (t.items || [])
        .map(i => i?.track)
        .filter(Boolean)
        .map(tr => ({
          id: tr.id,
          uri: tr.uri,
          name: tr.name,
          artist: tr.artists?.[0]?.name,
          image: tr.album?.images?.[1]?.url || tr.album?.images?.[0]?.url,
          url: tr.external_urls?.spotify
        }));
      tracks = tracks.concat(arr);
      if (tracks.length >= 200) break;
    }

    const seen = new Set();
    const unique = [];
    for (const t of tracks) {
      if (t.id && !seen.has(t.id)) {
        seen.add(t.id);
        unique.push(t);
      }
    }

    unique.sort(() => Math.random() - 0.5);
    return res.json({ tracks: unique.slice(0, 50) });

  } catch (e) {
    if (e.message === "UNAUTHORIZED") {
      return res.status(401).json({ error: "Spotify token expired" });
    }
    console.error("GET-SONGS ERROR:", e);
    res.status(500).json({ error: "Song fetch failed" });
  }
}
