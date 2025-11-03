// /api/search-tracks.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { accessToken, query, limit = 10 } = req.body;

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const data = await response.json();

    if (data.error) {
      return res.status(data.error.status || 400).json({ error: data.error.message });
    }

    const tracks = (data.tracks?.items || []).map((t) => ({
      name: t.name,
      artist: t.artists.map((a) => a.name).join(", "),
      uri: t.uri,
      popularity: t.popularity,
      url: t.external_urls.spotify,
    }));

    res.status(200).json({ tracks });
  } catch (error) {
    console.error("Search Tracks Error:", error);
    res.status(500).json({ error: "Failed to search tracks" });
  }
}
