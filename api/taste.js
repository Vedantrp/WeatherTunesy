// /api/taste.js
import { dbConnect, Taste } from "./_db.js";

export default async function handler(req, res) {
  try {
    await dbConnect(); // may be null if no URI; we handle that below

    const { method } = req;
    if (method === "GET") {
      const { userId } = req.query;
      if (!userId) return res.status(400).json({ error: "userId required" });
      if (!Taste) return res.json({ taste: null });

      const taste = await Taste.findOne({ userId });
      return res.json({ taste });
    }

    if (method === "POST") {
      const { userId, city, language, mood, energy, valence } = req.body || {};
      if (!userId) return res.status(400).json({ error: "userId required" });

      if (!Taste) return res.json({ ok: true, note: "Taste disabled (no DB)" });

      const doc =
        (await Taste.findOne({ userId })) ||
        new Taste({ userId, languages: {}, moods: {}, cities: {} });

      // increment counters
      if (language) doc.languages.set(language, (doc.languages.get(language) || 0) + 1);
      if (mood) doc.moods.set(mood, (doc.moods.get(mood) || 0) + 1);
      if (city) doc.cities.set(city.toLowerCase(), (doc.cities.get(city.toLowerCase()) || 0) + 1);

      // rolling averages for energy/valence
      if (typeof energy === "number" && typeof valence === "number") {
        const n = doc.samples || 0;
        doc.preferred_energy = (doc.preferred_energy * n + energy) / (n + 1);
        doc.preferred_valence = (doc.preferred_valence * n + valence) / (n + 1);
        doc.samples = n + 1;
      }

      await doc.save();
      return res.json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("TASTE API ERROR:", e);
    return res.status(500).json({ error: "Taste API failed" });
  }
}
