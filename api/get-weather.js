module.exports = async (req, res) => {
  const { city } = req.body;

  const r = await fetch(
    `https://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${city}`
  );

  const w = await r.json();

  if (!w.current) {
    return res.status(400).json({ error: "City not found" });
  }

  res.status(200).json({
    temp: w.current.temp_c,    // °C ALWAYS
    condition: w.current.condition.text
  });
};
