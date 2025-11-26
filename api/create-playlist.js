import { NextResponse } from "next/server";

export async function POST(req) {
  const { token, userId, name, trackIds } = await req.json();

  // Create playlist
  const r1 = await fetch(
    `https://api.spotify.com/v1/users/${userId}/playlists`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        description: "WeatherTunes playlist",
        public: false
      })
    }
  );

  const playlist = await r1.json();

  if (!playlist.id) {
    return NextResponse.json({ error: "Failed to create playlist" }, { status: 400 });
  }

  const uris = trackIds.map((id) => `spotify:track:${id}`);

  await fetch(
    `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ uris })
    }
  );

  return NextResponse.json({
    id: playlist.id,
    url: playlist.external_urls.spotify
  });
}
