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

  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  const tokenData = await r.json();

  if (!tokenData.access_token) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  // Fetch user info
  const userReq = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: Bearer ${tokenData.access_token} }
  });
  const user = await userReq.json();

  // ---------------------------------------------
  // 🔥 THIS PART IS CRITICAL (RETURN TO POPUP)
  // ---------------------------------------------
  return new Response(`
    <script>
      window.opener.postMessage(
        {
          type: "SPOTIFY_AUTH_SUCCESS",
          token: "${tokenData.access_token}",
          refresh: "${tokenData.refresh_token}",
          user: ${JSON.stringify(user)}
        },
        "*"
      );
      window.close();
    </script>
  `, {
    headers: { "Content-Type": "text/html" }
  });
}
