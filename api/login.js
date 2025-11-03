export default async function handler(req, res) {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const redirect_uri = `${process.env.NEXTAUTH_URL || "https://weather-tunes-kappa.vercel.app"}/api/callback`;
  const scope = "playlist-modify-public playlist-modify-private user-read-email user-read-private";

  const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${client_id}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirect_uri)}`;

  res.status(200).json({ authUrl });
}
