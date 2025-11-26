module.exports = async (req, res) => {
  try {
    // READ RAW BODY (Vercel sometimes fails to parse req.body)
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

    const city = body.city;
    if (!city) {
      return res.status(400).json({ error: "City missing in request" });
    }

    // Make API request
    const url =
      `https://api.weatherapi.com/v1/current.json` +
      `?key=${process.env.WEATHER_API_KEY}` +
      `&q=${encodeURIComponent(city)}`;

    const weatherRes = await fetch(url);
    const dataText = await weatherRes.text();

    // TRY TO PARSE JSON
    let data;
    try {
      data = JSON.parse(dataText);
    } catch (e) {
      return res.status(400).json({
        error: "Weather API returned invalid response",
        raw: dataText
      });
    }

    // Detect WeatherAPI errors
    if (data.error) {
      return res.status(400).json({
        error: data.error.message || "Weather API error",
        code: data.error.code
      });
    }

    // SUCCESS
    return res.status(200).json({
      temp: data.current.temp_c,
      condition: data.current.condition.text
    });

  } catch (err) {
    console.error("WEATHER SERVER ERROR:", err);

    return res.status(500).json({
      error: "Server crashed",
      message: err.message
    });
  }
};
