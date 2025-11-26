module.exports = async (req, res) => {
  try {
    // Parse body safely
    let body = req.body;

    // If Vercel did not parse it, parse manually
    if (!body) {
      const text = await new Promise((resolve) => {
        let data = "";
        req.on("data", (chunk) => (data += chunk));
        req.on("end", () => resolve(data));
      });
      body = JSON.parse(text || "{}");
    }

    const { city } = body;

    if (!city) {
      return res.status(400).json({ error: "City missing" });
    }

    // Call weather API
    const response = await fetch(
      `https://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${encodeURIComponent(
        city
      )}`
    );

    const data = await response.json();

    // If weather API failed
    if (data.error) {
      return res.status(400).json({
        error: data.error.message || "Invalid city"
      });
    }

    // Success
    return res.status(200).json({
      temp: data.current.temp_c,
      condition: data.current.condition.text
    });

  } catch (err) {
    console.error("WEATHER ERROR:", err);
    return res.status(500).json({ error: "Server failed", details: err.message });
  }
};
