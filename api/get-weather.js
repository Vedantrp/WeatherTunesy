import { NextResponse } from "next/server";

export async function POST(req) {
  const { city } = await req.json();

  const r = await fetch(
    `https://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${city}`
  );

  const w = await r.json();

  if (!w.current) {
    return NextResponse.json({ error: "City not found" }, { status: 400 });
  }

  return NextResponse.json({
    temp: w.current.temp_c,
    condition: w.current.condition.text
  });
}
