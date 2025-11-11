export default async function handler(req, res) {
  try {
    const { city } = req.body || {};
    if (!city) return res.status(400).json({ error: "Enter a city" });

    const key = process.env.WEATHER_API_KEY;
    if (!key) return res.status(500).json({ error: "Weather key missing" });

    const url = `https://api.weatherapi.com/v1/current.json?key=${key}&q=${encodeURIComponent(city)}&aqi=no`;
    const data = await fetch(url).then(r => r.json());

    if (data?.error) {
      return res.status(400).json({ error: "City not found" });
    }

    res.json({
      temp: data.current.temp_c,
      feels_like: data.current.feelslike_c,
      condition: data.current.condition.text,
      icon: data.current.condition.icon
    });
  } catch {
    res.status(500).json({ error: "Server weather error" });
  }
}
