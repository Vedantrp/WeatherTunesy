// /api/login.js
export default async function handler(req, res) {
  try {
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const redirect_uri = `${process.env.NEXTAUTH_URL || "https://weather-tunes-kappa.vercel.app"}/api/callback`;
    const scope = "playlist-modify-public playlist-modify-private user-read-email user-read-private";

    const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${client_id}&scope=${encodeURIComponent(
      scope
    )}&redirect_uri=${encodeURIComponent(redirect_uri)}`;

    return res.status(200).json({ authUrl });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Failed to create Spotify auth URL" });
  }
}
