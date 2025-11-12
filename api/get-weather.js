export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(400).json({ error: "POST only" });
  }

  try {
    const { city } = req.body;
    if (!city) return res.status(400).json({ error: "City required" });

    const apiKey = process.env.WEATHER_API_KEY;

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      city
    )}&units=metric&appid=${apiKey}`;

    const weatherRes = await fetch(url);
    const data = await weatherRes.json();

    if (data.cod !== 200) {
      return res.status(404).json({ error: "Weather not found" });
    }

    const condition = data.weather?.[0]?.main || "Clear";

    return res.json({
      city: data.name,
      country: data.sys.country,
      temp: Math.round(data.main.temp),
      feels_like: Math.round(data.main.feels_like),
      condition,
    });
  } catch (err) {
    console.error("WEATHER ERR", err);
    res.status(500).json({ error: "Weather fetch failed" });
  }
}
