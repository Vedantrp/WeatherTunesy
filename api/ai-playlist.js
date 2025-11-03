// /api/ai-playlist.js
export default async function handler(req, res) {
  try {
    const { mood, language } = req.body || {};
    if (!mood || !language) {
      return res.status(400).json({ error: "Missing mood or language" });
    }

    // Try Hugging Face or fallback to static logic
    let playlist = [];

    try {
      const hfRes = await fetch("https://api-inference.huggingface.co/models/gpt2", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: `Suggest 5 ${language} songs for a ${mood} weather mood. Return JSON like [{title:'', artist:''}]`,
        }),
      });

      const text = await hfRes.text();

      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) playlist = parsed;
      } catch {
        console.warn("AI did not return JSON, using fallback");
      }
    } catch (err) {
      console.error("Hugging Face API Error:", err);
    }

    // 🔥 Fallback playlist if AI fails
    if (!playlist || playlist.length === 0) {
      playlist = [
        { title: "Sky Full of Stars", artist: "Coldplay" },
        { title: "Here Comes the Sun", artist: "The Beatles" },
        { title: "Good Life", artist: "OneRepublic" },
        { title: "Electric Feel", artist: "MGMT" },
        { title: "Counting Stars", artist: "OneRepublic" },
      ];
    }

    res.status(200).json({ mood, language, playlist });
  } catch (error) {
    console.error("AI Playlist Error:", error);
    res.status(500).json({ error: "AI generation failed" });
  }
}
