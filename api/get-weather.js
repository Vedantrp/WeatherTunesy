import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const city = req.body?.city;
    if (!city) return res.status(400).json({ error: "City required" });

    const KEY = process.env.WEATHER_API_KEY;
    if (!KEY) return res.status(500).json({ error: "Missing WEATHER_API_KEY" });

    const url = `http://api.weatherapi.com/v1/current.json?key=${KEY}&q=${encodeURIComponent(city)}&aqi=no`;
    const r = await fetch(url);
    const d = await r.json();

    if (d?.error) return res.status(400).json({ error: d.error?.message || "Weather error" });

    const out = {
      temp: d.current?.temp_c,
      feels_like: d.current?.feelslike_c,
      condition: d.current?.condition?.text || "Clear",
      icon: d.current?.condition?.icon || ""
    };
    return res.status(200).json(out);
  } catch (e) {
    console.error("WEATHER ERROR:", e);
    return res.status(500).json({ error: "Weather failed" });
  }
}
