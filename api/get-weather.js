export default async function handler(req, res) {
  const key = process.env.WEATHER_API_KEY;
  const { city } = req.body;

  const r = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${key}&units=metric`);
  const w = await r.json();

  res.json({
    temp: w.main.temp,
    feels_like: w.main.feels_like,
    condition: w.weather[0].main
  });
}
 
