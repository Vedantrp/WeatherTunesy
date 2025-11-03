// /api/ai-playlist.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests are supported" });
  }

  const { mood, language } = req.body;
  const hfToken = process.env.HUGGINGFACE_API_KEY;

  if (!hfToken) {
    return res.status(500).json({ error: "Missing Hugging Face API key" });
  }

  try {
    const prompt = `
You are a music recommendation AI. Generate 35 unique songs that match the user's mood and language.

Mood: ${mood?.type || mood}
Language: ${language}

Return a JSON array of songs like:
[
  { "title": "Song Name", "artist": "Artist Name" }
]
Make sure songs are real and match the given language and mood.
`;

    // ✅ New Hugging Face router endpoint (replaces old inference.huggingface.co)
    const response = await fetch("https://router.huggingface.co/hf/api/text-generation", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${hfToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistralai/Mistral-7B-Instruct", // ✅ stable open model
        inputs: prompt,
        parameters: { max_new_tokens: 500, temperature: 0.8 },
      }),
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { generated_text: text };
    }

    // Extract text properly depending on HuggingFace output structure
    const rawOutput = data?.generated_text || data?.[0]?.generated_text || "";

    // Try to parse JSON playlist from AI response
    const jsonStart = rawOutput.indexOf("[");
    const jsonEnd = rawOutput.lastIndexOf("]");
    let playlist = [];

    if (jsonStart !== -1 && jsonEnd !== -1) {
      try {
        playlist = JSON.parse(rawOutput.slice(jsonStart, jsonEnd + 1));
      } catch (e) {
        console.error("Failed to parse playlist:", e);
      }
    }

    if (!playlist.length) {
      playlist = [
        { title: "No songs generated", artist: "AI issue" }
      ];
    }

    return res.status(200).json({ mood, language, playlist });
  } catch (error) {
    console.error("AI generation failed:", error);
    return res.status(500).json({
      error: "AI generation failed",
      details: error.message || error.toString(),
    });
  }
}
