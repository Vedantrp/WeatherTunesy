// /api/ai-playlist.js
export default async function handler(req, res) {
  try {
    const { mood, language } = req.body || {};
    if (!mood || !language)
      return res.status(400).json({ error: "Missing mood or language" });

    const HF_TOKEN = process.env.HUGGINGFACE_API_KEY;
    if (!HF_TOKEN)
      return res.status(500).json({ error: "Missing Hugging Face API key" });

    // 🧠 use a small text model like mistralai/Mixtral-8x7B-Instruct-v0.1 or meta-llama/Llama-3-8b-instruct
    const HF_MODEL = "mistralai/Mixtral-8x7B-Instruct-v0.1";
    const HF_URL = `https://router.huggingface.co/hf-inference/v1/models/${HF_MODEL}`;

    const prompt = `
Generate a list of 35 ${language} songs that fit a ${mood} mood.
Return only valid JSON array like:
[
  {"title": "Song Title", "artist": "Artist Name"},
  ...
]
`;

    const response = await fetch(HF_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 600, temperature: 0.8 },
      }),
    });

    const raw = await response.text();
    console.log("HF raw output:", raw.slice(0, 400));

    const match = raw.match(/\[.*\]/s);
    if (!match)
      return res.status(500).json({
        error: "AI generation failed to produce songs.",
        details: raw.slice(0, 400),
      });

    const playlist = JSON.parse(match[0]);
    if (!Array.isArray(playlist) || !playlist.length)
      throw new Error("Empty or invalid playlist");

    res.status(200).json({ playlist });
  } catch (err) {
    console.error("AI Playlist Error:", err);
    res.status(500).json({ error: "AI playlist generation failed", details: err.message });
  }
}
