// /api/recommendations.js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const { language = "english", mood = "relaxed", token } = req.body || {};
    if (!token) return res.status(401).json({ error: "Missing Spotify token" });

    const profiles = {
      english: {
        market: "US",
        seed_genres: ["pop", "indie-pop", "acoustic"],
        seed_artists: ["6eUKZXaKkcviH0Ku9w2n3V","6qqNVTkY8uBg9cP3Jd7DAH","1dfeR4HaWDbWqFHLkxsg1d"], 
      },
      hindi: {
        market: "IN",
        seed_genres: ["bollywood"],
        seed_artists: ["4YRxDV8wJFPHPTeXepOstw","5f4QpKfy7ptCHwTqspnSJI","2oSONSC9zQ4UonDKnLqksx"],
      },
      punjabi: {
        market: "IN",
        seed_genres: ["indian-pop"],
        seed_artists: ["2oBG3C7oRR4N1Ai9PZp9Kp","6DARBhWbfcS8Mivm9GZwhO","0N9Pn3WcL2v5S8t3RqiG6S"],
      },
      tamil: {
        market: "IN",
        seed_genres: ["indian-pop"],
        seed_artists: ["2oSONSC9zQ4UonDKnLqksx","0oOet2f43PA68X5RxKobEy"],
      },
      telugu: {
        market: "IN",
        seed_genres: ["indian-pop"],
        seed_artists: ["5pKCCKE2ajJHZ9KAiaK11H","1mYsTxnqsietFxj1OgoGbG"],
      },
      spanish: {
        market: "ES",
        seed_genres: ["latin","reggaeton","spanish-pop"],
        seed_artists: ["7ltDVBr6mKbRvohxheJ9h1","1vyhD5VmyZ7KMfW5gqLgo5","1mcTU81TzQhprhouKaTkpq"],
      },
      korean: {
        market: "KR",
        seed_genres: ["k-pop"],
        seed_artists: ["3Nrfpe0tUJi4K4DXYWgMUX","6HvZYsbFfjnjFrWF950C9d","2AfmfGFbe0A0WsTYm0SDTx"],
      },
      japanese: {
        market: "JP",
        seed_genres: ["j-pop"],
        seed_artists: ["3JsHnjpbhX4SnySpvpa9DK","3M1F1G7WZsWl7Z5v2iS8Gk"],
      },
      french: {
        market: "FR",
        seed_genres: ["french-pop"],
        seed_artists: ["1dVygo6tRFXC8CSWURQJq2","1Mxqyy3pSjf8kZZL4QVxS0"],
      },
      german: {
        market: "DE",
        seed_genres: ["german-pop"],
        seed_artists: ["3E7dfMvvCLUddWissuqMwr","3yQF0hG4p7RTrVfU7mUKfR"],
      },
      italian: {
        market: "IT",
        seed_genres: ["italian-pop"],
        seed_artists: ["7xssNLuZQiwGmSjfY9ES2f","3GBPw9NK25X1Wt2OUvOwY3"],
      },
      chinese: {
        market: "HK",
        seed_genres: ["cantopop","mandopop"],
        seed_artists: ["5DRnlm8gxWKjjHADw8RqPA","1O8CSXsPwEqxcoBE360PPO"],
      },
    };

    const tuning = {
      relaxed: { target_energy: 0.35, target_valence: 0.55 },
      cozy: { target_energy: 0.30, target_acousticness: 0.6 },
      upbeat: { target_energy: 0.75, target_valence: 0.80 },
      party: { target_energy: 0.85, target_danceability: 0.85 },
      sleep: { target_energy: 0.15, target_acousticness: 0.8 },
      intense: { target_energy: 0.95, target_valence: 0.30 },
      mysterious: { target_energy: 0.35, target_valence: 0.30 },
    };

    const prof = profiles[language] || profiles.english;
    const tune = tuning[mood] || tuning.relaxed;

    const params = new URLSearchParams({
      market: prof.market,
      limit: "50",
      seed_genres: prof.seed_genres.join(","),
      seed_artists: prof.seed_artists.join(","),
    });

    Object.entries(tune).forEach(([key, val]) => params.append(key, val));

    const url = `https://api.spotify.com/v1/recommendations?${params}`;
    const request = await fetch(url, { headers: { Authorization: `Bearer ${token}` }});
    const data = await request.json();

    const tracks = (data.tracks || []).map(t => ({
      id: t.id,
      uri: t.uri,
      name: t.name,
      artist: t.artists?.[0]?.name,
    }));

    return res.json({ tracks });
  } catch (err) {
    console.error("recommendations error", err);
    return res.status(500).json({ error: "Recommendation error" });
  }
}
