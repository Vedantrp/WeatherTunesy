// /api/ai-playlist.js
export default async function handler(req, res) {
  try {
    const { mood, language } = req.body || {};
    if (!mood || !language) {
      return res.status(400).json({ error: "Missing mood or language" });
    }

    // Try Hugging Face API
    let playlist = [];

    try {
      const response = await fetch("https://api-inference.huggingface.co/models/gpt2", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: `Suggest 5 popular ${language} songs that fit a ${mood} weather mood. Respond strictly in JSON like this:
          [{"title": "Song name", "artist": "Artist name"}]`,
        }),
      });

      const text = await response.text();

      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) playlist = parsed;
      } catch {
        console.warn("AI did not return valid JSON, fallback triggered.");
      }
    } catch (error) {
      console.error("Hugging Face request failed:", error);
    }

    // 🌍 Smart Fallback Playlists by Language
    const fallbackPlaylists = {
      english: [
        { title: "Here Comes the Sun", artist: "The Beatles" },
        { title: "Sky Full of Stars", artist: "Coldplay" },
        { title: "Viva La Vida", artist: "Coldplay" },
        { title: "Good Life", artist: "OneRepublic" },
        { title: "Happy", artist: "Pharrell Williams" },
      ],
      hindi: [
        { title: "Kun Faya Kun", artist: "A.R. Rahman" },
        { title: "Channa Mereya", artist: "Arijit Singh" },
        { title: "Raabta", artist: "Pritam" },
        { title: "Kabira", artist: "Tochi Raina" },
        { title: "Agar Tum Saath Ho", artist: "Alka Yagnik" },
      ],
      spanish: [
        { title: "Despacito", artist: "Luis Fonsi" },
        { title: "Vivir Mi Vida", artist: "Marc Anthony" },
        { title: "Bailando", artist: "Enrique Iglesias" },
        { title: "Hawái", artist: "Maluma" },
        { title: "Corazón", artist: "Maluma" },
      ],
      korean: [
        { title: "Dynamite", artist: "BTS" },
        { title: "Kill This Love", artist: "BLACKPINK" },
        { title: "Love Scenario", artist: "iKON" },
        { title: "Lovesick Girls", artist: "BLACKPINK" },
        { title: "ETA", artist: "NewJeans" },
      ],
      tamil: [
        { title: "Vaathi Coming", artist: "Anirudh Ravichander" },
        { title: "Why This Kolaveri Di", artist: "Dhanush" },
        { title: "Enjoy Enjaami", artist: "Dhee" },
        { title: "Arabic Kuthu", artist: "Anirudh Ravichander" },
        { title: "Tum Tum", artist: "Sruthy Sasidharan" },
      ],
      telugu: [
        { title: "Butta Bomma", artist: "Armaan Malik" },
        { title: "Oo Antava Oo Oo Antava", artist: "Indravathi Chauhan" },
        { title: "Srivalli", artist: "Sid Sriram" },
        { title: "Jai Lava Kusa", artist: "DSP" },
        { title: "Ramuloo Ramulaa", artist: "Anurag Kulkarni" },
      ],
      french: [
        { title: "Dernière danse", artist: "Indila" },
        { title: "Formidable", artist: "Stromae" },
        { title: "Je te promets", artist: "Johnny Hallyday" },
        { title: "Papaoutai", artist: "Stromae" },
        { title: "La Vie en Rose", artist: "Édith Piaf" },
      ],
    };

    // Use AI result if available, else fallback by language
    if (!playlist || playlist.length === 0) {
      playlist = fallbackPlaylists[language.toLowerCase()] || fallbackPlaylists.english;
    }

    res.status(200).json({ mood, language, playlist });
  } catch (err) {
    console.error("AI Playlist Fatal Error:", err);
    res.status(500).json({ error: "AI generation failed" });
  }
}
