export default async function handler(req, res) {
  const { mood, language, token } = req.body;

  const queries = {
    english: {
      cozy: "acoustic chill english",
      upbeat: "happy pop english",
      mysterious: "ambient chill english",
    },
    hindi: {
      cozy: "bollywood acoustic",
      upbeat: "bollywood party",
      mysterious: "lofi bollywood",
    },
    punjabi: {
      cozy: "lofi punjabi",
      upbeat: "punjabi hits",
      mysterious: "punjabi chill",
    }
  };

  const q = queries[language]?.[mood] || "chill lofi";

  const url =
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=35`;

  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }});
  const data = await r.json();

  const tracks = data.tracks?.items?.map(t => ({
    id: t.id,
    uri: t.uri,
    name: t.name,
    artist: t.artists[0].name
  })) || [];

  res.json({ tracks });
}
