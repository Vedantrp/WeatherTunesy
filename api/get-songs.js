import fetch from "node-fetch";

// Language profiles + seeds
const langProfiles = {
  english: { market: "US", seeds: ["english chill pop", "indie pop", "feel good pop"] },
  hindi:   { market: "IN", seeds: ["bollywood chill", "arijit singh", "hindi acoustic"] },
  punjabi: { market: "IN", seeds: ["punjabi hits", "punjabi chill", "ap dhillon"] },
  tamil:   { market: "IN", seeds: ["tamil hits", "tamil lo-fi", "anirudh"] },
  telugu:  { market: "IN", seeds: ["telugu hits", "tollywood lo-fi", "sid sriram"] },
  kannada: { market: "IN", seeds: ["kannada hits","kannada lo-fi","sandalwood songs"] },
  malayalam: { market: "IN", seeds: ["malayalam hits","malayalam chill","mollywood songs"] },
  bengali: { market: "IN", seeds: ["bengali hits","bengali indie","bengali lo-fi"] },
  marathi: { market: "IN", seeds: ["marathi hits","marathi pop","marathi lo-fi"] },
  spanish: { market: "ES", seeds: ["latin chill","reggaeton suave","latin pop"] },
  french:  { market: "FR", seeds: ["french pop","chanson française","francophone"] },
  german:  { market: "DE", seeds: ["german pop","german rap","deutsche chill"] },
  italian: { market: "IT", seeds: ["italian pop","canzoni italiane","italian chill"] },
  korean:  { market: "KR", seeds: ["k-pop chill","kpop dance","k-indie"] },
  japanese:{ market: "JP", seeds: ["j-pop chill","anime songs","city pop"] },
  chinese: { market: "HK", seeds: ["c-pop","mandarin pop","cantopop"] },
  arabic:  { market: "SA", seeds: ["arabic chill","arab pop","arabic hits"] }
};

const moodMap = (cond="") => {
  const c = cond.toLowerCase();
  if (c.includes("rain") || c.includes("drizzle")) return ["lofi","acoustic","rainy day"];
  if (c.includes("snow")) return ["soft","piano","winter"];
  if (c.includes("thunder") || c.includes("storm")) return ["dark","bass","intense"];
  if (c.includes("mist") || c.includes("fog") || c.includes("haze")) return ["ambient","synthwave","mellow"];
  if (c.includes("cloud")) return ["chill","indie","relaxed"];
  if (c.includes("sunny") || c.includes("clear")) return ["feel good","summer","upbeat"];
  return ["chill"];
};

// strict English filter: only Latin characters to avoid mixing
const isStrictEnglish = (name) => /^[\u0000-\u024F\s'&().,!\-:]+$/i.test(name);

async function sfetch(url, token) {
  const r = await fetch(url, { headers:{ Authorization:`Bearer ${token}` } });
  if (r.status === 401) throw new Error("UNAUTHORIZED");
  return r.json();
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { token, language="english", mood="Clear" } = req.body || {};
    if (!token) return res.status(401).json({ error: "No Spotify token. Please login first." });

    const prof = langProfiles[language] || langProfiles.english;
    const terms = moodMap(mood);
    const market = prof.market || "US";

    // Build playlist search queries
    const queries = [];
    for (const seed of prof.seeds) {
      for (const m of terms) queries.push(`${seed} ${m}`);
    }

    // Fetch a few playlists
    const playlists = [];
    for (let i=0;i<Math.min(5, queries.length);i++){
      const q = encodeURIComponent(queries[i]);
      const data = await sfetch(`https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${market}&limit=1`, token);
      const item = data?.playlists?.items?.[0];
      if (item) playlists.push(item);
    }

    // fallback to language-only
    if (!playlists.length) {
      const q = encodeURIComponent(prof.seeds[0]);
      const data = await sfetch(`https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${market}&limit=1`, token);
      const item = data?.playlists?.items?.[0];
      if (item) playlists.push(item);
    }

    // aggregate tracks
    let tracks = [];
    for (const pl of playlists) {
      const t = await sfetch(`https://api.spotify.com/v1/playlists/${pl.id}/tracks?market=${market}&limit=100`, token);
      const arr = (t.items || [])
        .map(x => x?.track)
        .filter(Boolean)
        .map(tr => ({
          id: tr.id,
          uri: tr.uri,
          name: tr.name,
          artist: tr.artists?.[0]?.name || "Unknown",
          image: tr.album?.images?.[1]?.url || tr.album?.images?.[0]?.url || "",
          url: tr.external_urls?.spotify
        }));
      tracks = tracks.concat(arr);
      if (tracks.length >= 200) break;
    }

    // Dedupe, strict language filter for English
    const seen = new Set();
    const unique = [];
    for (const t of tracks) {
      const full = `${t.name} ${t.artist}`;
      if (language === "english" && !isStrictEnglish(full)) continue;
      if (t.id && !seen.has(t.id)) {
        seen.add(t.id);
        unique.push(t);
      }
    }

    // shuffle
    for (let i = unique.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unique[i], unique[j]] = [unique[j], unique[i]];
    }

    return res.status(200).json({ tracks: unique.slice(0, 36) }); // ~35
  } catch (e) {
    if (e.message === "UNAUTHORIZED") {
      return res.status(401).json({ error: "Spotify token expired" });
    }
    console.error("GET-SONGS ERROR:", e);
    return res.status(500).json({ error: "Song fetch failed" });
  }
}
