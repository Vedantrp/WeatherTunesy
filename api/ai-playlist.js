// /api/ai-playlist.js
import fetch from "node-fetch";

const HF_MODEL = "mistralai/Mixtral-8x7B-Instruct-v0.1"; // good instruct model; change if needed

function generateFallbackPlaylist(language, mood, count = 35) {
  // A small library of representative songs per language to mix and rotate from.
  const seeds = {
    english: [
      { title: "Here Comes the Sun", artist: "The Beatles" },
      { title: "Blinding Lights", artist: "The Weeknd" },
      { title: "Counting Stars", artist: "OneRepublic" },
      { title: "Levitating", artist: "Dua Lipa" },
      { title: "Adventure of a Lifetime", artist: "Coldplay" },
      { title: "Viva La Vida", artist: "Coldplay" },
      { title: "Happy", artist: "Pharrell Williams" },
      { title: "Shape of You", artist: "Ed Sheeran" },
      { title: "Sunflower", artist: "Post Malone" },
      { title: "Heat Waves", artist: "Glass Animals" },
    ],
    hindi: [
      { title: "Tum Hi Ho", artist: "Arijit Singh" },
      { title: "Kesariya", artist: "Arijit Singh" },
      { title: "Channa Mereya", artist: "Arijit Singh" },
      { title: "Raabta", artist: "Arijit Singh" },
      { title: "Apna Bana Le", artist: "Arijit Singh" },
      { title: "Tera Ban Jaunga", artist: "Akhil Sachdeva" },
      { title: "Kun Faya Kun", artist: "A.R. Rahman" },
      { title: "Agar Tum Saath Ho", artist: "Alka Yagnik & Arijit Singh" },
      { title: "Shayad", artist: "Arijit Singh" },
      { title: "Tum Se Hi", artist: "Mohit Chauhan" },
    ],
    spanish: [
      { title: "Despacito", artist: "Luis Fonsi" },
      { title: "Vivir Mi Vida", artist: "Marc Anthony" },
      { title: "Bailando", artist: "Enrique Iglesias" },
      { title: "Hawái", artist: "Maluma" },
      { title: "Corazón", artist: "Maluma" },
      { title: "La Bicicleta", artist: "Carlos Vives" },
      { title: "Calma", artist: "Pedro Capó" },
      { title: "Dákiti", artist: "Bad Bunny" },
      { title: "Tusa", artist: "Karol G" },
      { title: "Felices los 4", artist: "Maluma" },
    ],
    korean: [
      { title: "Dynamite", artist: "BTS" },
      { title: "Butter", artist: "BTS" },
      { title: "Kill This Love", artist: "BLACKPINK" },
      { title: "Love Scenario", artist: "iKON" },
      { title: "Ditto", artist: "NewJeans" },
      { title: "Pink Venom", artist: "BLACKPINK" },
      { title: "Lovesick Girls", artist: "BLACKPINK" },
      { title: "Shut Down", artist: "BLACKPINK" },
      { title: "ETA", artist: "NewJeans" },
      { title: "Peaches", artist: "BTS" },
    ],
    tamil: [
      { title: "Vaathi Coming", artist: "Anirudh Ravichander" },
      { title: "Enjoy Enjaami", artist: "Dhee" },
      { title: "Arabic Kuthu", artist: "Anirudh Ravichander" },
      { title: "Rowdy Baby", artist: "Dhanush" },
      { title: "Why This Kolaveri Di", artist: "Dhanush" },
      { title: "Aaluma Doluma", artist: "Anirudh" },
      { title: "Pudhu Metro Rail", artist: "Anirudh" },
      { title: "Naan Pizhaippeno", artist: "Sid Sriram" },
      { title: "Sodakku", artist: "Anirudh" },
      { title: "Surviva", artist: "Anirudh" },
    ],
    telugu: [
      { title: "Butta Bomma", artist: "Armaan Malik" },
      { title: "Srivalli", artist: "Sid Sriram" },
      { title: "Ramuloo Ramulaa", artist: "Anurag Kulkarni" },
      { title: "Oo Antava", artist: "Indravathi Chauhan" },
      { title: "Samajavaragamana", artist: "Sid Sriram" },
      { title: "Mind Block", artist: "Jassie Gift" },
      { title: "Naatu Naatu", artist: "M.M. Keeravani" },
      { title: "Butta Bomma - Remix", artist: "Various" },
      { title: "Seeti Maar", artist: "Gopichand" },
      { title: "Dimaak Kharaab", artist: "Devi Sri Prasad" },
    ],
    french: [
      { title: "Dernière danse", artist: "Indila" },
      { title: "Formidable", artist: "Stromae" },
      { title: "Papaoutai", artist: "Stromae" },
      { title: "La Vie en Rose", artist: "Édith Piaf" },
      { title: "Je te promets", artist: "Johnny Hallyday" },
      { title: "J'en ai marre", artist: "Alizée" },
      { title: "Je vole", artist: "Louane" },
      { title: "Tous les mêmes", artist: "Stromae" },
      { title: "Dernière danse", artist: "Indila" },
      { title: "À tout à l'heure", artist: "Benjamin Biolay" },
    ],
  };

  const pool = seeds[language.toLowerCase()] || seeds.english;
  const out = [];
  // rotate and slightly vary to reach `count`
  for (let i = 0; i < count; i++) {
    const base = pool[i % pool.length];
    out.push({
      title: `${base.title}${i >= pool.length ? ` (Alt ${Math.floor(i / pool.length)})` : ""}`,
      artist: base.artist,
      language,
    });
  }
  return out;
}

