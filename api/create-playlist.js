export default async function handler(req,res){
  const { token, tracks } = req.body;

  const user = await fetch("https://api.spotify.com/v1/me",{
    headers:{Authorization:`Bearer ${token}`}
  }).then(r=>r.json());

  const playlist = await fetch(
    `https://api.spotify.com/v1/users/${user.id}/playlists`,
    {
      method:"POST",
      headers:{
        Authorization:`Bearer ${token}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        name:"WeatherTunes Mix 🎧",
        public:false
      })
    }
  ).then(r=>r.json());

  await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,{
    method:"POST",
    headers:{
      Authorization:`Bearer ${token}`,
      "Content-Type":"application/json"
    },
    body:JSON.stringify({uris:tracks})
  });

  res.json({ url: playlist.external_urls.spotify });
}
