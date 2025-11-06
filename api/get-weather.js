export default async function handler(req, res) {
  try {
    const city = req.query.city;
    if (!city) return res.status(400).json({ error: "City required" });

    const api = process.env.WEATHER_API_KEY;
    const r = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${api}&units=metric`
    );

    const data = await r.json();
    if (!data.main) return res.status(404).json({ error: "City not found" });

    res.status(200).json({
      temp: data.main.temp,
      feels_like: data.main.feels_like,
      condition: data.weather[0].main,
      icon: data.weather[0].icon
    });
  } catch (e) {
    res.status(500).json({ error: "Weather API failed" });
  }
}
