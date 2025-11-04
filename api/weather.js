// /api/weather.js
export default async function handler(req, res) {
  try {
    const city = req.query.city;
    if (!city) return res.status(400).json({ error: "City is required" });

    const key = process.env.WEATHERAPI_KEY; // <-- Add key in Vercel env
    if (!key) return res.status(500).json({ error: "Missing WEATHERAPI_KEY env" });

    const url = `https://api.weatherapi.com/v1/current.json?key=${key}&q=${encodeURIComponent(city)}&aqi=no`;

    const r = await fetch(url);
    const j = await r.json();

    if (j.error) return res.status(400).json({ error: j.error.message });

    return res.status(200).json({
      text: j.current.condition.text,
      temp: `${j.current.temp_c}°C`,
      icon: j.current.condition.icon
    });
  } catch (err) {
    return res.status(500).json({ error: "Weather fetch failed" });
  }
}
