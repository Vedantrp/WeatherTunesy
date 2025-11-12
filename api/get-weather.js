import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST")
      return res.status(400).json({ error: "POST only" });

    const { city } = req.body;
    if (!city) return res.status(400).json({ error: "City missing" });

    const key = process.env.WEATHER_API_KEY;
    const base = `https://api.weatherapi.com/v1`;

    async function fetchWeather(q) {
      const url = `${base}/current.json?key=${key}&q=${encodeURIComponent(q)}&aqi=no`;
      const r = await fetch(url);
      return r.json();
    }

    // 1️⃣ Direct request
    let data = await fetchWeather(city);

    // 2️⃣ If failed → try city + India
    if (data?.error) data = await fetchWeather(`${city}, India`);

    // 3️⃣ If still fails → find best match using auto-suggest
    if (data?.error) {
      const search = await fetch(`${base}/search.json?key=${key}&q=${encodeURIComponent(city)}`).then(r => r.json());
      if (Array.isArray(search) && search.length > 0) {
        const bestMatch = search[0].name;
        data = await fetchWeather(bestMatch);
      }
    }

    if (data?.error) return res.status(404).json({ error: "Weather not found" });

    return res.json({
      location: `${data.location.name}, ${data.location.country}`,
      temp: data.current.temp_c,
      feels_like: data.current.feelslike_c,
      condition: data.current.condition.text,
      icon: data.current.condition.icon
    });

  } catch (err) {
    console.error("WEATHER API ERROR:", err);
    res.status(500).json({ error: "Weather service error" });
  }
}
