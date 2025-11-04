export default async function handler(req, res) {
  try {
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const redirect_uri = "https://weather-tunes-kappa.vercel.app/api/callback";

    const scope = [
      "playlist-modify-private",
      "playlist-modify-public",
      "user-read-email",
      "user-read-private"
    ].join(" ");

    const authUrl = `https://accounts.spotify.com/authorize?` +
      `response_type=code` +
      `&client_id=${client_id}` +
      `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
      `&scope=${encodeURIComponent(scope)}`;

    res.status(200).json({ authUrl });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Spotify login failed" });
  }
}
