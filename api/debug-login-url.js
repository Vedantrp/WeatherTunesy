// /api/debug-login-url.js
export default function handler(req, res) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return res.status(500).json({
      ok: false,
      reason: "Missing env",
      hasClientId: !!clientId,
      hasRedirectUri: !!redirectUri
    });
  }

  const scope = [
    "playlist-modify-private",
    "playlist-modify-public",
    "user-read-email"
  ].join("%20");

  const authUrl =
    `https://accounts.spotify.com/authorize` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${scope}`;

  res.status(200).json({
    ok: true,
    clientIdEndsWith: clientId.slice(-4),
    redirectUri,
    authUrl
  });
}
