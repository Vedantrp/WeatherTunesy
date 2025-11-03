// /api/ai-playlist.js
import fetch from "node-fetch";

/**
 * Robust AI playlist endpoint:
 * - POST { mood, language, limit? }
 * - Tries Hugging Face Router (if HUGGINGFACE_API_KEY present)
 * - Parses JSON or text output
 * - FALLS BACK to curated local song lists (guarantees results)
 */

const DEFAULT_LIMIT = 35;

// Small curated fallback lists (examples). Expand these lists with more songs as you like.
const FALLBACK_DB = {
  english: {
    relaxed: [
      ["Someone Like You", "Adele"], ["Let Her Go", "Passenger"], ["Skinny Love", "Bon Iver"],
      ["The Night We Met", "Lord Huron"], ["Holocene", "Bon Iver"], ["River", "Leon Bridges"],
      ["Say You Won't Let Go", "James Arthur"], ["Lost", "Frank Ocean"], ["Bloom", "The Paper Kites"],
      ["Cherry Wine", "Hozier"], ["Comfortably Numb", "Pink Floyd"], ["Yellow", "Coldplay"],
      ["Hallelujah", "Jeff Buckley"], ["Fix You", "Coldplay"], ["I Will Follow You Into The Dark", "Death Cab for Cutie"],
      ["Ophelia", "The Lumineers"], ["Banana Pancakes", "Jack Johnson"], ["Heartbeats", "José González"],
      ["Fallingforyou", "The 1975"], ["First Day Of My Life", "Bright Eyes"], ["New Slang", "The Shins"],
      ["To Build A Home", "The Cinematic Orchestra"], ["Naked As We Came", "Iron & Wine"], ["Slow Show", "The National"],
      ["All I Want", "Kodaline"], ["Rivers and Roads", "The Head and the Heart"], ["Sparks", "Coldplay"],
      ["Breathe Me", "Sia"], ["The Blower's Daughter", "Damien Rice"], ["Skin", "Rag'n'Bone Man"]
    ],
    upbeat: [
      ["Can’t Stop", "Red Hot Chili Peppers"], ["Shut Up and Dance", "WALK THE MOON"], ["Uptown Funk", "Mark Ronson ft. Bruno Mars"],
      ["Feel It Still", "Portugal. The Man"], ["Adventure of a Lifetime", "Coldplay"], ["Electric Feel", "MGMT"],
      ["Dog Days Are Over", "Florence + The Machine"], ["Rolling in the Deep", "Adele"], ["Counting Stars", "OneRepublic"],
      ["Sweet Disposition", "The Temper Trap"], ["Mr. Brightside", "The Killers"], ["Take On Me", "a-ha"],
      // add more...
    ],
    // ... add other moods
  },
  hindi: {
    relaxed: [
      ["Tum Hi Ho", "Arijit Singh"], ["Agar Tum Saath Ho", "Alka Yagnik & Arijit Singh"],
      ["Tujh Mein Rab Dikhta Hai", "Roop Kumar Rathod"], ["Bol Na Halke Halke", "Jasbir Jassi"],
      ["Phir Le Aaya Dil", "Rekha Bhardwaj"], ["Kun Faya Kun", "A.R. Rahman"],
      ["Saibo", "Shreya Ghoshal & Tochi Raina"], ["Iktara", "Vishal–Shekhar"],
      ["Aashiyan", "Rahat Fateh Ali Khan"], ["Jeene Laga Hoon", "Atif Aslam"],
      // add more...
    ],
    upbeat: [
      ["Gallan Goodiyaan", "Dil Dhadakne Do"], ["London Thumakda", "Queen"], ["Kar Gayi Chull", "Kapoor & Sons"],
      ["Bom Diggy", "Ritviz"], ["Kala Chashma", "Baar Baar Dekho"],
      // add more...
    ]
  },
  spanish: {
    relaxed: [
      ["La Camisa Negra", "Juanes"], ["Bachata en Fukuoka", "Carlos Vives"], ["Rayando el Sol", "Maná"],
      // ...
    ],
    upbeat: [
      ["Despacito", "Luis Fonsi"], ["Bailando", "Enrique Iglesias"], ["Taki Taki", "DJ Snake"],
      // ...
    ]
  },
  korean: {
    upbeat: [
      ["Dynamite", "BTS"], ["Gangnam Style", "PSY"], ["Bang Bang Bang", "BIGBANG"],
    ],
    relaxed: [
      ["Spring Day", "BTS"], ["Palette", "IU"], ["Some", "BOL4 & Soyou"],
    ]
  }
  // Add more languages & moods as you collect them
};

function sampleFallback(language = "english", mood = "balanced", limit = DEFAULT_LIMIT) {
  const lang = language?.toLowerCase() || "english";
  const moodKey = (mood && mood.type) ? mood.type.toLowerCase() : (mood && typeof mood === "string" ? mood.toLowerCase() : "balanced");
  const langDB = FALLBACK_DB[lang] || FALLBACK_DB["english"];
  const pool = langDB[moodKey] || Object.values(langDB).flat();
  // flatten to unique string pairs
  const unique = pool.map(([t, a]) => ({ title: t, artist: a }));
  // shuffle
  for (let i = unique.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unique[i], unique[j]] = [unique[j], unique[i]];
  }
  // repeat if not enough until we hit limit (with rotate)
  const out = [];
  let idx = 0;
  while (out.length < limit) {
    if (unique.length === 0) break;
    out.push(unique[idx % unique.length]);
    idx++;
  }
  // ensure unique by title-artist
  const seen = new Set();
  const final = [];
  for (const s of out) {
    const key = (s.title + "|" + s.artist).toLowerCase();
    if (!seen.has(key)) {
      final.push(s);
      seen.add(key);
      if (final.length >= limit) break;
    }
  }
  return final;
}

