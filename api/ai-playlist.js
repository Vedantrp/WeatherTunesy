// /api/ai-playlist.js
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end(); // Handle preflight requests
  }

  // ...rest of your logic below
}

import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST requests allowed" });
    }

    const { mood = "relaxed", language = "english" } = req.body || {};

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY missing in environment" });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // ✅ Correct model for public API (as of late 2025)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `
      Generate a list of 10 popular ${language} songs that fit a ${mood} mood.
      Return JSON in this exact format:
      [
        {"title": "Song Name", "artist": "Artist Name"},
        {"title": "Another Song", "artist": "Artist Name"}
      ]
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Try to safely parse JSON from model text output
    const jsonMatch = text.match(/\[.*\]/s);
    let playlist = [];
    if (jsonMatch) {
      try {
        playlist = JSON.parse(jsonMatch[0]);
      } catch {
        console.warn("Gemini returned invalid JSON:", text);
      }
    }

    // Basic structure enforcement
    playlist = (playlist || [])
      .filter((s) => s.title && s.artist)
      .map((s) => ({
        title: s.title.trim(),
        artist: s.artist.trim(),
      }));

    // If still empty, add fallback
    if (playlist.length === 0) {
      playlist = [
        { title: "Skyfall", artist: "Adele" },
        { title: "Lovely", artist: "Billie Eilish" },
        { title: "Summertime Sadness", artist: "Lana Del Rey" },
      ];
    }

    res.status(200).json({ mood, language, playlist });
  } catch (error) {
    console.error("AI Playlist Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate playlist" });
  }
}

