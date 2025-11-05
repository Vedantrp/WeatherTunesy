export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { location } = req.body || {};
    if (!location) return res.status(400).json({ error: "Missing location" });

    const r = await fetch(`https://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${encodeURIComponent(location)}&aqi=no`);
    const data = await r.json();

    if (!r.ok || data.error) {
      return res.status(400).json({ error: "Weather lookup failed", details: data?.error });
    }

    // Send only what we need
    return res.status(200).json({
      temp_c: data.current?.temp_c,
      condition: data.current?.condition?.text || "",
      icon: data.current?.condition?.icon || "",
      city: data.location?.name || location,
      country: data.location?.country || ""
    });
  } catch (e) {
    return res.status(500).json({ error: "Weather failed" });
  }
}
