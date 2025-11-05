export default async function handler(req, res) {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const redirect_uri = "https://weather-tunes-xi.vercel.app/api/callback"; // ✅ EXACT

  const scope = "user-read-email playlist-modify-private playlist-modify-public";

  const authUrl = `https://accounts.spotify.com/authorize?client_id=${client_id}&response_type=code&redirect_uri=${encodeURIComponent(
    redirect_uri
  )}&scope=${encodeURIComponent(scope)}`;

  return res.status(200).json({ authUrl });
}
