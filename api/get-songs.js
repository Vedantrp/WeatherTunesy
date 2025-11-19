import fetch from "node-fetch";

// Language → Market + Seeds
const langProfiles = {
  english: { market: "US", seeds: ["english chill", "indie acoustic", "sad pop", "lofi english"] },
  hindi: { market: "IN", seeds: ["bollywood chill", "arijit singh", "hindi acoustic", "lofi bollywood"] },
  punjabi: { market: "IN", seeds: ["punjabi hits", "ap dhillon", "punjabi lo-fi"] },
  tamil: { market: "IN", seeds: ["tamil hits", "anirudh", "tamil lo-fi"] },
  telugu: { market: "IN", seeds: ["telugu hits", "sid sriram", "tollywood chill"] },
  spanish: { market: "ES", seeds: ["latin chill", "reggaeton suave", "spanish pop"] },
};

// Time-based moods
function getTimeMood(hour) {
  if (hour >= 4 && hour < 8) return ["soft", "morning", "acoustic"];
  if (hour >= 8 && hour < 12) return ["focus", "study", "instrumental"];
  if (hour >= 12 && hour < 18) return ["energetic", "summer", "pop"];
  if (hour >= 18 && hour < 23) return ["chill", "night", "indie"];
  return ["moody", "dark", "deep"];
}

async function sfetch(url, token) {
  // 💡 Ensure the Authorization header template literal is correct
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Spotify API Error: ${res.status} - ${url}`); // Improved error message
  return res.json();
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

    const { token, language = "english", hour = 14 } = req.body;
    if (!token) return res.status(401).json({ error: "Missing token" });

    const prof = langProfiles[language] || langProfiles.english;
    const market = prof.market;
    const timeTags = getTimeMood(hour);

    // Build queries: language + time mood
    const queries = [];
    for (const seed of prof.seeds) {
      // 🛑 FIX 1: Template literal needs backticks (`)
      for (const tag of timeTags) queries.push(`${seed} ${tag}`);
    }

    const tracks = [];
    for (let i = 0; i < Math.min(6, queries.length); i++) {
      const q = encodeURIComponent(queries[i]);
      
      // 🛑 FIX 2: Correct Spotify Search API URL structure and use backticks (`)
      // Base URL for Spotify is https://api.spotify.com/v1/
      const search = await sfetch(
        `https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${market}&limit=1`, 
        token
      );

      const playlist = search?.playlists?.items?.[0];
      if (!playlist) continue;

      // 🛑 FIX 3: Correct Spotify Playlist Tracks API URL structure and use backticks (`)
      const data = await sfetch(
        `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?limit=80&market=${market}`,
        token
      );

      for (const item of data.items || []) {
        const track = item.track;
        if (!track || !track.id || !track.uri) continue;

        tracks.push({
          id: track.id,
          uri: track.uri,
          name: track.name,
          artist: track.artists?.[0]?.name,
          image: track.album?.images?.[1]?.url || track.album?.images?.[0]?.url,
        });
      }
    }

    // Dedupe + shuffle + return
    const unique = [...new Map(tracks.map(t => [t.id, t])).values()];
    const shuffled = unique.sort(() => Math.random() - 0.5);

    return res.json({ tracks: shuffled.slice(0, 35) });
  } catch (err) {
    console.error("GET-SONGS ERROR:", err);
    // The 500 error is handled here. Re-throwing the error in sfetch ensures it lands here.
    return res.status(500).json({ error: "Song fetch failed" });
  }
}
