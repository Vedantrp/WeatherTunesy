import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
    const { city } = req.body || {};
    if (!city) return res.status(400).json({ error: "Missing city" });

    const key = process.env.WEATHER_API_KEY;
    if (!key) return res.status(500).json({ error: "Missing WEATHER_API_KEY" });

    const url = `https://api.weatherapi.com/v1/current.json?key=${key}&q=${encodeURIComponent(city)}&aqi=no`;
    const data = await fetch(url).then(r => r.json());

    if (!data?.location || !data?.current) {
      return res.status(400).json({ error: "Weather not found" });
    }

    return res.status(200).json({
      location: `${data.location.name}, ${data.location.country}`,
      temp: data.current.temp_c,
      feels_like: data.current.feelslike_c,
      condition: data.current.condition?.text || "—",
      icon: data.current.condition?.icon || ""
    });
  } catch (e) {
    return res.status(500).json({ error: "Weather fetch failed" });
  }
}
