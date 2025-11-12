export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(400).json({ error: "POST only" });

  try {
    const { city } = req.body;
    if (!city) return res.status(400).json({ error: "Missing city" });

    const apiKey = process.env.WEATHER_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing API key" });

    // ✅ Add `units=metric` to get Celsius directly
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      city
    )}&appid=${apiKey}&units=metric`;

    const resp = await fetch(url);
    const data = await resp.json();

    if (!resp.ok || !data.main)
      return res.status(404).json({ error: "Weather not found" });

    // ✅ Return only clean, used info
    res.status(200).json({
      name: data.name,
      temp: data.main.temp,
      feels_like: data.main.feels_like,
      condition: data.weather?.[0]?.main || "Clear",
      icon: data.weather?.[0]?.icon || "01d",
    });
  } catch (e) {
    console.error("WEATHER ERROR:", e);
    res.status(500).json({ error: "Weather fetch failed" });
  }
}
