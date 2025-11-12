export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(400).json({ error: "POST only" });

  const { city, lat, lon } = req.body || {};
  const apiKey = process.env.WEATHER_API_KEY;

  try {
    let url;
    if (lat && lon) {
      url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    } else if (city) {
      url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
    } else {
      return res.status(400).json({ error: "Missing city or coordinates" });
    }

    const r = await fetch(url);
    const data = await r.json();
    if (!r.ok || !data.weather) return res.status(404).json({ error: "Weather not found" });

    return res.json({
      city: data.name,
      temp: data.main.temp,
      feels: data.main.feels_like,
      condition: data.weather[0].main,
      icon: data.weather[0].icon,
      country: data.sys.country
    });
  } catch (err) {
    console.error("WEATHER ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
