export default async function handler(req,res){
  const { language, token } = req.body;
  const markets = { english:"US", hindi:"IN", punjabi:"IN" };
  const moods = { english:"english pop", hindi:"bollywood", punjabi:"punjabi hits" };

  const q = encodeURIComponent(moods[language] || "global hits");
  const market = markets[language] || "US";

  const search = await fetch(
    `https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${market}&limit=1`,
    { headers:{Authorization:`Bearer ${token}`}}
  ).then(r=>r.json());

  const playlist = search.playlists.items[0];
  const tracks = await fetch(
    `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?limit=50`,
    { headers:{Authorization:`Bearer ${token}`}}
  ).then(r=>r.json());

  const result = (tracks.items||[])
    .map(i=> ({
      id:i.track.id,
      uri:i.track.uri,
      name:i.track.name,
      artist:i.track.artists[0].name
    }))
    .slice(0,35);

  res.json({tracks:result});
}
