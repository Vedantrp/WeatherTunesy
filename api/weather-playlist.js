// /api/weather-playlist.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Only POST requests are supported" });

  try {
    const { location, language = "english" } = req.body || {};
    if (!location) return res.status(400).json({ error: "Missing location parameter" });

    const weatherKey = process.env.WEATHER_API_KEY;
    if (!weatherKey) throw new Error("Missing WEATHER_API_KEY in environment");

    // 🌦️ Fetch weather
    const url = `https://api.weatherapi.com/v1/current.json?key=${weatherKey}&q=${encodeURIComponent(
      location
    )}&aqi=no`;
    const weatherRes = await fetch(url);
    const weatherData = await weatherRes.json();

    if (weatherData.error)
      return res.status(400).json({ error: weatherData.error.message });

    const condition = weatherData.current.condition.text.toLowerCase();
    let mood = "balanced";
    if (condition.includes("rain")) mood = "cozy";
    else if (condition.includes("sun")) mood = "upbeat";
    else if (condition.includes("cloud")) mood = "relaxed";
    else if (condition.includes("storm")) mood = "intense";
    else if (condition.includes("mist") || condition.includes("fog"))
      mood = "mysterious";

    // 🧠 Generate fallback AI playlist (NO Gemini call)
    const fallbackPlaylist = [
      { title: "Echoes of the Sky", artist: "Aurora Dreams" },
      { title: "Night Fog", artist: "Cinematic Flow" },
      { title: "Moonlit Vibes", artist: "Calm Arcade" },
      { title: "Mystic Rain", artist: "Dreamcatcher" },
      { title: "Dawn Horizon", artist: "Lofi Fields" },
    ];

    // ✅ Respond safely
    res.status(200).json({
      mood,
      language,
      playlist: fallbackPlaylist,
      weather: {
        location: weatherData.location.name,
        country: weatherData.location.country,
        temperature: weatherData.current.temp_c,
        feelsLike: weatherData.current.feelslike_c,
        humidity: weatherData.current.humidity,
        windSpeed: weatherData.current.wind_kph,
        condition: weatherData.current.condition.text,
        icon: weatherData.current.condition.icon,
        localtime: weatherData.location.localtime,
      },
    });
  } catch (err) {
    console.error("🔥 Error in /api/weather-playlist:", err);
    res.status(500).json({ error: err.message });
  }
}
