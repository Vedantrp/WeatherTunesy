// /api/get-weather.js
export default async function handler(req, res) {
  try {
    const { city } = req.body || {};
    if (!city) return res.status(400).json({ error: "City required" });

    const apiKey = process.env.WEATHER_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing WEATHER_API_KEY" });

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      city
    )}&units=metric&appid=${apiKey}`;

    const r = await fetch(url);
    if (!r.ok) return res.status(400).json({ error: "Invalid city" });
    const d = await r.json();

    const condition = d.weather?.[0]?.main || "Unknown";
    const temp = d.main?.temp ?? null;

    res.json({
      city,
      temp,
      condition
    });
  } catch (err) {
    console.error("WEATHER_API_ERROR", err);
    res.status(500).json({ error: "Weather fetch failed" });
  }
}
