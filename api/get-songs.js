// Strong language profile map
const langProfiles = {
  english: {
    market: "US",
    seeds: ["english pop", "indie pop", "pop classics", "acoustic english"],
    mustNotContain: /[\u0900-\u097F\u0A00-\u0A7F\u0B80-\u0BFF\u0C00-\u0C7F\u4E00-\u9FFF\uAC00-\uD7AF]/ // No Hindi, Punjabi, Tamil, Telugu, Chinese, Korean chars
  },
  hindi: {
    market: "IN",
    seeds: ["hindi mix", "bollywood hits", "arijit singh", "bollywood acoustic"],
    mustContain: /[\u0900-\u097F]/, // Hindi script
  },
  punjabi: {
    market: "IN",
    seeds: ["punjabi hits", "ap dhillon", "punjabi mix"],
    mustContain: /[\u0A00-\u0A7F]/ // Gurmukhi
  },
  tamil: {
    market: "IN",
    seeds: ["tamil hits", "kollywood", "anirudh lo-fi"],
    mustContain: /[\u0B80-\u0BFF]/
  },
  telugu: {
    market: "IN",
    seeds: ["telugu hits", "tollywood lo-fi"],
    mustContain: /[\u0C00-\u0C7F]/
  },
  kannada: {
    market: "IN",
    seeds: ["kannada hits"],
    mustContain: /[\u0C80-\u0CFF]/
  },
  malayalam: {
    market: "IN",
    seeds: ["malayalam hits"],
    mustContain: /[\u0D00-\u0D7F]/
  },
  bengali: {
    market: "IN",
    seeds: ["bengali hits"],
    mustContain: /[\u0980-\u09FF]/
  },
  marathi: {
    market: "IN",
    seeds: ["marathi hits"],
    mustContain: /[\u0900-\u097F]/
  },
  spanish: {
    market: "ES",
    seeds: ["latin pop", "reggaeton suave"]
  },
  korean: {
    market: "KR",
    seeds: ["k-pop", "korean indie"],
    mustContain: /[\uAC00-\uD7AF]/
  },
  japanese: {
    market: "JP",
    seeds: ["j-pop", "anime soundtrack"],
    mustContain: /[\u3040-\u30FF]/
  },
  chinese: {
    market: "TW",
    seeds: ["c-pop", "mandarin chill"],
    mustContain: /[\u4E00-\u9FFF]/
  },
  arabic: {
    market: "AE",
    seeds: ["arab pop", "arabic chill"],
    mustContain: /[\u0600-\u06FF]/
  },
};

// Mood mapping
const moodTerms = {
  chill: ["chill", "lofi", "acoustic"],
  happy: ["happy", "feel good", "pop"],
  sad: ["sad", "piano", "soft"],
  party: ["party", "dance", "club"],
  energetic: ["edm", "boost", "workout"]
};

async function sfetch(url, token) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return r.json();
}

// strict language validation function
function validateLanguage(track, profile) {
  const text = (track.name + " " + track.artists?.[0]?.name).toLowerCase();

  if (profile.mustContain && !profile.mustContain.test(text)) return false;
  if (profile.mustNotContain && profile.mustNotContain.test(text)) return false;

  return true;
}

export default async function handler(req, res) {
  try {
    const { token, language = "english", mood = "chill" } = req.body || {};
    if (!token) return res.status(401).json({ error: "No token" });

    const p = langProfiles[language] || langProfiles.english;
    const terms = moodTerms[mood] || ["chill"];
    const queries = [];

    for (let s of p.seeds) for (let m of terms) queries.push(`${s} ${m}`);

    let tracks = [];

    // fetch up to 4 playlists
    for (let i = 0; i < 4; i++) {
      const q = encodeURIComponent(queries[i]);
      const data = await sfetch(
        `https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${p.market}&limit=1`,
        token
      );

      const pl = data.playlists?.items?.[0];
      if (!pl) continue;

      const songs = await sfetch(
        `https://api.spotify.com/v1/playlists/${pl.id}/tracks?market=${p.market}&limit=80`,
        token
      );

      for (const it of songs.items || []) {
        const tr = it.track;
        if (!tr?.id) continue;
        if (!validateLanguage(tr, p)) continue;

        tracks.push({
          id: tr.id,
          uri: tr.uri,
          name: tr.name,
          artist: tr.artists?.[0]?.name,
          image: tr.album?.images?.[1]?.url,
          link: tr.external_urls?.spotify,
        });
      }

      if (tracks.length >= 120) break;
    }

    const unique = [...new Map(tracks.map(t => [t.id, t])).values()];
    unique.sort(() => Math.random() - 0.5);

    return res.json({ tracks: unique.slice(0, 40) });
  } catch (e) {
    console.error("SONG ERROR", e);
    res.status(500).json({ error: "Failed song fetch" });
  }
}
