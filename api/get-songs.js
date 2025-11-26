module.exports = async (req, res) => {
  const { token, language, mood } = req.body;

  const q = `${mood} ${language} songs`;

  const r = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=15`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const data = await r.json();

  if (!data.tracks) {
    return res.status(200).json({ tracks: [] });
  }

  const tracks = data.tracks.items.map((t) => ({
    id: t.id,
    name: t.name,
    artist: t.artists[0].name,
    url: t.external_urls.spotify,
    image: t.album.images[0]?.url
  }));

  res.status(200).json({ tracks });
};
