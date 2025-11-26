module.exports = async (req, res) => {
  const { city } = req.body;

  const r = await fetch(
    `https://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${city}`
  );

  const data = await r.json();

  if (!data.current) {
    return res.status(400).json({ error: "City not found" });
  }

  res.status(200).json({
    temp: data.current.temp_c,
    condition: data.current.condition.text
  });
};
