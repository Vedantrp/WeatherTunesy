// /api/ai-playlist.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests are supported" });
  }

  const { mood = "relaxed", language = "english" } = req.body || {};

  try {
    // 🔑 Ensure Hugging Face API key is available
    const hfToken = process.env.HUGGINGFACE_API_KEY;
    if (!hfToken) {
      console.error("❌ Missing HUGGINGFACE_API_KEY in environment variables");
      return res.status(500).json({ error: "Server misconfiguration: Missing API key" });
    }

    // 🧠 Use a real text-generation model that works with Hugging Face free tier
    const HF_MODEL = "mistralai/Mixtral-8x7B-Instruct-v0.1";

    // 🎯 Creative prompt with randomization
    const prompts = [
      `Suggest 10 trending ${language} songs for a ${mood} mood. Format JSON: [{"title":"Song","artist":"Artist"}]`,
      `Generate 10 modern ${language} songs that match a ${mood} vibe. Only output JSON list [{"title":"Song","artist":"Artist"}].`,
      `List 10 ${language} tracks ideal for ${mood} weather. Return in pure JSON array format [{"title":"Song","artist":"Artist"}].`
    ];
    const prompt = prompts[Math.floor(Math.random() * prompts.length)];

    // 🧩 Send to Hugging Face Inference API
    const response = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hfToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 250, temperature: 0.9 },
      }),
    });

    const textData = await response.text();

    // 🧹 Parse JSON response
    let playlist = [];
    try {
      const jsonMatch = textData.match(/\[.*\]/s);
      if (jsonMatch) {
        playlist = JSON.parse(jsonMatch[0]);
      }
    } catch (err) {
      console.warn("⚠️ Failed to parse JSON from HuggingFace response:", err);
    }

    // 🪄 Fallback list if AI returns nothing
    if (!Array.isArray(playlist) || playlist.length === 0) {
      playlist = [
        { title: "Skyfall", artist: "Adele" },
        { title: "Heat Waves", artist: "Glass Animals" },
        { title: "Stay", artist: "Justin Bieber" },
        { title: "Let It Rain", artist: "Eric Clapton" },
        { title: "Lovely", artist: "Billie Eilish" },
        { title: "Thunder", artist: "Imagine Dragons" },
        { title: "Counting Stars", artist: "OneRepublic" },
        { title: "Blinding Lights", artist: "The Weeknd" },
        { title: "Sunflower", artist: "Post Malone" },
        { title: "Perfect", artist: "Ed Sheeran" },
      ];
    }

    // ✅ Success response
    return res.status(200).json({
      mood,
      language,
      playlist,
    });
  } catch (error) {
    console.error("AI Playlist API Error:", error);
    return res.status(500).json({
      error: "AI playlist generation failed",
      details: error.message,
    });
  }
}
