import fetch from "node-fetch";

export default async function handler(req, res){
  try {
    if (req.method !== "POST") return res.status(405).json({ error:"POST only" });
    const { token, name, uris = [] } = req.body || {};
    if (!token) return res.status(401).json({ error:"Missing token" });
    if (!uris.length) return res.status(400).json({ error:"No uris" });

    // get user
    const meR = await fetch("https://api.spotify.com/v1/me", { headers:{ Authorization:`Bearer ${token}` }});
    if (meR.status === 401) return res.status(401).json({ error:"Spotify token expired" });
    const me = await meR.json();
    const userId = me.id;
    if (!userId) return res.status(400).json({ error:"No user id" });

    // create playlist
    const cR = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      method:"POST",
      headers: { Authorization:`Bearer ${token}`, "Content-Type":"application/json" },
      body: JSON.stringify({
        name: name || "WeatherTunes Mix",
        description: "Auto-generated weather mix",
        public: false
      })
    });
    const p = await cR.json();
    if (!p.id) return res.status(400).json({ error:"Playlist create failed" });

    // add tracks
    await fetch(`https://api.spotify.com/v1/playlists/${p.id}/tracks`, {
      method:"POST",
      headers: { Authorization:`Bearer ${token}`, "Content-Type":"application/json" },
      body: JSON.stringify({ uris })
    });

    res.json({ id: p.id, url: p.external_urls?.spotify || "" });
  } catch (e) {
    console.error("CREATE ERR", e);
    res.status(500).json({ error:"Create failed" });
  }
}
