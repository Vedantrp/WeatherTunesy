export default async function handler(req, res) {
  try {
    const { city, mood, language } = req.body;

    const text = `
      Weather update for ${city}.
      Mood: ${mood}. Language: ${language}.
      Give a short, fun DJ intro, desi Gen-Z style if Hindi, classy vibe for English.
      Avoid long lines. No weather details again.
      Example for Hindi:
      "Mumbai ka vibe full cozy! Chill mode on — lofi Bollywood aa raha!"
      Example for English:
      "Perfect cozy vibes today — serving smooth indie pop magic!"
    `;

    // Call Gemini API - PLACEHOLDER URL
    const ai = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateText?key=" + process.env.GEMINI_API_KEY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: text })
    }).then(r => r.json());

    const intro = ai.candidates?.[0]?.output_text || "Vibes loading...";

    // Convert to speech - Google TTS
    const tts = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text: intro },
        voice: { languageCode: "en-US", name: "en-US-Neural2-C" },
        audioConfig: { audioEncoding: "MP3" }
      })
    }).then(r => r.json());

    res.json({ intro, audio: tts.audioContent });

  } catch (e) {
    return res.status(500).json({ error: "DJ voice failed" });
  }
}
