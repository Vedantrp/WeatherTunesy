export default async function(req,res){
  const city = req.query.city;
  const key = process.env.WEATHER_KEY;

  const r = await fetch(
    `https://api.weatherapi.com/v1/current.json?key=${key}&q=${city}`
  );

  const j = await r.json();
  res.json({
    city: j.location.name,
    temp: j.current.temp_c,
    condition: j.current.condition.text
  });
}
