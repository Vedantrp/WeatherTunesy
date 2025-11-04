// /api/weather-playlist.js
// Fetch weather → determine mood → send clean JSON to frontend

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "POST only" });
    }

    const { location, language } = req.body;
    if (!location) return res.status(400).json({ error: "Missing location" });

    const apiKey = process.env.WEATHER_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing WEATHER_API_KEY" });

    // Fetch weather data
    const wRes = await fetch(
      `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${encodeURIComponent(location)}`
    );
    const wJson = await wRes.json();

    if (wJson.error) {
      return res.status(400).json({ error: "Invalid city" });
    }

    const temp = wJson.current.temp_c;
    const condition = (wJson.current.condition.text || "").toLowerCase();

    // Basic weather → mood map
    let mood = "relaxed";
    if (condition.includes("rain")) mood = "cozy";
    else if (condition.includes("clear") || condition.includes("sunny")) mood = "upbeat";
    else if (temp > 32) mood = "tropical";
    else if (temp < 10) mood = "winter";
    else if (condition.includes("storm")) mood = "intense";
    else if (condition.includes("cloud")) mood = "balanced";
    else if (condition.includes("snow")) mood = "calm";
    else if (condition.includes("fog") || condition.includes("mist")) mood = "mysterious";

    return res.status(200).json({
      weather: { text: wJson.current.condition.text, temp },
      mood,
      language: language || "english",
    });
  } catch (err) {
    console.error("weather-playlist error:", err);
    return res.status(500).json({ error: "Weather service failed" });
  }
}
