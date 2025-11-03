// /api/weather-playlist.js
import fetch from "node-fetch";
import { getAiPlaylist } from "./ai-playlist.js";

function mapWeatherToMood(condition) {
  const c = condition.toLowerCase();
  if (c.includes("sun") || c.includes("clear")) return "upbeat";
  if (c.includes("rain") || c.includes("drizzle")) return "cozy";
  if (c.includes("cloud")) return "relaxed";
  if (c.includes("snow")) return "calm";
  if (c.includes("storm") || c.includes("thunder")) return "intense";
  if (c.includes("fog") || c.includes("mist")) return "mysterious";
  if (c.includes("hot")) return "energetic";
  if (c.includes("cold")) return "warm";
  return "balanced";
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST requests supported" });
    }

    // Ensure body is parsed
    const { location, language = "english" } = req.body || {};
    if (!location) {
      return res.status(400).json({ error: "Missing location parameter" });
    }

    // Validate API key
    const weatherApiKey =
      process.env.WEATHER_API_KEY || "b15d294bfca84397a5682344252410";

    const weatherUrl = `https://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${encodeURIComponent(
      location
    )}&aqi=no`;

    const weatherResponse = await fetch(weatherUrl);
    const weatherData = await weatherResponse.json();

    if (weatherData.error) {
      throw new Error(weatherData.error.message || "Weather API failed");
    }

    const weather = {
      condition: weatherData.current.condition.text,
      icon: weatherData.current.condition.icon,
      temperature: weatherData.current.temp_c,
      feelsLike: weatherData.current.feelslike_c,
      humidity: weatherData.current.humidity,
      windSpeed: weatherData.current.wind_kph,
      location: weatherData.location.name,
      country: weatherData.location.country,
      localtime: weatherData.location.localtime,
    };

    const mood = mapWeatherToMood(weather.condition);

    console.log(`Mapped ${weather.condition} → mood ${mood}`);

    // Call Gemini AI playlist generator
    let playlist = [];
    try {
      playlist = await getAiPlaylist(mood, language);
    } catch (err) {
      console.error("AI call failed:", err);
    }

    return res.status(200).json({
      weather,
      mood,
      playlist: playlist || [],
    });
  } catch (err) {
    console.error("Weather Playlist Error:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}
