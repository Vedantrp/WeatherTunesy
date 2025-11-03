// /api/ai-playlist.js
import fetch from "node-fetch";

const MODEL = "mistralai/Mistral-7B-Instruct"; // good general instruction model (change if you prefer)
const MAX_TRIES = 2; // number of attempts to get valid output
const TARGET_COUNT = 35;

function extractJsonArrayFromText(text) {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start !== -1 && end !== -1 && end > start) {
    try {
      const substr = text.slice(start, end + 1);
      const parsed = JSON.parse(substr);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      // fall through to text fallback
    }
  }
  return null;
}

function parseLinesToSongs(text) {
  // Split into lines, clean, and try to parse "Title - Artist" per line
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length && !/^(here are|suggested|list)/i.test(l))
    .slice(0, TARGET_COUNT);

  const songs = [];
  for (let line of lines) {
    // remove leading numbering like "1. " or "• "
    line = line.replace(/^[\d\.\)\-\s]+/, "").trim();
    // split by " - " or " — " or " – " or " by "
    let parts = line.split(/\s[-–—]\s/);
    if (parts.length < 2) {
      // try " — " unicode or " by " fallback
      parts = line.split(/\sby\s/i);
    }
    const title = (parts[0] || "").trim();
    const artist = (parts[1] || "").trim();

    if (title && artist) {
      songs.push({ title, artist });
    } else {
      // if can't split, attempt to split by last dash or comma
      const lastDash = line.lastIndexOf("-");
      if (lastDash > 5) {
        const t = line.slice(0, lastDash).trim();
        const a = line.slice(lastDash + 1).trim();
        if (t && a) songs.push({ title: t, artist: a });
      }
    }
    if (songs.length >= TARGET_COUNT) break;
  }
  return songs;
}

async function callRouterHF(prompt, hfToken) {
  // router.huggingface.co/hf/api/text-generation is one route; some accounts use different router paths.
  // We'll attempt a modern router endpoint first.
  const routerUrl = "https://router.huggingface.co/hf/api/text-generation";
  const body = {
    model: MODEL,
    inputs: prompt,
    parameters: { max_new_tokens: 600, temperature: 0.8 },
  };

  const resp = await fetch(routerUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${hfToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  return { ok: resp.ok, status: resp.status, text };
}

async function callInferenceHF(prompt, hfToken) {
  // fallback older endpoint (some accounts still use model inference path)
  const inferenceUrl = `https://api-inference.huggingface.co/models/${MODEL}`;
  const resp = await fetch(inferenceUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${hfToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 600, temperature: 0.8 } }),
  });
  const text = await resp.text();
  return { ok: resp.ok, status: resp.status, text };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST allowed" });

  const { mood = "relaxed", language = "english" } = req.body || {};
  const hfToken = process.env.HUGGINGFACE_API_KEY;

  if (!hfToken) {
    return res.status(500).json({ error: "Missing Hugging Face API key in env" });
  }

  // Strong prompt: ask for JSON array first, but accept plain lists
  const prompt = `
You are a helpful music recommender. Generate ${TARGET_COUNT} unique, real songs that fit the mood and language.

Mood: ${typeof mood === "object" ? (mood.type || JSON.stringify(mood)) : mood}
Language: ${language}

Return the result as a JSON array ONLY if possible, like:
[
  { "title": "Song Title", "artist": "Artist Name" },
  ...
]

If you cannot output JSON, output one song per line in the format:
Song Title - Artist Name

Do not include extra commentary or explanations. Use real and popular songs matching the language.
`;

  // Try multiple attempts to get good output
  let lastText = "";
  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    let result;
    try {
      // try router first
      result = await callRouterHF(prompt, hfToken);
      if (!result.ok) {
        // try inference fallback
        result = await callInferenceHF(prompt, hfToken);
      }
    } catch (err) {
      console.error("HF call error:", err);
      result = { ok: false, status: 0, text: err.message || String(err) };
    }

    lastText = result.text || "";
    // attempt parse JSON array inside output
    let playlist = extractJsonArrayFromText(lastText);
    if (playlist && playlist.length) {
      // normalize entries
      playlist = playlist.map(p => {
        if (typeof p === "string") {
          const parts = p.split(/\s-\s/);
          return { title: parts[0]?.trim() || "Unknown", artist: parts[1]?.trim() || "Unknown" };
        }
        return { title: String(p.title || p.name || "Unknown"), artist: String(p.artist || p.author || p.singer || "Unknown") };
      }).filter(s => s.title && s.artist);
      if (playlist.length) {
        return res.status(200).json({ mood, language, playlist: playlist.slice(0, TARGET_COUNT) });
      }
    }

    // if JSON failed, try parsing lines
    const parsed = parseLinesToSongs(lastText);
    if (parsed && parsed.length >= 5) {
      // if we got at least 5 parsed lines, accept them (preferably we want 35, but partial is better than nothing)
      return res.status(200).json({ mood, language, playlist: parsed.slice(0, TARGET_COUNT) });
    }

    // if not acceptable, try again (loop)
    console.warn(`AI attempt ${attempt} produced inadequate output (status ${result.status}) — trying again`);
  }

  // After retries, return raw text for debugging plus an empty playlist indicator
  console.error("AI generation failed to produce songs. Last raw output:", lastText.slice(0, 2000));
  return res.status(200).json({
    mood,
    language,
    playlist: [],
    debug: { message: "No valid songs parsed from AI", raw: lastText.slice(0, 2000) },
  });
}
