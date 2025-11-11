import fetch from "node-fetch";

// Uses OpenWeatherMap (metric). Set WEATHER_API_KEY in Vercel.
export default async function handler(req, res){
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
    const { city } = req.body || {};
    if (!city) return res.status(400).json({ error: "Missing city" });

    const key = process.env.WEATHER_API_KEY;
    if (!key) return res.status(500).json({ error: "WEATHER_API_KEY missing" });

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${key}&units=metric`;
    const r = await fetch(url);
    const j = await r.json();
    if (!r.ok) return res.status(400).json({ error: j?.message || "Weather fail" });

    const temp = j.main?.temp;
    const feels_like = j.main?.feels_like;
    const condition = j.weather?.[0]?.main || "Clear";

    res.json({ temp, feels_like, condition, icon: j.weather?.[0]?.icon || "01d" });
  } catch (e) {
    console.error("WEATHER ERR", e);
    res.status(500).json({ error: "Weather server error" });
  }
}
