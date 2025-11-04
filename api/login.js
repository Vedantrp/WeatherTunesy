export const config = {
  runtime: "edge",
};

export default async function handler() {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const redirect_uri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/callback`;

  const scope = [
    "user-read-email",
    "playlist-modify-private",
    "playlist-modify-public",
    "user-read-private"
  ].join(" ");

  const authUrl = 
    `https://accounts.spotify.com/authorize?` +
    `client_id=${client_id}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
    `&scope=${encodeURIComponent(scope)}`;

  return new Response(JSON.stringify({ authUrl }), {
    headers: { "Content-Type": "application/json" },
  });
}
