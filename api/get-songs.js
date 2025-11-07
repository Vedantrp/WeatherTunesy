export default async function handler(req,res){
  try{
    const { token, language="english", mood="chill" } = req.body;

    const markets = { english:"US", hindi:"IN", punjabi:"IN" };
    const q = `${language} ${mood}`;
    const market = markets[language] || "US";

    const r = await fetch(
      `https://api.spotify.com/v1/search?q=${q}&type=playlist&market=${market}&limit=1`,
      { headers:{ Authorization:`Bearer ${token}` } }
    );

    if(r.status === 401){
      return res.status(401).json({ error:"expired" });
    }

    const p = await r.json();
    const id = p?.playlists?.items?.[0]?.id;
    if(!id) return res.json({ tracks:[] });

    const t = await fetch(
      `https://api.spotify.com/v1/playlists/${id}/tracks`,
      { headers:{ Authorization:`Bearer ${token}` } }
    ).then(r=>r.json());

    const tracks = (t.items || []).map(i=>({
      name:i.track.name,
      artist:i.track.artists[0].name
    }));

    res.json({ tracks });

  } catch(e){
    res.status(500).json({ error:"server" });
  }
}
