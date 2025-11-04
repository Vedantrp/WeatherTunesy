// /api/recommendations.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const { language = "english", mood = "relaxed", token } = req.body;

    if (!token) return res.status(401).json({ error: "Missing Spotify token" });

    const profiles = {
      english: {
        market: "US",
        seed_genres: ["pop", "indie-pop", "acoustic"],
        seed_artists: ["6eUKZXaKkcviH0Ku9w2n3V","6qqNVTkY8uBg9cP3Jd7DAH","7dGJo4pcD2V6oG8kP0tJRR"], 
      },
      hindi: {
        market: "IN",
        seed_genres: ["bollywood", "indian-pop"],
        seed_artists: ["4YRxDV8wJFPHPTeXepOstw","5f4QpKfy7ptCHwTqspnSJI","2oSONSC9zQ4UonDKnLqksx"],
      },
      punjabi: {
        market: "IN",
        seed_genres: ["indian-pop"],
        seed_artists: ["6DARBhWbfcS8Mivm9GZwhO","7vk5e3vY1uw9plTHJAMwjN","2oBG3C7oRR4N1Ai9PZp9Kp"],
      },
      tamil: {
        market: "IN",
        seed_genres: ["indian-pop"],
        seed_artists: ["0oOet2f43PA68X5RxKobEy","2oSONSC9zQ4UonDKnLqksx"],
      },
      telugu: {
        market: "IN",
        seed_genres: ["indian-pop"],
        seed_artists: ["1mYsTxnqsietFxj1OgoGbG","4YRxDV8wJFPHPTeXepOstw"],
      },
      spanish: {
        market: "ES",
        seed_genres: ["latin","reggaeton"],
        seed_artists: ["7ltDVBr6mKbRvohxheJ9h1","1vyhD5VmyZ7KMfW5gqLgo5"],
      },
      korean: {
        market: "KR",
        seed_genres: ["k-pop"],
        seed_artists: ["3Nrfpe0tUJi4K4DXYWgMUX","6HvZYsbFfjnjFrWF950C9d"],
      },
      japanese: {
        market: "JP",
        seed_genres: ["j-pop"],
        seed_artists: ["3JsHnjpbhX4SnySpvpa9DK","7gnkMYXFNT8NkUYGrp9ZYy"],
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
      }
    };

    const moodTune = {
      relaxed: { energy: 0.4, valence: 0.6 },
      cozy: { energy: 0.3, acousticness: 0.7 },
      upbeat: { energy: 0.8, valence: 0.8 },
      party: { energy: 0.9, danceability: 0.9 },
      sleep: { energy: 0.2, acousticness: 0.9 },
      focus: { energy: 0.3, instrumentalness: 0.8 },
      workout: { energy: 0.95, danceability: 0.8 },
      intense: { energy: 0.95, valence: 0.3 },
      mysterious: { energy: 0.35, valence: 0.25 },
      romantic: { energy: 0.4, valence: 0.8 },
    };

    const prof = profiles[language] || profiles.english;
    const tune = moodTune[mood] || moodTune.relaxed;

    const params = new URLSearchParams({
      market: prof.market,
      limit: "100",
      seed_genres: prof.seed_genres.join(","),
      seed_artists: prof.seed_artists.join(","),
      target_energy: tune.energy,
      target_valence: tune.valence,
    });

    if (tune.acousticness) params.set("target_acousticness", tune.acousticness);
    if (tune.instrumentalness) params.set("target_instrumentalness", tune.instrumentalness);
    if (tune.danceability) params.set("target_danceability", tune.danceability);

    const r = await fetch(`https://api.spotify.com/v1/recommendations?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const json = await r.json();

    const tracks = (json.tracks || [])
      .map(t => ({
        id: t.id,
        uri: t.uri,
        name: t.name,
        artist: t.artists[0].name,
      }))
      .slice(0, 35); // return 35 ALWAYS

    return res.json({ tracks });
  } catch (err) {
    console.error("Recommendation API error →", err);
    res.status(500).json({ error: "recommendation failed" });
  }
}
