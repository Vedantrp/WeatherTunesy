import { getAiPlaylist } from "./ai-playlist.js";

function mapWeatherToMood(condition) {
  const cond = condition.toLowerCase();
  if (cond.includes("sun") || cond.includes("clear")) return "upbeat";
  if (cond.includes("rain") || cond.includes("drizzle")) return "cozy";
  if (cond.includes("cloud")) return "relaxed";
  if (cond.includes("snow")) return "calm";
  if (cond.includes("storm") || cond.includes("thunder")) return "intense";
  if (cond.includes("fog") || cond.includes("mist")) return "mysterious";
  if (cond.includes("hot")) return "energetic";
  if (cond.includes("cold")) return "warm";
  return "balanced";
}

export default async function handler(req, res) {
  try {
    console.log("ENV CHECK:", {
      WEATHER_API_KEY: process.env.WEATHER_API_KEY ? "set" : "missing",
      GEMINI_API_KEY: process.env.GEMINI_API_KEY ? "set" : "missing",
    });

    // ✅ Ensure body parsing works for both local and Vercel
    const body = req.body || (await req.json?.());
    const { location, language } = body || {};

    if (!location)
      return res.status(400).json({ error: "Missing location parameter" });

    // Weather API call
    const weatherApiKey =
      process.env.WEATHER_API_KEY || "b15d294bfca84397a5682344252410";
    const weatherUrl = `http://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${encodeURIComponent(
      location
    )}&aqi=no`;

    const response = await fetch(weatherUrl);
    const data = await response.json();

    if (!data || data.error) {
      console.error("Weather API Error Response:", data.error);
      throw new Error("WeatherAPI failed: " + (data.error?.message || "Unknown"));
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
    console.log(`Mapped "${weather.condition}" → mood "${mood}"`);

    // Get AI playlist
    let playlist = [];
    try {
      playlist = await getAiPlaylist(mood, language || "english");
    } catch (aiError) {
      console.error("AI Playlist Error:", aiError);
    }

    res.status(200).json({ weather, mood, playlist });
  } catch (error) {
    console.error("Weather Playlist Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
