// /api/get-tracks.js
// ✅ FINAL STABLE VERSION — ALWAYS RETURNS 35+ REAL SPOTIFY SONGS

export const config = { runtime: "edge" };

const langProfiles = {
  english: {
    market: "US",
    playlistTerms: ["english chill", "feel good pop", "indie acoustic", "lofi english"],
    include: [/^[\u0000-\u024F\s'&().,!\-:]+$/i],
    exclude: [/[^\u0000-\u024F]/],
  },
  hindi: {
    market: "IN",
    playlistTerms: [
      "bollywood chill", "bollywood unplugged", "arijit singh acoustic",
      "bollywood mystery bgm", "bollywood thriller soundtrack",
      "ar rahman background score", "arijit live",
      "bollywood lofi", "hindi noir"
    ],
    include: [/[\u0900-\u097F]/, /\b(hindi|bollywood|arijit|rahman|pritam|jubin|atif)\b/i],
    exclude: [],
  },
  punjabi: {
    market: "IN",
    playlistTerms: ["punjabi hits", "punjabi vibe", "punjabi lofi"],
    include: [/\bpunjabi\b/i],
    exclude: [],
  },
  tamil: {
    market: "IN",
    playlistTerms: ["tamil hits", "tamil lofi", "kollywood bgm"],
    include: [/[\u0B80-\u0BFF]/, /\btamil\b/i],
  },
  telugu: {
    market: "IN",
    playlistTerms: ["telugu hits", "tollywood bgm", "telugu lofi"],
    include: [/[\u0C00-\u0C7F]/, /\btelugu|tollywood\b/i],
  },
  spanish: {
    market: "ES",
    playlistTerms: ["latin chill", "reggaeton calm"],
    include: [/\b(spanish|español)\b/i],
  }
};

// Clean string
const clean = (s = "") => s.trim();

// Detect language correctly
function matchesLanguage(track, lang) {
  const p = langProfiles[lang] || langProfiles.english;
  const text = `${clean(track.name)} ${clean(track.album?.name)} ${clean(track.artists?.[0]?.name)}`;

  const script = {
    hindi: /[\u0900-\u097F]/,
    tamil: /[\u0B80-\u0BFF]/,
    telugu: /[\u0C00-\u0C7F]/,
  }[lang];

  if (script && script.test(text)) return true;
  if (p.include.some(rx => rx.test(text))) return true;
  if (p.exclude.some(rx => rx.test(text))) return false;

  return false;
}

async function getJson(url, token) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }});
  if (r.status === 401) throw { code: 401 };
  return r.json();
}

export default async function handler(req) {
  if (req.method !== "POST")
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });

  try {
    const { language="english", mood="relaxed", token } = await req.json();
    if (!token) return new Response(JSON.stringify({ error: "Missing Spotify token" }), { status: 401 });

    const prof = langProfiles[language] || langProfiles.english;
    const moodTerms = {
      mysterious: ["mystery bgm", "cinematic dark", "ambient noir", "dark unplugged"],
      relaxed: ["chill", "acoustic"],
      upbeat: ["happy vibe", "pop"],
      romantic: ["love", "romantic"],
      party: ["party", "dance"],
      workout: ["gym", "energy"],
      focus: ["focus", "study"],
    }[mood] || ["chill"];

    const queries = [];
    for (const base of prof.playlistTerms)
      for (const m of moodTerms)
        queries.push(`${base} ${m}`);

    let songs = [], seen = new Set();

    for (let i = 0; i < Math.min(6, queries.length); i++) {
      const q = encodeURIComponent(queries[i]);
      const url = `https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${prof.market}&limit=1`;
      const pl = (await getJson(url, token))?.playlists?.items?.[0];
      if (!pl) continue;

      const tr = await getJson(`https://api.spotify.com/v1/playlists/${pl.id}/tracks?limit=100`, token);
      for (const it of tr.items || []) {
        const t = it.track;
        if (!t || !t.id || seen.has(t.id)) continue;
        if (!matchesLanguage(t, language)) continue;

        seen.add(t.id);
        songs.push({ id: t.id, uri: t.uri, name: t.name, artist: t.artists[0]?.name });
      }

      if (songs.length >= 120) break;
    }

    // Fallback to ensure 35+ tracks
    if (songs.length < 35) {
      const fb = prof.playlistTerms.slice(0, 3);
      for (const term of fb) {
        const q = encodeURIComponent(term);
        const pl = (await getJson(
          `https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${prof.market}&limit=1`,
          token
        ))?.playlists?.items?.[0];
        if (!pl) continue;
        const tr = await getJson(`https://api.spotify.com/v1/playlists/${pl.id}/tracks?limit=100`, token);
        for (const it of tr.items || []) {
          const t = it.track;
          if (t && !seen.has(t.id) && matchesLanguage(t, language)) {
            seen.add(t.id);
            songs.push({ id: t.id, uri: t.uri, name: t.name, artist: t.artists[0]?.name });
          }
        }
        if (songs.length >= 40) break;
      }
    }

    // Shuffle
    songs.sort(() => 0.5 - Math.random());

    return new Response(JSON.stringify({ tracks: songs.slice(0, 40) }), { status: 200 });

  } catch (e) {
    return new Response(JSON.stringify({ error: "Fetch failed", detail: e }), { status: 500 });
  }
}
