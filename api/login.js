module.exports = async (req, res) => {
  const scope = [
    "user-read-email",
    "playlist-modify-public",
    "playlist-modify-private"
  ].join(" ");

  const authUrl =
    "https://accounts.spotify.com/authorize" +
    `?response_type=code` +
    `&client_id=${process.env.SPOTIFY_CLIENT_ID}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&redirect_uri=${encodeURIComponent(process.env.SPOTIFY_REDIRECT_URI)}`;

  res.status(200).json({ authUrl });
};
