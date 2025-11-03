// /api/ai-playlist.js
export default async function handler(req, res) {
  try {
    const { mood, language } = req.body;
    if (!mood || !language) {
      return res.status(400).json({ error: "Missing mood or language" });
    }

    // 🔑 Your Hugging Face key
    const HF_TOKEN = process.env.HUGGINGFACE_API_KEY;
    if (!HF_TOKEN) {
      return res.status(500).json({ error: "Missing Hugging Face API key" });
    }

    // 🔥 Query prompt to get diverse 35 songs
    const prompt = `
Generate 35 ${language} songs that match the ${mood} mood. 
Return them as a JSON array where each item has "title" and "artist" keys only.
Make sure the songs are real and diverse.
`;

    const response = await fetch("https://api-inference.huggingface.co/models/gpt2", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 250 },
      }),
    });

    const text = await response.text();
    console.log("Raw HuggingFace output:", text);

    // 🧠 Try to parse any JSON part inside the output
    const match = text.match(/\[.*\]/s);
    if (!match) {
      return res.status(500).json({ error: "AI failed to return song list" });
    }

    const playlist = JSON.parse(match[0]);
    if (!Array.isArray(playlist) || playlist.length === 0) {
      throw new Error("Invalid playlist format");
    }

    res.status(200).json({ playlist });
  } catch (err) {
    console.error("AI Playlist Error:", err);
    res.status(500).json({
      error: "AI playlist generation failed",
      details: err.message,
    });
  }
}
