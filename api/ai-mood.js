// /api/ai-mood.js
import fetch from "node-fetch";

function fallbackMood({ condition, temp, hour, language, taste }) {
  // Very lightweight "AI-style" generator using weather + time + taste
  const isNight = hour >= 20 || hour <= 6;

  // base mood words by weather
  const base = (() => {
    const c = (condition || "").toLowerCase();
    if (c.includes("rain") || c.includes("drizzle")) return ["lofi", "cozy", "soft"];
    if (c.includes("snow")) return ["calm", "warm", "acoustic"];
    if (c.includes("haze") || c.includes("fog") || c.includes("mist"))
      return ["dreamy", "emotional", "ambient"];
    if (c.includes("clear") || c.includes("sun")) return ["happy", "bright", "chill"];
    if (c.includes("cloud")) return ["soft", "mellow", "indie"];
    return ["balanced", "chill"];
  })();

  // nudge by temperature
  if (temp <= 16) base.push("slow");
  else if (temp >= 31) base.push("energetic");

  // nudge by time
  if (isNight) base.push("late-night");

  // nudge by taste (if exists)
  let topLang = language || "english";
  if (taste?.languages && taste.languages.size) {
    let best = null, max = -1;
    for (const [k, v] of taste.languages) if (v > max) (max = v, best = k);
    if (best) topLang = best;
  }

  const moodText = `${topLang} ${base.slice(0, 3).join(" ")} vibe`;
  // derive audio targets
  const energy =
    base.includes("energetic") ? 0.75 :
    base.includes("calm") || base.includes("soft") ? 0.35 :
    0.55;

  const valence =
    base.includes("happy") || base.includes("bright") ? 0.7 :
    base.includes("emotional") ? 0.35 :
    0.5;

  return { ok: true, moodText, targets: { energy, valence } };
}

export default async function handler(req, res) {
  try {
    const { condition, temp, language = "english", userId, hour } = req.body || {};
    const taste = req.body?.taste || null;

    // Try Gemini first if key present
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      try {
        const prompt = `
Given:
- Weather condition: ${condition}
- Temperature (°C): ${temp}
- Language: ${language}
- Local hour: ${hour}
- (Optional) Taste bias: ${JSON.stringify(taste || {})}

Write a short 3-6 word music mood (no sentences, no punctuation), e.g.:
"emotional bollywood lo-fi", "happy indie pop", "calm acoustic chill".
Also suggest numeric targets between 0 and 1 for: energy, valence.

Return strict JSON:
{ "moodText": "...", "targets": { "energy": 0.00, "valence": 0.00 } }`;

        // v1beta endpoint (stable) – if it fails we fallback
        const resp = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + key,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            })
          }
        );

        if (resp.ok) {
          const j = await resp.json();
          const text = j?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const m = text.match(/\{[\s\S]*\}/);
          if (m) {
            const parsed = JSON.parse(m[0]);
            if (parsed?.moodText && parsed?.targets) {
              return res.json({ ok: true, ...parsed });
            }
          }
        }
      } catch (e) {
        // fall through to fallback
      }
    }

    // Fallback "AI-ish" generator
    const fb = fallbackMood({
      condition,
      temp,
      hour: typeof hour === "number" ? hour : new Date().getHours(),
      language,
      taste
    });
    return res.json(fb);
  } catch (e) {
    console.error("AI-MOOD ERROR:", e);
    return res.status(200).json(fallbackMood({ condition: "Clear", temp: 26, hour: 12, language }));
  }
}
