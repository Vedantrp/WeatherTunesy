export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(400).json({ error: "POST only" });
  }

  try {
    const { city, lat, lon } = req.body;
    const key = process.env.WEATHER_API_KEY;

    let url;

    if (lat && lon) {
      url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${key}`;
    } else if (city) {
      url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${key}`;
    } else {
      return res.status(400).json({ error: "City or coordinates required" });
    }

    const r = await fetch(url);
    const d = await r.json();

    if (!d || !d.main) return res.status(404).json({ error: "Weather not found" });

    res.json({
      city: d.name,
      country: d.sys.country,
      temp: Math.round(d.main.temp),
      feels_like: Math.round(d.main.feels_like),
      condition: d.weather[0].main,
    });
  } catch (e) {
    res.status(500).json({ error: "Weather error" });
  }
}
