export default async function handler(req, res) {
  try {
    const { city } = req.body || {};
    const key = process.env.WEATHER_API_KEY;
    if (!city) return res.status(400).json({ error: "City required" });

    const data = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${key}`
    ).then(r => r.json());

    if (data.cod && data.cod !== 200) {
      return res.status(400).json({ error: "Weather lookup failed" });
    }

    res.json({
      temp: data.main.temp,
      feels_like: data.main.feels_like,
      condition: data.weather[0].main
    });
  } catch (e) {
    console.error("WEATHER ERROR", e);
    res.status(500).json({ error: "Internal error" });
  }
}
