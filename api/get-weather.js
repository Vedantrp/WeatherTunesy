export default async function handler(req, res) {
  const { city } = req.body;
  if (!city) return res.status(400).json({ error: "City missing" });

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.WEATHER_API_KEY}&units=metric`;

  const r = await fetch(url);
  const d = await r.json();

  return res.json({
    temp: d.main.temp,
    feels_like: d.main.feels_like,
    condition: d.weather[0].description,
  });
}
