// /api/recommendations.js
// Smarter language+mood picks using Spotify Recommendations API

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const { language = "english", mood = "relaxed", token } = req.body || {};
    if (!token) return res.status(401).json({ error: "Missing Spotify token" });

    // Language profiles: market + seeds (artists/genres) to keep language right
    const profiles = {
      english: {
        market: "US",
        seed_genres: ["pop", "indie-pop", "acoustic"],
        seed_artists: ["6eUKZXaKkcviH0Ku9w2n3V","6qqNVTkY8uBg9cP3Jd7DAH","1dfeR4HaWDbWqFHLkxsg1d"], // Ed Sheeran, Billie Eilish, Queen
      },
      hindi: {
        market: "IN",
        seed_genres: ["bollywood"],
        seed_artists: ["4YRxDV8wJFPHPTeXepOstw","5f4QpKfy7ptCHwTqspnSJI","2oSONSC9zQ4UonDKnLqksx"], // Arijit, Pritam, A.R. Rahman
      },
      punjabi: {
        market: "IN",
        seed_genres: ["indian-pop"],
        seed_artists: ["2oBG3C7oRR4N1Ai9PZp9Kp","6DARBhWbfcS8Mivm9GZwhO","0N9Pn3WcL2v5S8t3RqiG6S"], // AP Dhillon, Sidhu Moose Wala, Diljit Dosanjh
      },
      tamil: {
        market: "IN",
        seed_genres: ["indian-pop"],
        seed_artists: ["2oSONSC9zQ4UonDKnLqksx","0oOet2f43PA68X5RxKobEy"], // A.R. Rahman, Anirudh
      },
      telugu: {
        market: "IN",
        seed_genres: ["indian-pop"],
        seed_artists: ["5pKCCKE2ajJHZ9KAiaK11H","1mYsTxnqsietFxj1OgoGbG"], // (fallback big IN artists if Telugu seeds hard)
      },
      spanish: {
        market: "ES",
        seed_genres: ["latin","reggaeton","spanish-pop"],
        seed_artists: ["7ltDVBr6mKbRvohxheJ9h1","1vyhD5VmyZ7KMfW5gqLgo5","1mcTU81TzQhprhouKaTkpq"], // ROSALÍA, J Balvin, Bad Bunny
      },
      korean: {
        market: "KR",
        seed_genres: ["k-pop"],
        seed_artists: ["3Nrfpe0tUJi4K4DXYWgMUX","6HvZYsbFfjnjFrWF950C9d","2AfmfGFbe0A0WsTYm0SDTx"], // BTS, NewJeans, BLACKPINK
      },
      japanese: {
        market: "JP",
        seed_genres: ["j-pop"],
        seed_artists: ["3JsHnjpbhX4SnySpvpa9DK","3M1F1G7WZsWl7Z5v2iS8Gk"], // Official髭男dism, YOASOBI
      },
      french: {
        market: "FR",
        seed_genres: ["french-pop"],
        seed_artists: ["1dVygo6tRFXC8CSWURQJq2","1Mxqyy3pSjf8kZZL4QVxS0"], // Angèle, Stromae
      },
      german: {
        market: "DE",
        seed_genres: ["german-pop"],
        seed_artists: ["3E7dfMvvCLUddWissuqMwr","3yQF0hG4p7RTrVfU7mUKfR"], // Mark Forster, CRO
      },
      italian: {
        market: "IT",
        seed_genres: ["italian-pop"],
        seed_artists: ["7xssNLuZQiwGmSjfY9ES2f","3GBPw9NK25X1Wt2OUvOwY3"], // Måneskin, Eros Ramazzotti
      },
      chinese: {
        market: "HK",
        seed_genres: ["cantopop","mandopop"],
        seed_artists: ["5DRnlm8gxWKjjHADw8RqPA","1O8CSXsPwEqxcoBE360PPO"], // Eason Chan, Jay Chou
      },
    };

    // Mood → audio feature targets
    const moodTuning = {
      relaxed:      { target_energy: 0.35, target_valence: 0.55, target_danceability: 0.45, target_acousticness: 0.4 },
      cozy:         { target_energy: 0.30, target_valence: 0.50, target_danceability: 0.40, target_acousticness: 0.6 },
      upbeat:       { target_energy: 0.75, target_valence: 0.80, target_danceability: 0.70 },
      romantic:     { target_energy: 0.40, target_valence: 0.65, target_acousticness: 0.5 },
      party:        { target_energy: 0.85, target_valence: 0.75, target_danceability: 0.85 },
      workout:      { target_energy: 0.90, target_valence: 0.65, target_danceability: 0.8 },
      focus:        { target_energy: 0.25, target_valence: 0.35, target_instrumentalness: 0.7 },
      sleep:        { target_energy: 0.15, target_valence: 0.30, target_acousticness: 0.8 },
      energetic:    { target_energy: 0.95, target_valence: 0.65, target_danceability: 0.8 },
      intense:      { target_energy: 0.95, target_valence: 0.35, target_danceability: 0.7 },
      tropical:     { target_energy: 0.70, target_valence: 0.80, target_danceability: 0.8 },
      balanced:     { target_energy: 0.55, target_valence: 0.60, target_danceability: 0.55 },
      winter:       { target_energy: 0.30, target_valence: 0.45, target_acousticness: 0.6 },
      mysterious:   { target_energy: 0.35, target_valence: 0.30, target_danceability: 0.45 },
    };

    const prof = profiles[language] || profiles.english;
    const tune = moodTuning[mood] || moodTuning.relaxed;

    // Build recommendation query
    const params = new URLSearchParams({
      market: prof.market,
      limit: "50",
      seed_genres: (prof.seed_genres || []).slice(0, 2).join(","),
      seed_artists: (prof.seed_artists || []).slice(0, 3).join(","),
    });

    // Attach tuning targets
    Object.entries(tune).forEach(([k, v]) => params.append(k, String(v)));

    const recUrl = `https://api.spotify.com/v1/recommendations?${params.toString()}`;
    const recRes = await fetch(recUrl, { headers: { Authorization: `Bearer ${token}` } });
    const recData = await recRes.json();

    if (!recRes.ok) {
      return res.status(recRes.status).json(recData);
    }

    // Normalize tracks
    const tracks = (recData.tracks || []).map(t => ({
      id: t.id,
      uri: t.uri,
      name: t.name,
      artist: t.artists?.[0]?.name || "",
    }));

    // Deduplicate & return
    const seen = new Set();
    const unique = [];
    for (const t of tracks) {
      if (!t.id || seen.has(t.id)) continue;
      seen.add(t.id);
      unique.push(t);
    }

    return res.json({ tracks: unique });
  } catch (e) {
    console.error("recommendations error:", e);
    return res.status(500).json({ error: "Recommendations failed" });
  }
}
