export default function handler(req,res){
  const scope = "playlist-modify-private playlist-modify-public user-read-email";
  const url = `https://accounts.spotify.com/authorize?client_id=${process.env.SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(process.env.SPOTIFY_REDIRECT_URI)}&scope=${scope}`;
  res.json({authUrl:url});
}
