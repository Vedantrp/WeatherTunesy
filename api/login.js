export default function handler(req, res) {
  const client = process.env.SPOTIFY_CLIENT_ID;
  
  // ✅ Build correct redirect
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3000";

  const redirect_uri = `${base.startsWith("http") ? base : `https://${base}`}/api/callback`;

  const scope = "user-read-email playlist-modify-private playlist-modify-public";

  const url = `https://accounts.spotify.com/authorize?client_id=${client}&response_type=code&redirect_uri=${encodeURIComponent(
    redirect_uri
  )}&scope=${encodeURIComponent(scope)}`;

  res.redirect(url);
}
