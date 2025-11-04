export default async function handler(req, res) {
  const { token, userId, tracks, mood } = req.body;

  const create = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `WeatherTunes – ${mood}`,
      description: "Created by WeatherTunes"
    })
  });

  const data = await create.json();

  await fetch(`https://api.spotify.com/v1/playlists/${data.id}/tracks`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ uris: tracks })
  });

  res.json({ url: data.external_urls.spotify });
}
