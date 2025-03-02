import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");

  if (!city) {
    return NextResponse.json({ error: "City is required" }, { status: 400 });
  }

  const dummyWeatherData = {
    city,
    weather: "Sunny",
    temperature: "25°C",
  };

  return NextResponse.json(dummyWeatherData);
}