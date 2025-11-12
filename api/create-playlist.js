import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
    const { token, userId, name, description, uris } = req.body || {};
    if (!token || !userId || !uris?.length) return res.status(400).json({ error: "Missing fields" });

    const create = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`,{
      method:"POST",
      headers:{ "Authorization":`Bearer ${token}`, "Content-Type":"application/json" },
      body: JSON.stringify({ name: name || "WeatherTunes Mix", description: description || "", public:false })
    }).then(r=>r.json());

    if (!create?.id) return res.status(400).json({ error:"Create failed" });

    await fetch(`https://api.spotify.com/v1/playlists/${create.id}/tracks`,{
      method:"POST",
      headers:{ "Authorization":`Bearer ${token}`, "Content-Type":"application/json" },
      body: JSON.stringify({ uris })
    });

    return res.status(200).json({ id:create.id, url:create.external_urls?.spotify });
  } catch (e) {
    return res.status(500).json({ error: "Playlist create failed" });
  }
}
