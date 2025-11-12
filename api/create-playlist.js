export default async function handler(req, res){
  try{
    const { token, userId, name, description, uris } = req.body || {};
    if (!token || !userId || !uris?.length) {
      return res.status(400).json({ error: "Missing data" });
    }

    const create = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type":"application/json"
      },
      body: JSON.stringify({
        name: name || "WeatherTunes Mix",
        description: description || "Auto-generated weather mix",
        public: false
      })
    }).then(r=>r.json());

    if (!create?.id) return res.status(400).json({ error: "Create failed" });

    await fetch(`https://api.spotify.com/v1/playlists/${create.id}/tracks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type":"application/json"
      },
      body: JSON.stringify({ uris })
    });

    return res.json({
      id: create.id,
      external: create.external_urls?.spotify || ""
    });
  }catch(e){
    console.error("CREATE ERROR:", e);
    return res.status(500).json({ error: "Create failed" });
  }
}
