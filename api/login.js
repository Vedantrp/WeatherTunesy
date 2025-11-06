export default function handler(req, res) {
  const { SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI } = process.env;

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_REDIRECT_URI) {
    return res.status(500).json({
      error: "ENV MISSING",
      clientId: !!SPOTIFY_CLIENT_ID,
      redirectUri: !!SPOTIFY_REDIRECT_URI
    });
  }

  const scope = "playlist-modify-public playlist-modify-private user-read-email";

  const authUrl =
    `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(SPOTIFY_REDIRECT_URI)}` +
    `&scope=${scope}`;

  res.status(200).json({ authUrl });
}
