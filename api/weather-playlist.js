// /api/weather-playlist.js
import fetch from "node-fetch";
import { getAiPlaylist } from "./ai-playlist.js";

export default async function handler(req, res) {
  try {
    // --- CORS ---
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") return res.status(200).end();

    if (req.method !== "POST") {
      console.log("❌ Wrong method:", req.method);
      return res.status(405).json({ error: "Only POST requests are supported" });
    }

    console.log("✅ Incoming weather-playlist request...");
    const { location, language } = req.body || {};
    console.log("➡️ Body:", req.body);

    if (!location) {
      console.log("❌ Missing location");
      return res.status(400).json({ error: "Missing location parameter" });
    }

    // --- WEATHER ---
    const weatherKey = process.env.WEATHER_API_KEY;
    if (!weatherKey) throw new Error("Missing WEATHER_API_KEY");

    const url = `https://api.weatherapi.com/v1/current.json?key=${weatherKey}&q=${encodeURIComponent(
      location
    )}&aqi=no`;

    console.log("🌤️ Fetching weather:", url);
    const weatherRes = await fetch(url);
    const weatherData = await weatherRes.json();
    console.log("✅ Weather response received");

    if (weatherData.error) {
      console.log("❌ Weather API error:", weatherData.error);
      throw new Error(weatherData.error.message || "Weather API error");
    }

    const condition = weatherData.current.condition.text.toLowerCase();
    let mood = "balanced";
    if (condition.includes("rain")) mood = "cozy";
    else if (condition.includes("sun")) mood = "upbeat";
    else if (condition.includes("cloud")) mood = "relaxed";
    else if (condition.includes("storm")) mood = "intense";
    else if (condition.includes("mist") || condition.includes("fog"))
      mood = "mysterious";

    console.log(`🎭 Mapped condition "${condition}" → mood "${mood}"`);

    // --- AI PLAYLIST ---
    console.log("🤖 Fetching AI playlist...");
    const playlist = await getAiPlaylist(mood, language);
    console.log("✅ AI playlist fetched:", playlist?.length, "songs");

    const responseData = {
      mood,
      language,
      playlist,
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
    };

    console.log("✅ Sending success response:", JSON.stringify(responseData, null, 2));
    return res.status(200).json(responseData);
  } catch (err) {
    console.error("🔥 Weather Playlist Error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
}
