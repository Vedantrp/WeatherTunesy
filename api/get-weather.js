export default async function handler(req, res) {
  try {
    if (req.method !== "POST")
      return res.status(405).json({ error: "POST only" });

    if (!process.env.WEATHER_API_KEY)
      return res.status(500).json({ error: "Missing WEATHER_API_KEY" });

    const { city } = req.body || {};
    if (!city) return res.status(400).json({ error: "City required" });

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      city
    )}&appid=${process.env.WEATHER_API_KEY}&units=metric`;

    const r = await fetch(url);
    const data = await r.json();

    if (!data.main)
      return res.status(404).json({ error: "City not found" });

    res.json({
      temp: data.main.temp,
      condition: data.weather?.[0]?.main || "Clear",
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Server crashed" });
  }
}
