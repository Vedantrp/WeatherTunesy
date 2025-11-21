// components/WeatherTunesScreen.tsx
"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

type WeatherMood = "sunny" | "cloudy" | "rainy" | "storm" | "snow";

interface Track {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  energy: number; // 0–1
  moodTag: string;
}

interface WeatherTunesScreenProps {
  city: string;
  temperature: number;
  weatherMood: WeatherMood;
  isNight: boolean;
  tracks: Track[];
  loading?: boolean;
}

export default function WeatherTunesScreen(props: WeatherTunesScreenProps) {
  const {
    city,
    temperature,
    weatherMood,
    isNight,
    tracks,
    loading = false,
  } = props;

  const accent = useMemo(() => {
    switch (weatherMood) {
      case "sunny":
        return { from: "#f97316", glow: "#fed7aa", label: "Sunny & Bright" };
      case "cloudy":
        return { from: "#38bdf8", glow: "#e0f2fe", label: "Soft & Cloudy" };
      case "rainy":
        return { from: "#6366f1", glow: "#c7d2fe", label: "Rainy & Cozy" };
      case "storm":
        return { from: "#a855f7", glow: "#e9d5ff", label: "Stormy & Intense" };
      case "snow":
        return { from: "#7dd3fc", glow: "#e0f2fe", label: "Cold & Calm" };
      default:
        return { from: "#6366f1", glow: "#c7d2fe", label: "Chill" };
    }
  }, [weatherMood]);

  const timeLabel = isNight ? "Tonight" : "Today";

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100 font-body">
      {/* Animated gradient background */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-40 opacity-60 blur-3xl"
        style={{
          backgroundImage: `radial-gradient(circle at 10% 20%, ${accent.from} 0, transparent 60%), radial-gradient(circle at 80% 80%, ${accent.glow} 0, transparent 55%)`,
        }}
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 0.85, scale: 1 }}
        transition={{ duration: 1.4, ease: "easeOut" }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-4 pb-10 pt-6 md:px-8 md:pt-10">
        {/* Top bar */}
        <header className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-400 to-indigo-500 text-xs shadow-lg shadow-sky-500/40">
              ♪
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-lg tracking-wide">
                WeatherTunes
              </span>
              <span className="text-xs text-slate-400">
                Music that matches your sky
              </span>
            </div>
          </div>

          <button className="rounded-full bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 ring-1 ring-slate-700/70 backdrop-blur-md hover:bg-slate-800/80 transition">
            Connected to Spotify
          </button>
        </header>

        {/* Weather + mood summary card */}
        <motion.section
          className="mb-5 grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative overflow-hidden rounded-3xl border border-slate-800/60 bg-slate-950/50 p-4 shadow-xl shadow-black/40 backdrop-blur-2xl md:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                  <span>{city}</span>
                  <span className="h-px w-6 bg-slate-700" />
                  <span>{timeLabel}</span>
                </div>
                <div className="mt-2 flex items-end gap-2">
                  <span className="font-heading text-4xl md:text-5xl">
                    {temperature.toFixed(1)}°
                  </span>
                  <span className="mb-1 text-sm text-slate-400">C</span>
                </div>
                <p className="mt-1 text-sm text-slate-300">{accent.label}</p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/70 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-300 ring-1 ring-slate-700/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Auto-matched playlist
                </span>
                <motion.div
                  className="mt-1 flex items-center gap-2 rounded-2xl bg-slate-900/70 px-3 py-2 text-xs text-slate-200 ring-1 ring-slate-700/80"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[10px]">
                    ⚙
                  </span>
                  <div className="flex flex-col items-start">
                    <span>Smart mood engine</span>
                    <span className="text-[10px] text-slate-400">
                      Weather · Time · Energy · History
                    </span>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Mood chips */}
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {["Chill", "Focus", "Drive", "Deep work"].map((label, idx) => (
                <motion.button
                  key={label}
                  whileTap={{ scale: 0.94 }}
                  className={`rounded-full border px-3 py-1 backdrop-blur-lg ${
                    idx === 0
                      ? "border-transparent bg-slate-100 text-slate-900"
                      : "border-slate-700/70 bg-slate-900/60 text-slate-200 hover:bg-slate-800/80"
                  }`}
                >
                  {label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* “Now Playing” compact card */}
          <motion.div
            className="relative overflow-hidden rounded-3xl border border-slate-800/60 bg-slate-950/60 p-4 shadow-xl shadow-black/50 backdrop-blur-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
          >
            <div className="flex items-center gap-3">
              <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-slate-800 ring-1 ring-slate-700/80">
                {loading ? (
                  <div className="h-full w-full animate-pulse bg-slate-700" />
                ) : tracks[0] ? (
                  <img
                    src={tracks[0].coverUrl}
                    alt={tracks[0].title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                    No cover
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent" />
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-slate-100">
                  {loading
                    ? "Finding the perfect track..."
                    : tracks[0]?.title ?? "No track selected"}
                </span>
                <span className="truncate text-xs text-slate-400">
                  {loading
                    ? "Weather-aware recommendation"
                    : tracks[0]?.artist ?? "WeatherTunes"}
                </span>

                {!loading && tracks[0] && (
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span className="h-1 w-10 rounded-full bg-slate-500" />
                    <span className="h-1 w-6 rounded-full bg-slate-600" />
                    <span className="h-1 w-3 rounded-full bg-slate-700" />
                  </div>
                )}
              </div>
            </div>

            {/* Play button with pulse */}
            <motion.button
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-medium text-slate-900 shadow-lg shadow-slate-100/40"
              whileTap={{ scale: 0.92 }}
            >
              <span className="relative inline-flex h-5 w-5 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-300 opacity-60" />
                <span className="relative inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[9px] text-slate-100">
                  ▶
                </span>
              </span>
              Play weather-matched mix
            </motion.button>
          </motion.div>
        </motion.section>

        {/* Tracks list */}
        <section className="mt-2 flex-1">
          <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
            <span>Recommended for this weather</span>
            <span>Energy · Mood · Recency</span>
          </div>

          <div className="space-y-2">
            {loading
              ? Array.from({ length: 5 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-2xl border border-slate-800/60 bg-slate-950/60 p-3"
                  >
                    <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-700" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-2.5 w-32 animate-pulse rounded bg-slate-700" />
                      <div className="h-2 w-20 animate-pulse rounded bg-slate-800" />
                    </div>
                    <div className="h-2 w-16 animate-pulse rounded bg-slate-800" />
                  </div>
                ))
              : tracks.map((track, index) => (
                  <motion.button
                    key={track.id}
                    className="group flex w-full items-center gap-3 rounded-2xl border border-slate-800/60 bg-slate-950/70 p-3 text-left shadow-md shadow-black/30 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-slate-100/40 hover:shadow-slate-900/80"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="relative h-10 w-10 overflow-hidden rounded-xl bg-slate-800">
                      <img
                        src={track.coverUrl}
                        alt={track.title}
                        className="h-full w-full object-cover"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent opacity-0 transition group-hover:opacity-100" />
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm text-slate-100">
                        {index + 1}. {track.title}
                      </span>
                      <span className="truncate text-xs text-slate-400">
                        {track.artist}
                      </span>
                    </div>

                    <div className="hidden w-24 flex-col items-end text-[10px] text-slate-400 sm:flex">
                      <span className="mb-1 rounded-full bg-slate-900/80 px-2 py-0.5 text-slate-200">
                        {track.moodTag}
                      </span>
                      <div className="flex h-1.5 w-full items-center overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-slate-100"
                          style={{ width: `${track.energy * 100}%` }}
                        />
                      </div>
                    </div>
                  </motion.button>
                ))}
          </div>
        </section>
      </div>
    </div>
  );
}
