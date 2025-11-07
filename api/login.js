export default function handler(req,res){
  const cid = process.env.SPOTIFY_CLIENT_ID;
  const redirect = process.env.SPOTIFY_REDIRECT_URI;

  const scope = [
    "playlist-modify-private",
    "playlist-modify-public",
    "user-read-email"
  ].join("%20");

  const url =
    `https://accounts.spotify.com/authorize?client_id=${cid}`+
    `&response_type=code&redirect_uri=${encodeURIComponent(redirect)}`+
    `&scope=${scope}`;

  res.json({authUrl:url});
}
