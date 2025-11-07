export default function handler(req, res) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(500).json({
      error: "Missing env",
      clientId: !!clientId,
      redirectUri: !!redirectUri
    });
  }

  const scope = "playlist-modify-private playlist-modify-public user-read-email";

  const authUrl = 
    `https://accounts.spotify.com/authorize?client_id=${clientId}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}`;

  return res.status(200).json({ authUrl });
}
