// api/get-songs.js
import fetch from "node-fetch";

export default async function handler(req,res){
  const { token, mood } = req.body;

  const moodMap = {
    chill: "chill hits",
    happy: "happy hits",
    lofi: "lofi beats",
    mood: "top 50 global"
  };

  const q = encodeURIComponent(moodMap[mood] || "top hits");

  const s = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=playlist&limit=1`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r=>r.json());

  const pl = s.playlists.items[0];

  const t = await fetch(`https://api.spotify.com/v1/playlists/${pl.id}/tracks?limit=30`,{
    headers:{ Authorization:`Bearer ${token}` }
  }).then(r=>r.json());

  const tracks = t.items.map(x => x.track.uri);
  res.json({ tracks });
}
