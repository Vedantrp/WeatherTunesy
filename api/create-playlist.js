export default async function handler(req,res){
  try{
    const { token,userId,tracks } = req.body;

    const create = await fetch(
      `https://api.spotify.com/v1/users/${userId}/playlists`,
      {
        method:"POST",
        headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
        body:JSON.stringify({name:"WeatherTunes Mix",public:false})
      }
    ).then(r=>r.json());

    await fetch(
      `https://api.spotify.com/v1/playlists/${create.id}/tracks`,
      {
        method:"POST",
        headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
        body:JSON.stringify({uris:tracks})
      }
    );

    res.json({link:create.external_urls.spotify});
  }catch(e){
    res.status(500).json({error:"create fail"});
  }
}
