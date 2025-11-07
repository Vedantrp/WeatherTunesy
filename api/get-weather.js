export default async function handler(req,res){
  const { city } = req.body;
  const key = process.env.WEATHER_API_KEY;

  const r = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${key}&units=metric`
  );
  const d = await r.json();

  res.json({
    temp:d.main.temp,
    feels_like:d.main.feels_like,
    condition:d.weather[0].main
  });
}
