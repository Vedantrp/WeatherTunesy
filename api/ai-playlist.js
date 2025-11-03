// /api/ai-playlist.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Only POST allowed" });

  try {
    const { mood = "relaxed", language = "english" } = req.body;

    const hfToken = process.env.HUGGINGFACE_API_KEY;
    if (!hfToken) {
      throw new Error("Missing HUGGINGFACE_API_KEY in environment");
    }

    // 🎵 Make the prompt slightly random each time for variation
    const variations = [
      `Suggest 10 ${language} songs for a ${mood} weather mood. Return JSON array [{title, artist}].`,
      `Generate 10 trending ${language} songs that match a ${mood} vibe. Output JSON array [{title, artist}].`,
      `List 10 ${language} songs ideal for a ${mood} day. Only return JSON like [{"title":"...","artist":"..."}].`,
    ];
    const prompt = variations[Math.floor(Math.random() * variations.length)];

    // 🧠 Call Hugging Face text-generation model
    const response = await fetch(
      "https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    const result = await response.json();

    // 🔍 Parse and clean up AI response
    const text =
      result?.generated_text ||
      result?.[0]?.generated_text ||
      JSON.stringify(result);

    const jsonMatch = text.match(/\[.*\]/s);
    let playlist = [];

    if (jsonMatch) {
      try {
        playlist = JSON.parse(jsonMatch[0]);
      } catch {
        playlist = [];
      }
    }

    // If AI returned nothing, fallback to small seed list (temporary)
    if (!playlist || playlist.length === 0) {
      playlist = [
        { title: "Let It Rain", artist: "Eric Clapton" },
        { title: "Sunshine", artist: "OneRepublic" },
        { title: "Skyfall", artist: "Adele" },
        { title: "Shape of You", artist: "Ed Sheeran" },
        { title: "Stay", artist: "Justin Bieber" },
      ];
    }

    res.status(200).json({ mood, language, playlist });
  } catch (err) {
    console.error("AI Playlist Error:", err);
    res.status(500).json({
      error: "AI playlist generation failed",
      details: err.message,
    });
  }
}
