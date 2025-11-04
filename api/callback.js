export const config = { runtime: "edge" };

export default async function handler(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirect_uri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/callback`;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri,
    client_id,
    client_secret,
  });

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const tokenData = await tokenRes.json();

  const me = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  }).then(r => r.json());

  return new Response(`
    <script>
      window.opener.postMessage({
        type: "SPOTIFY_AUTH_SUCCESS",
        token: "${tokenData.access_token}",
        refreshToken: "${tokenData.refresh_token}",
        user: ${JSON.stringify(me)}
      }, "*");
      window.close();
    </script>
  `, { headers: { "Content-Type": "text/html" } });
}
