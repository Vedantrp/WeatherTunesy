export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests are supported" });
  }

  const { mood = "relaxed", language = "english" } = req.body || {};

  const prompt = `
  Suggest 10 popular ${language} songs that match a ${mood} mood.
  Return JSON format like this:
  [
    {"title": "Song name", "artist": "Artist name"}
  ]
  `;

  try {
    // 🧠 Use Hugging Face free inference API
    const response = await fetch(
      "https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    const result = await response.json();

    // Extract the generated text
    const text =
      result?.[0]?.generated_text ||
      result?.generated_text ||
      JSON.stringify(result);

    // 🧩 Extract JSON array safely
    const jsonMatch = text.match(/\[.*\]/s);
    if (!jsonMatch) {
      console.error("AI Response (invalid):", text);
      return res
        .status(500)
        .json({ error: "Invalid AI response", raw: text.slice(0, 200) });
    }

    const playlist = JSON.parse(jsonMatch[0]);
    return res.status(200).json({ mood, language, playlist });
  } catch (error) {
    console.error("AI Playlist Error:", error);
    return res
      .status(500)
      .json({ error: "AI generation failed", details: error.message });
  }
}
