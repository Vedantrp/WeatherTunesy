export default async function handler(req, res) {
  try {
    const { location, language } = req.body;

    const key = process.env.WEATHER_API_KEY;
    const url = `https://api.weatherapi.com/v1/current.json?key=${key}&q=${location}`;

    const w = await fetch(url);
    const data = await w.json();

    const cond = data.current.condition.text.toLowerCase();

    let mood = "relaxed";
    if (cond.includes("rain")) mood = "cozy";
    if (cond.includes("sun") || cond.includes("clear")) mood = "upbeat";
    if (cond.includes("storm")) mood = "intense";
    if (cond.includes("cloud")) mood = "balanced";
    if (cond.includes("fog") || cond.includes("mist")) mood = "mysterious";

    res.json({
      weather: {
        temp: data.current.temp_c,
        text: data.current.condition.text,
        icon: data.current.condition.icon,
      },
      mood,
      language,
    });
  } catch (e) {
    res.status(500).json({ error: "Weather failed" });
  }
}
