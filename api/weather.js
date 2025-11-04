export default async function handler(req, res) {
  const { location } = req.body;
  const r = await fetch(
    `https://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${location}`
  );
  const data = await r.json();
  res.json(data);
}
