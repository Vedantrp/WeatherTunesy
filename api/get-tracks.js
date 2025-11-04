// /api/get-tracks.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const { language, mood, token } = req.body;

    if (!token) return res.status(401).json({ error: "Missing Spotify token" });

    // ✅ Language keyword map
    const langMap = {
      english: "english pop hits",
      hindi: "bollywood hindi",
      spanish: "latin pop",
      korean: "kpop korean",
      japanese: "jpop japanese",
      tamil: "tamil hits",
      telugu: "telugu hits",
      punjabi: "punjabi hits",
      french: "french hits",
      german: "german pop",
      italian: "italian pop",
      chinese: "mandarin chinese pop"
    };

    const finalLang = langMap[language] || language;

    // ✅ Mood keywords
    const moodMap = {
      relaxed: "chill",
      cozy: "lofi calm",
      upbeat: "happy upbeat",
      romantic: "romantic love",
      party: "party dance",
      workout: "gym fitness",
      focus: "focus study",
      sleep: "sleep calm"
    };

    const finalMood = moodMap[mood] || mood;

    // ✅ Build Spotify search
    const q = encodeURIComponent(`${finalLang} ${finalMood} playlist`);
    const searchUrl = `https://api.spotify.com/v1/search?q=${q}&type=playlist&limit=3`;

    const playlistSearch = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const playlistData = await playlistSearch.json();

    if (!playlistData.playlists?.items?.length) {
      return res.status(200).json({ tracks: [] });
    }

    let allTracks = [];

    // ✅ Fetch songs from first 3 playlist results
    for (const playlist of playlistData.playlists.items.slice(0, 3)) {
      const tracksUrl = `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`;
      const tracksRes = await fetch(tracksUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const tracksData = await tracksRes.json();

      tracksData.items?.forEach((t) => {
        if (t.track?.name && t.track?.artists?.[0]?.name) {
          allTracks.push({
            title: t.track.name,
            artist: t.track.artists[0].name,
            uri: t.track.uri
          });
        }
      });
    }

    return res.status(200).json({
      tracks: allTracks.slice(0, 60) // return 60 max, FE will filter to 35
    });

  } catch (err) {
    console.error("Track API error:", err);
    res.status(500).json({ error: "Track fetch failed" });
  }
}
