import { NextResponse } from "next/server";

export async function POST(req) {
  const { city } = await req.json();

  const key = process.env.WEATHER_API_KEY;

  const r = await fetch(
    `https://api.weatherapi.com/v1/current.json?key=${key}&q=${city}`
  );

  const w = await r.json();

  if (!w.current) {
    return NextResponse.json({ error: "Not found" }, { status: 400 });
  }

  return NextResponse.json({
    temp: w.current.temp_c,
    condition: w.current.condition.text
  });
}
