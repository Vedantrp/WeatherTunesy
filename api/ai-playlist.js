// /api/ai-playlist.js
import fetch from "node-fetch";

const MODEL = "mistralai/Mixtral-8x7B-Instruct-v0.1"; // change if needed
const TARGET_COUNT = 35;

function extractJsonArrayFromText(text) {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start !== -1 && end !== -1 && end > start) {
    try {
      const substr = text.slice(start, end + 1);
      const parsed = JSON.parse(substr);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) { /* ignore */ }
  }
  return null;
}

function parseLinesToSongs(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length).slice(0, TARGET_COUNT);
  const songs = [];
  for (let line of lines) {
    line = line.replace(/^[\d\.\)\-\s]+/, "").trim();
    let parts = line.split(/\s[-–—]\s/);
    if (parts.length < 2) parts = line.split(/\sby\s/i);
    const title = (parts[0] || "").trim();
    const artist = (parts[1] || "").trim();
    if (title && artist) songs.push({ title, artist });
    if (songs.length >= TARGET_COUNT) break;
  }
  return songs;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method !== "POST") return res.status(405).json({ error: "Only POST allowed" });

  const { mood = "relaxed", language = "english" } = req.body || {};
  const HF_TOKEN = process.env.HUGGINGFACE_API_KEY;
  if (!HF_TOKEN) return res.status(500).json({ error: "Missing Hugging Face API key" });

  const HF_URL = `https://router.huggingface.co/hf-inference/v1/models/${MODEL}`;

  const prompt = `
You are a music recommender. Generate ${TARGET_COUNT} songs in ${language} that fit the mood: ${typeof mood === 'object' ? (mood.type || JSON.stringify(mood)) : mood}.
Return strictly a JSON array like:
[
  {"title": "Song Title", "artist": "Artist Name"},
  ...
]
If you cannot return JSON, output one song per line as "Song Title - Artist".
`;

  try {
    const r = await fetch(HF_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 600, temperature: 0.8 } }),
    });

    const raw = await r.text();
    console.log("HF raw:", raw.slice(0,2000));

    let playlist = extractJsonArrayFromText(raw);
    if (!playlist || !playlist.length) {
      playlist = parseLinesToSongs(raw);
    }

    // final fallback: return empty + debug
    if (!playlist || !playlist.length) {
      return res.status(200).json({ mood, language, playlist: [], debug: raw.slice(0,2000) });
    }

    // normalize titles & artists to strings
    playlist = playlist.map(p => {
      if (typeof p === "string") {
        const parts = p.split(/\s-\s/);
        return { title: parts[0]?.trim()||"Unknown", artist: parts[1]?.trim()||"Unknown" };
      }
      return { title: String(p.title || p.name || "Unknown").trim(), artist: String(p.artist || p.author || "Unknown").trim() };
    }).filter(s => s.title && s.artist).slice(0, TARGET_COUNT);

    return res.status(200).json({ mood, language, playlist });
  } catch (err) {
    console.error("AI Playlist Error:", err);
    return res.status(500).json({ error: "AI generation failed", details: err.message });
  }
}
