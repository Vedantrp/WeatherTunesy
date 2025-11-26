export default async function handler(req, res) {
  try {
    // parse body safely
    let body = req.body;

    if (!body) {
      let raw = "";
      await new Promise((resolve) => {
        req.on("data", (chunk) => (raw += chunk));
        req.on("end", resolve);
      });

      try {
        body = JSON.parse(raw || "{}");
      } catch (e) {
        return res.status(400).json({ error: "Invalid JSON Body" });
      }
    }

    const { city } = body;
    if (!city) {
      return res.status(400).json({ error: "City missing" });
    }

    const url =
      `https://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}` +
      `&q=${encodeURIComponent(city)}`;

    const weatherRes = await fetch(url);
    const dataText = await weatherRes.text();

    let data;
    try {
      data = JSON.parse(dataText);
    } catch {
      return res.status(400).json({
        error: "Weather API returned non-JSON",
        raw: dataText
      });
    }

    if (data.error) {
      return res.status(400).json({
        error: data.error.message || "Weather error",
        code: data.error.code
      });
    }

    return res.status(200).json({
      temp: data.current.temp_c,
      condition: data.current.condition.text
    });
  } catch (err) {
    console.error("Weather Server Error:", err);
    return res.status(500).json({ error: "Server crashed", message: err.message });
  }
}
