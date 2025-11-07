export default async function handler(req, res) {
  const { city } = req.body;
  const key = process.env.WEATHER_API_KEY;

  const r = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${key}`
  );
  const j = await r.json();

  res.json({
    temp: j.main.temp,
    feels_like: j.main.feels_like,
    condition: j.weather[0].main
  });
}