export default async function handler(req, res) {
  // CORS headers so it works cross-origin if needed
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests are supported" });
  }

  try {
    const { mood = "relaxed", language = "english" } = req.body || {};
    const hfToken = process.env.HUGGINGFACE_API_KEY;
    if (!hfToken) {
      console.warn("No HF token found — returning fallback playlist");
      const fallback = generateFallbackPlaylist(language, mood, 35);
      return res.status(200).json({ mood, language, playlist: fallback });
    }

    // Make prompt ask for 35 items and include language field
    const prompt = `
Suggest 35 ${language} songs that match a ${mood} mood.
Return ONLY a JSON array with items that have "title", "artist" and "language" fields, e.g.:
[
  {"title":"Song title","artist":"Artist name","language":"${language}"},
  ...
]
Do not include extra commentary.
`;

    // Use Mixtral or another instruct-style model — increase max tokens enough
    const model = HF_MODEL;
    const reqBody = {
      inputs: prompt,
      parameters: { max_new_tokens: 800, temperature: 0.9, top_k: 50 },
    };

    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hfToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reqBody),
    });

    const text = await response.text();

    // Try to extract JSON array
    let playlist = [];
    try {
      const jsonMatch = text.match(/\[.*\]/s);
      if (jsonMatch) {
        playlist = JSON.parse(jsonMatch[0]);
      } else {
        // Sometimes HF wraps result differently -> attempt to parse if it's an object
        const tryParse = JSON.parse(text);
        if (Array.isArray(tryParse)) playlist = tryParse;
      }
    } catch (err) {
      console.warn("Failed to parse HF response as JSON:", err);
      playlist = [];
    }

    // Validate and normalize playlist
    playlist = (playlist || [])
      .filter((s) => s && (s.title || s.name) && (s.artist || s.singer || s.by))
      .map((s) => {
        const title = (s.title || s.name || "").toString().trim();
        const artist = (s.artist || s.singer || s.by || "").toString().trim();
        const lang = s.language || language;
        return { title, artist, language: lang };
      });

    // If model didn't return 35, fill via fallback generator (ensures min 35)
    if (!Array.isArray(playlist) || playlist.length < 35) {
      const needed = Math.max(0, 35 - (playlist.length || 0));
      const fallback = generateFallbackPlaylist(language, mood, Math.max(35, playlist.length + needed));
      // prefer model items first, then fallback to fill to 35
      const combined = [...(playlist || []), ...fallback];
      playlist = combined.slice(0, Math.max(35, combined.length));
    }

    return res.status(200).json({ mood, language, playlist });
  } catch (err) {
    console.error("AI playlist fatal:", err);
    // final fallback
    const fallback = generateFallbackPlaylist("english", "relaxed", 35);
    return res.status(200).json({ mood: "relaxed", language: "english", playlist: fallback });
  }
}
