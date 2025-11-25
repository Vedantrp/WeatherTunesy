export const dynamic ="force-dynamic";
export default async function handler(req, res){
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
    const { city, lat, lon } = req.body || {};
    const key = process.env.WEATHER_API_KEY;
    if (!key) return res.status(500).json({ error: "Missing WEATHER_API_KEY" });

    let url;
    if (city){
      url = https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${key};
    } else if (lat && lon){
      url = https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&appid=${key};
    } else {
      return res.status(400).json({ error: "city or lat/lon required" });
    }

    const r = await fetch(url);
    const j = await r.json();
    if (!r.ok) {
      console.error("OWM error", j);
      return res.status(400).json({ error: "Weather not found", raw:j });
    }

    // normalize
    const main = j.main || {};
    const weather = (j.weather && j.weather[0]) || {};
    const out = {
      name: j.name,
      country: j.sys?.country,
      temp: main.temp,
      tempC: main.temp ? (main.temp - 273.15) : null,
      feels_like: main.feels_like,
      humidity: main.humidity,
      condition: weather.main,
      description: weather.description,
      icon: weather.icon,
      raw: j
    };
    res.status(200).json(out);
  } catch (err){
    console.error("get-weather error", err);
    res.status(500).json({ error: "Weather fetch failed" });
  }
}
