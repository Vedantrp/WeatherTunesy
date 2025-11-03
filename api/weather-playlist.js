// /api/weather-playlist.js
import fetch from "node-fetch";

function mapWeatherToMood(condition) {
  const c = (condition || "").toLowerCase();
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
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Only POST" });
    const { location, language } = req.body || {};
    if (!location) return res.status(400).json({ error: "Missing location" });

    const WEATHER_KEY = process.env.WEATHER_API_KEY;
    if (!WEATHER_KEY) return res.status(500).json({ error: "Missing WEATHER_API_KEY" });

    const weatherUrl = `http://api.weatherapi.com/v1/current.json?key=${WEATHER_KEY}&q=${encodeURIComponent(location)}&aqi=no`;
    const r = await fetch(weatherUrl);
    const data = await r.json();

    if (!data || data.error) {
      console.error("WeatherAPI error:", data);
      return res.status(500).json({ error: "WeatherAPI failed", details: data });
    }

    const weather = {
      condition: data.current.condition.text,
      icon: data.current.condition.icon,
      temperature: data.current.temp_c,
      feelsLike: data.current.feelslike_c,
      humidity: data.current.humidity,
      windSpeed: data.current.wind_kph,
      location: data.location.name,
      country: data.location.country,
      localtime: data.location.localtime,
    };

    const mood = mapWeatherToMood(weather.condition);
    return res.status(200).json({ weather, mood, language });
  } catch (err) {
    console.error("weather-playlist error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
}
