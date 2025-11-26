import { NextResponse } from "next/server";

export async function GET(req) {
  const code = req.nextUrl.searchParams.get("code");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    client_id: process.env.SPOTIFY_CLIENT_ID,
    client_secret: process.env.SPOTIFY_CLIENT_SECRET
  });

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  const token = await tokenRes.json();

  const userRes = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${token.access_token}` }
  });

  const user = await userRes.json();

  return NextResponse.json({
    token: token.access_token,
    refresh: token.refresh_token,
    user
  });
}
