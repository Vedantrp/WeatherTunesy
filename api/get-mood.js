export default async function handler(req, res) {
  try {
    const { weather, city } = req.body;
    const apiKey = process.env.GOOGLE_API_KEY;

    const prompt = `
Based on this weather: "${weather}"
and city = ${city},
give:
1) Mood
2) 3 matching music genres
3) Only one language term (no mixing)
Format JSON:
{"mood":"", "genres":["",""], "language":""}
    `;

    const r = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateText?key=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      }
    );

    const data = await r.json();
    const text = data.candidates?.[0]?.output_text || "{}";
    const json = JSON.parse(text);

    res.status(200).json(json);
  } catch (err) {
    res.status(500).json({ error: "AI failed" });
  }
}
