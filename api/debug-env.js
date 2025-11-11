// /api/debug-env.js
export default function handler(req, res) {
  const env = {
    SPOTIFY_CLIENT_ID: !!process.env.SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET: !!process.env.SPOTIFY_CLIENT_SECRET,
    SPOTIFY_REDIRECT_URI: !!process.env.SPOTIFY_REDIRECT_URI,
    FRONTEND_URL: !!process.env.FRONTEND_URL,
    WEATHER_API_KEY: !!process.env.WEATHER_API_KEY
  };
  // Also show which Vercel env we’re in
  res.status(200).json({
    ok: true,
    vercelEnv: process.env.VERCEL_ENV || "unknown",
    env
  });
}
