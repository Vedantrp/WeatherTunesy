// /api/get-weather.js

import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "POST only" });
    }

    const { city } = req.body;
    if (!city) return res.status(400).json({ error: "City required" });

    // Weather request from OpenWeather
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        city
      )}&appid=${process.env.WEATHER_API_KEY}`
    );

    const wData = await weatherRes.json();
    if (!wData || wData.cod !== 200) {
      return res.status(404).json({ error: "Weather not found" });
    }

    // Convert temp
    const temp = wData.main.temp - 273.15;
    const feels = wData.main.feels_like - 273.15;
    const condition = wData.weather[0].main;
    const icon = wData.weather[0].icon;

    // Local time calculation using timezone offset
    const timezoneOffset = wData.timezone; // seconds offset from UTC
    const localTime = new Date(Date.now() + timezoneOffset * 1000);
    const hour = localTime.getHours();

    return res.status(200).json({
      city: wData.name,
      temp: parseFloat(temp.toFixed(1)),
      feels_like: parseFloat(feels.toFixed(1)),
      condition,
      icon,
      hour,
      timezoneOffset,
      raw: wData // optional debug
    });
  } catch (err) {
    console.error("GET-WEATHER ERROR:", err);
    return res.status(500).json({ error: "Weather + time fetch failed" });
  }
}
