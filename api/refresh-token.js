import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const { refreshToken } = req.body;

    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", refreshToken);
    params.append("client_id", process.env.SPOTIFY_CLIENT_ID);
    params.append("client_secret", process.env.SPOTIFY_CLIENT_SECRET);

    const token = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      body: params
    }).then(r=>r.json());

    return res.json({ accessToken: token.access_token });
  } catch {
    res.status(500).json({ error: "refresh failed" });
  }
}
