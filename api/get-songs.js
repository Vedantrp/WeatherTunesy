// /api/get-songs.js
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

    const { token, language = "english", mood = "chill" } = req.body || {};
    if (!token) return res.status(401).json({ error: "Missing token" });

    const languageSeeds = {
      english: ["chill pop", "indie pop", "acoustic"],
      hindi: ["bollywood chill", "arijit singh", "hindi indie"],
      punjabi: ["punjabi chill", "ap dhillon", "punjabi hits"],
      tamil: ["tamil chill", "anirudh", "kollywood"],
      telugu: ["telugu chill", "sid sriram", "tollywood"],
      marathi: ["marathi songs", "marathi chill"],
      kannada: ["kannada hits", "sandalwood"],
      malayalam: ["malayalam chill", "mollywood"],
      bengali: ["bengali songs", "bengali indie"],
      spanish: ["latin chill", "reggaeton suave"],
      korean: ["k-pop chill", "k-indie"],
      japanese: ["j-pop chill", "anime songs"],
      french: ["french pop"],
      german: ["german pop"],
      italian: ["italian pop"],
      arabic: ["arabic chill"]
    };

    const moods = {
      chill: ["chill", "acoustic", "lofi"],
      happy: ["happy", "feel good"],
      sad: ["sad", "emotional"],
      energetic: ["energy", "edm"],
      party: ["party", "dance"]
    };

    const seeds = languageSeeds[language] || languageSeeds.english;
    const moodTerms = moods[mood] || moods.chill;
    const queries = [];

    for (const s of seeds) {
      for (const m of moodTerms) queries.push(`${s} ${m}`);
    }

    const market = ["IN","US","JP","ES"][Math.floor(Math.random()*4)] || "US";

    async function spotify(url) {
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (r.status === 401) return res.status(401).json({ error: "Spotify token expired" });

      return r.json();
    }

    const playlists = [];
    for (let i = 0; i < Math.min(4, queries.length); i++) {
      const q = encodeURIComponent(queries[i]);
      const data = await spotify(`https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${market}&limit=1`);
      const pl = data?.playlists?.items?.[0];
      if (pl) playlists.push(pl);
    }

    const tracks = [];
    for (const pl of playlists) {
      const list = await spotify(`https://api.spotify.com/v1/playlists/${pl.id}/tracks?market=${market}&limit=80`);
      const items = list?.items || [];
      for (const tr of items) {
        const t = tr.track;
        if (t?.uri && t?.name) {
          tracks.push({
            uri: t.uri,
            name: t.name,
            artist: t.artists?.[0]?.name || "Unknown"
          });
        }
      }
      if (tracks.length >= 120) break;
    }

    const unique = [...new Map(tracks.map(t => [t.uri, t])).values()];
    unique.sort(() => Math.random() - 0.5);

    return res.status(200).json({ tracks: unique.slice(0, 35) });

  } catch (err) {
    console.error("get-songs error:", err);
    return res.status(500).json({ error: "Failed songs" });
  }
}
