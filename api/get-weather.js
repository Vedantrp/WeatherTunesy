import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const city = req.method === "POST"
      ? req.body?.city?.trim()
      : req.query?.city?.trim();

    if (!city) return res.status(400).json({ error: "City missing" });

    const key = process.env.WEATHER_API_KEY;
    if (!key) return res.status(500).json({ error: "Missing WEATHER_API_KEY" });

    async function getWeather(query) {
      const url = `https://api.weatherapi.com/v1/current.json?key=${key}&q=${encodeURIComponent(query)}&aqi=no`;
      const r = await fetch(url);
      return r.json();
    }

    // Try exact
    let data = await getWeather(city);

    // Fallback: `"city, India"`
    if (data?.error) {
      data = await getWeather(`${city}, India`);
    }

    // Still not found
    if (!data?.location) {
      return res.status(404).json({ error: "Weather not found. Try nearby city" });
    }

    return res.status(200).json({
      location: `${data.location.name}, ${data.location.country}`,
      temp: data.current.temp_c,
      feels_like: data.current.feelslike_c,
      condition: data.current.condition.text,
      icon: data.current.condition.icon
    });

  } catch (err) {
    return res.status(500).json({ error: "Weather fetch failed" });
  }
}
