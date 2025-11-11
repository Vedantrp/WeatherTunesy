const langProfiles = {
  english: { market: "US", seeds: ["chill pop", "indie pop", "acoustic", "lofi", "sad pop"] },
  hindi: { market: "IN", seeds: ["hindi chill", "bollywood", "arijit singh", "hindi lo-fi"] },
  punjabi: { market: "IN", seeds: ["punjabi lo-fi", "punjabi chill", "ap dhillon"] },
  tamil: { market: "IN", seeds: ["tamil chill", "anirudh", "tamil lo-fi"] },
  telugu: { market: "IN", seeds: ["telugu chill", "sid sriram", "tollywood"] },
  kannada: { market: "IN", seeds: ["kannada chill", "kannada hits"] },
  malayalam: { market: "IN", seeds: ["malayalam chill", "malayalam indie"] },
  bengali: { market: "IN", seeds: ["bengali chill", "bengali indie"] },
  marathi: { market: "IN", seeds: ["marathi lo-fi", "marathi chill"] },
  spanish: { market: "ES", seeds: ["latin chill", "latin pop", "reggaeton suave"] },
  french: { market: "FR", seeds: ["french chill", "french pop"] },
  german: { market: "DE", seeds: ["german chill", "german pop"] },
  italian: { market: "IT", seeds: ["italian pop", "italian chill"] },
  korean: { market: "KR", seeds: ["kpop chill", "lofi kpop"] },
  japanese: { market: "JP", seeds: ["jpop chill", "anime lofi"] },
  chinese: { market: "HK", seeds: ["c-pop chill", "mandarin lofi"] },
  arabic: { market: "SA", seeds: ["arabic chill", "arab pop"] },
};

const moodTags = {
  chill: ["chill", "lofi", "acoustic"],
  sad: ["sad", "piano", "emotional"],
  summer: ["summer", "happy", "feel good"],
  lofi: ["lofi", "rain", "study"],
  cozy: ["cozy", "calm", "warm"],
};

const sfetch = async (url, token) => {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 401) throw new Error("UNAUTHORIZED");
  return r.json();
};

export default async function handler(req, res) {
  try {
    const { token, language = "english", mood = "chill" } = req.body;

    if (!token) return res.status(401).json({ error: "Missing token" });

    const prof = langProfiles[language] || langProfiles.english;
    const terms = moodTags[mood] || moodTags.chill;

    const seeds = [];

    prof.seeds.forEach(seed => {
      terms.forEach(m => seeds.push(`${seed} ${m}`));
    });

    const market = prof.market || "US";
    let tracks = [];

    for (let i = 0; i < Math.min(6, seeds.length); i++) {
      const q = encodeURIComponent(seeds[i]);

      const search = await sfetch(
        `https://api.spotify.com/v1/search?q=${q}&type=track&limit=10&market=${market}`,
        token
      );

      const found = search.tracks?.items?.map(t => ({
        id: t.id,
        uri: t.uri,
        name: t.name,
        artist: t.artists?.[0]?.name,
        url: t.external_urls.spotify
      })) || [];

      tracks.push(...found);
    }

    // dedupe + shuffle
    const unique = [];
    const seen = new Set();

    tracks.forEach(t => {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        unique.push(t);
      }
    });

    for (let i = unique.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unique[i], unique[j]] = [unique[j], unique[i]];
    }

    res.json({ tracks: unique.slice(0, 30) });
  } catch (err) {
    console.error("SONG_FETCH_ERROR:", err.message);
    res.status(500).json({ error: "Song fetch failed" });
  }
}
