export default async function handler(req, res) {
  try {
    if (req.method !== "POST")
      return res.status(400).json({ error: "POST only" });

    const { token, language, mood } = req.body;
    if (!token) return res.status(401).json({ error: "No Spotify token" });

    // ------------------------------------------
    // 1. LANGUAGE SEEDS (Very Strict)
    // ------------------------------------------
    const SEEDS = {
      english: [
        "english indie pop",
        "uk pop hits",
        "us chill pop",
        "english acoustic",
        "english lofi"
      ],
      hindi: [
        "bollywood acoustic",
        "hindi lofi",
        "arijit singh",
        "hindi romantic",
        "hindustani pop"
      ],
      tamil: [
        "tamil lofi",
        "tamil hits",
        "anirudh ravichander",
        "tamil acoustic"
      ],
      telugu: [
        "telugu lofi",
        "tollywood chill",
        "sid sriram",
        "telugu acoustic"
      ],
      punjabi: [
        "punjabi chill",
        "punjabi lofi",
        "ap dhillon",
        "punjabi pop"
      ],
      spanish: [
        "latin chill",
        "spanish pop",
        "reggaeton suave"
      ]
    };

    const seeds = SEEDS[language] || SEEDS.english;

    // ------------------------------------------
    // 2. Helpers
    // ------------------------------------------
    const fetchSpotify = async (url) => {
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await r.json();
      return d;
    };

    // Offline language detector
    const detectLanguage = (txt) => {
      if (/[\u0900-\u097F]/.test(txt)) return "hindi";
      if (/[\u0B80-\u0BFF]/.test(txt)) return "tamil";
      if (/[\u0C00-\u0C7F]/.test(txt)) return "telugu";
      if (/[\u0A00-\u0A7F]/.test(txt)) return "punjabi";
      return "english";
    };

    // ------------------------------------------
    // 3. Search playlists using seeds
    // ------------------------------------------
    let playlistIDs = [];

    for (const q of seeds) {
      const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(
        q
      )}&type=playlist&limit=3`;

      const data = await fetchSpotify(url);
      const found = data?.playlists?.items || [];

      found.forEach((p) => playlistIDs.push(p.id));
    }

    playlistIDs = [...new Set(playlistIDs)];

    // ------------------------------------------
    // 4. Collect tracks
    // ------------------------------------------
    let tracks = [];
    for (const id of playlistIDs) {
      const data = await fetchSpotify(
        `https://api.spotify.com/v1/playlists/${id}/tracks?limit=50`
      );

      const list = data.items
        .map((i) => i.track)
        .filter(Boolean)
        .map((t) => ({
          id: t.id,
          name: t.name,
          artist: t.artists?.[0]?.name || "",
          url: t.external_urls?.spotify,
          image: t.album?.images?.[0]?.url || ""
        }));

      tracks.push(...list);
    }

    // ------------------------------------------
    // 5. STRONG LANGUAGE FILTER
    // ------------------------------------------
    tracks = tracks.filter((t) => {
      const langName = detectLanguage(t.name);
      const langArtist = detectLanguage(t.artist);

      if (language === "english") {
        return langName === "english" && langArtist === "english";
      }

      return langName === language || langArtist === language;
    });

    // Remove duplicates
    const seen = new Set();
    tracks = tracks.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });

    // Shuffle
    tracks.sort(() => Math.random() - 0.5);

    res.json({ tracks: tracks.slice(0, 40) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Song fetch failed" });
  }
}