async function callHFRouter(prompt, hfToken, model = "mistralai/Mistral-7B-Instruct") {
  // Try router endpoint (recommended). Some HF accounts may not have router set; this will try and return text.
  const routerUrl = "https://api-inference.huggingface.co/models/" + encodeURIComponent(model);
  // We use the standard inference path here. If your account requires the router domain, replace accordingly.
  const resp = await fetch(routerUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${hfToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 500, temperature: 0.8 } }),
  });
  const text = await resp.text();
  return { ok: resp.ok, status: resp.status, text };
}

function parseSongsFromText(rawText, limit = DEFAULT_LIMIT) {
  if (!rawText || !rawText.trim()) return [];
  const results = [];

  // Try to extract a JSON array first (safe)
  const jsonMatch = rawText.match(/\[([\s\S]*?)\]/);
  if (jsonMatch) {
    try {
      const arr = JSON.parse(jsonMatch[0]);
      if (Array.isArray(arr)) {
        for (const item of arr) {
          if (!item) continue;
          const title = (typeof item === "string") ? item : (item.title || item.name || item.track || item.song);
          const artist = item.artist || item.artists || item.singer || item.artist_name || item.by;
          if (title && artist) results.push({ title: String(title).trim(), artist: String(artist).trim() });
          if (results.length >= limit) break;
        }
        if (results.length) return results;
      }
    } catch (e) {
      // continue to text parsing fallback
    }
  }

  // Normalize lines and remove numbering
  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && l.length > 2)
    .slice(0, limit * 3);

  // Patterns: "Title - Artist" or "1. Title - Artist" or "Title by Artist"
  for (const line of lines) {
    // remove leading numbering "1." or "1)"
    const clean = line.replace(/^[\d\.\)\-\s]+/, "").trim();
    // try " - " first
    if (clean.includes(" - ")) {
      const parts = clean.split(" - ");
      const title = parts.shift().trim();
      const artist = parts.join(" - ").trim();
      if (title && artist) results.push({ title, artist });
    } else {
      // try "by"
      const byMatch = clean.match(/(.+)\sby\s(.+)/i);
      if (byMatch) {
        results.push({ title: byMatch[1].trim(), artist: byMatch[2].trim() });
      } else {
        // fallback: split by last comma (maybe "Title, Artist")
        const commaParts = clean.split(",");
        if (commaParts.length >= 2) {
          const artist = commaParts.pop().trim();
          const title = commaParts.join(",").trim();
          if (title && artist) results.push({ title, artist });
        } else {
          // last resort: put whole line as title, unknown artist
          results.push({ title: clean, artist: "Unknown Artist" });
        }
    }
    }
    if (results.length >= limit) break;
  }

  // Deduplicate by title/artist
  const seen = new Set();
  const out = [];
  for (const s of results) {
    const k = (s.title + "|" + s.artist).toLowerCase();
    if (!seen.has(k)) {
      out.push(s);
      seen.add(k);
      if (out.length >= limit) break;
    }
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST supported" });

  const { mood = "balanced", language = "english", limit = DEFAULT_LIMIT } = req.body || {};

  const hfToken = process.env.HUGGINGFACE_API_KEY;

  // Build a concise prompt
  const shortPrompt = `Generate ${limit} unique songs that fit the mood "${typeof mood === "string" ? mood : (mood.type || "balanced")}" and language "${language}".
Return only song lines in one of these formats (preferably a JSON array or "Title - Artist"):
[
  { "title": "Song Name", "artist": "Artist Name" }
]
If JSON is not possible, list each song on a new line as "Title - Artist". Do not add extra commentary.`;

  // 1) Try HF if API key present
  if (hfToken) {
    try {
      const hfResp = await callHFRouter(shortPrompt, hfToken);
      if (hfResp && hfResp.ok) {
        const raw = hfResp.text;
        // Some HF responses are arrays of objects; some are raw text
        // Try to parse songs
        const parsed = parseSongsFromText(raw, limit);
        if (parsed && parsed.length >= Math.min(5, limit)) {
          return res.status(200).json({ mood, language, playlist: parsed.slice(0, limit) });
        }
        // if parsed insufficient, continue to fallback
      } else {
        // non-ok response — include details in logs
        console.warn("HF call failed", hfResp && hfResp.status);
      }
    } catch (err) {
      console.error("HF router error:", err?.message || err);
      // fall through to fallback
    }
  }

  // 2) FALLBACK: Use curated DB to guarantee output
  try {
    const fallback = sampleFallback(language, mood, limit);
    if (fallback && fallback.length) {
      return res.status(200).json({ mood, language, playlist: fallback.slice(0, limit), fallback: true });
    }
  } catch (err) {
    console.error("Fallback generation error:", err);
  }

  // 3) Last resort: return empty with info
  return res.status(200).json({
    mood,
    language,
    playlist: [{ title: "No songs generated", artist: "AI issue" }],
    details: "HF not available and fallback failed"
  });
}
