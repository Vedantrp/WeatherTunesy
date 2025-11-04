export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method !== "POST")
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });

  const { location } = await req.json();
  const key = process.env.WEATHERAPI_KEY;

  const r = await fetch(
    `https://api.weatherapi.com/v1/current.json?key=${key}&q=${encodeURIComponent(location)}`
  );
  const d = await r.json();

  const temp = d.current.temp_c;
  const cond = d.current.condition.text.toLowerCase();

  let mood = "relaxed";
  if (cond.includes("rain") || cond.includes("storm")) mood = "cozy";
  if (cond.includes("snow")) mood = "calm";
  if (cond.includes("clear") && temp > 24) mood = "upbeat";
  if (cond.includes("fog") || cond.includes("mist")) mood = "mysterious";

  return new Response(JSON.stringify({ weather: d, mood }), { status: 200 });
}
