import { NextResponse } from "next/server";

export async function POST(req) {
  const { token, language, mood } = await req.json();

  const q = `${mood} ${language} songs`;

  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=15`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  const data = await res.json();

  if (!data.tracks) {
    return NextResponse.json({ tracks: [] });
  }

  const tracks = data.tracks.items.map((t) => ({
    id: t.id,
    name: t.name,
    artist: t.artists[0].name,
    url: t.external_urls.spotify,
    image: t.album.images[0]?.url
  }));

  return NextResponse.json({ tracks });
}
