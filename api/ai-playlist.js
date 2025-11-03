// /api/ai-playlist.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini client once
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * getAiPlaylist()
 * Generate a playlist of songs based on mood and language.
 * Can be imported by other APIs (like weather-playlist.js).
 */
export async function getAiPlaylist(mood = "relaxed", language = "english") {
  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ Missing GEMINI_API_KEY in environment variables");
    return [];
  }

  try {
    const prompt = `
      Suggest 10 popular ${language} songs that match a ${mood} mood.
      Return strictly in JSON array format:
      [
        { "title": "Song Name", "artist": "Artist Name" },
        ...
      ]
    `;

 const model = genAI.getGenerativeModel({ model: "gemini-pro" });
const result = await model.generateContent(prompt);
const text = await result.response.text();


    // Try to extract JSON safely
    const jsonMatch = text.match(/\[.*\]/s);
    if (!jsonMatch) {
      console.warn("⚠️ Gemini response was not valid JSON:", text);
      return [];
    }

    let playlist;
    try {
      playlist = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error("⚠️ Failed to parse Gemini JSON:", parseErr);
      playlist = [];
    }

    // Normalize the data to {title, artist}
    return playlist
      .filter((item) => item.title && item.artist)
      .map((s) => ({
        title: s.title.trim(),
        artist: s.artist.trim(),
      }));
  } catch (error) {
    console.error("AI Playlist Error:", error);
    return [];
  }
}

/**
 * Default API route handler
 * Allows users to POST { mood, language } directly to /api/ai-playlist
 */
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ error: "Only POST requests are supported" });
    }

    const { mood, language } = req.body || {};
    const playlist = await getAiPlaylist(mood || "relaxed", language || "english");

    res.status(200).json({ mood, language, playlist });
  } catch (error) {
    console.error("AI Playlist API Error:", error);
    res.status(500).json({ error: "Failed to generate AI playlist" });
  }
}



