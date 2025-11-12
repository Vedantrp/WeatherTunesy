// /api/_db.js
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn("⚠️ MONGODB_URI is not set. Taste memory will be disabled.");
}

let cached = global._mongoose;
if (!cached) cached = global._mongoose = { conn: null, promise: null };

export async function dbConnect() {
  if (!MONGODB_URI) return null;

  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, { dbName: "weathertunes" })
      .then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

const tasteSchema = new mongoose.Schema(
  {
    userId: { type: String, index: true },
    // simple counters
    languages: { type: Map, of: Number, default: {} },
    moods: { type: Map, of: Number, default: {} },
    cities: { type: Map, of: Number, default: {} },
    // rolling preference averages
    preferred_energy: { type: Number, default: 0.5 },
    preferred_valence: { type: Number, default: 0.5 },
    samples: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const Taste =
  mongoose.models.Taste || mongoose.model("Taste", tasteSchema);
