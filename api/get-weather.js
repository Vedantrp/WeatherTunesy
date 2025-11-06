export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST allowed" });
    }

    const { city } = req.body;
    if (!city) {
      return res.status(400).json({ error: "City is required" });
    }

    const apiKey = process.env.WEATHER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing WEATHER_API_KEY" });
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      city
    )}&appid=${apiKey}&units=metric`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.main) {
      return res.status(404).json({ error: "City not found" });
    }

    const weather = {
      temp: data.main.temp,
      feels_like: data.main.feels_like,
      condition: data.weather[0].main, // e.g. Rain, Haze, Clear
      icon: data.weather[0].icon
    };

    res.status(200).json(weather);
  } catch (err) {
    console.error("Weather API Error →", err);
    res.status(500).json({ error: "Weather fetch failed" });
  }
}
