export default async function handler(req,res){
  const { token, language, mood } = req.body;

  const queries = {
    english:"english hits chill",
    hindi:"bollywood chill",
    punjabi:"punjabi hits"
  };

  const q = queries[language] || "global chill";

  const search = await fetch(
    `https://api.spotify.com/v1/search?q=${q}&type=playlist&limit=1`,
    { headers:{Authorization:`Bearer ${token}`} }
  ).then(r=>r.json());

  const playlist = search.playlists.items[0];

  const tracks = await fetch(
    `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?limit=40`,
    { headers:{Authorization:`Bearer ${token}`} }
  ).then(r=>r.json());

  const out = tracks.items.slice(0,20)
    .map(i=> ({
      id:i.track.id,
      uri:i.track.uri,
      name:i.track.name,
      artist:i.track.artists[0].name
    }));

  res.json({tracks:out});
}
