export default function handler(req,res){
  const client = process.env.SPOTIFY_CLIENT_ID;
const redirect_uri = `${process.env.VERCEL_URL}/api/callback`;

  const scope = "user-read-email playlist-modify-private playlist-modify-public";

  const url = `https://accounts.spotify.com/authorize?client_id=${client}&response_type=code&redirect_uri=${redirect}&scope=${scope}`;

  res.redirect(url);
}
