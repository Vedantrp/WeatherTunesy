/* WeatherTunes Premium – Frontend
 * Endpoints used:
 *  /api/login                -> { authUrl }
 *  /api/callback             -> popup posts tokens to opener
 *  /api/weather-playlist     -> POST { location, language } => { weather:{temp,text,icon}, mood, language }
 *  /api/recommendations      -> POST { language, mood, token } => { tracks:[{id,uri,name,artist}] }
 *  /api/create-playlist      -> POST { token, userId, tracks:[uris], mood } => { url }
 */

const API = location.origin + "/api";

// --- State ---
let accessToken = null;
let refreshToken = null;
let user = null;

let current = {
  city: "",
  language: "english",
  mood: "relaxed",
  tracks: [],
  tweak: 0, // -2..+2 (chill..energy)
};

// --- DOM shortcuts ---
const $ = (id) => document.getElementById(id);
const loginBtn = $("loginBtn");
const logoutBtn = $("logoutBtn");
const userBox = $("userBox");
const userName = $("userName");

const cityInp = $("city");
const langSel = $("language");
const goBtn = $("goBtn");
const refineChill = $("refineChill");
const refineEnergy = $("refineEnergy");
const surpriseBtn = $("surprise");
const savePresetBtn = $("savePreset");
const loadPresetBtn = $("loadPreset");

const loading = $("loading");
const errorBox = $("error");
const noticeBox = $("notice");

const weatherBox = $("weather");
const wText = $("wText");
const wTemp = $("wTemp");
const moodEl = $("mood");
const langEl = $("lang");

const tracksCard = $("tracksCard");
const tracksUl = $("tracks");
const createBtn = $("createBtn");
const createdBox = $("createdBox");
const playlistLink = $("playlistLink");

// --- Utils ---
const show = (el) => (el.style.display = "");
const hide = (el) => (el.style.display = "none");
const setText = (el, t) => (el.textContent = t);
const startLoading = (msg = "Loading…") => { setText(loading, msg); show(loading); };
const stopLoading = () => hide(loading);
function error(msg) { setText(errorBox, msg); show(errorBox); setTimeout(() => hide(errorBox), 6000); }
function notice(msg) { setText(noticeBox, msg); show(noticeBox); setTimeout(() => hide(noticeBox), 4000); }

function persist() { localStorage.setItem("wt_auth", JSON.stringify({ accessToken, refreshToken, user })); }
function restore() {
  try { const v = JSON.parse(localStorage.getItem("wt_auth") || "{}");
    accessToken = v.accessToken || null; refreshToken = v.refreshToken || null; user = v.user || null;
  } catch {}
  updateAuthUI();
}
function updateAuthUI() {
  if (accessToken && user) {
    hide(loginBtn); setText(userName, user.display_name || user.id || "Spotify user"); show(userBox);
    createBtn.disabled = current.tracks.length === 0;
  } else { show(loginBtn); hide(userBox); createBtn.disabled = true; }
}

// --- Auth flow ---
async function login() {
  try {
    const r = await fetch(`${API}/login`); const d = await r.json();
    if (!d.authUrl) return error("Auth server error");
    const popup = window.open(d.authUrl, "Spotify Login", "width=520,height=720");
    if (!popup) return error("Popup blocked; allow popups");

    const onMsg = (e) => {
      if (e.data?.type === "SPOTIFY_AUTH_SUCCESS") {
        accessToken = e.data.token; refreshToken = e.data.refreshToken || null; user = e.data.user;
        persist(); updateAuthUI(); window.removeEventListener("message", onMsg); popup.close(); notice("Logged in");
      } else if (e.data?.error) {
        error("Spotify auth failed: " + e.data.error); window.removeEventListener("message", onMsg); popup.close();
      }
    };
    window.addEventListener("message", onMsg);
  } catch { error("Login failed"); }
}
function logout() { accessToken = null; refreshToken = null; user = null; localStorage.removeItem("wt_auth"); updateAuthUI(); notice("Logged out"); }

// --- Weather → Mood ---
async function getWeatherMood(city, language) {
  const r = await fetch(`${API}/weather-playlist`, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ location: city, language }) });
  if (!r.ok) throw new Error("Weather/mood failed");
  return r.json();
}
function renderWeather(w, mood, language) {
  setText(wText, w.text); setText(wTemp, Math.round(w.temp)); setText(moodEl, mood); setText(langEl, language);
  show(weatherBox);
}

// --- Tracks: Recommendations with tweak ---
function applyTweak(mood, tweak) {
  // Map tweak to neighboring moods to re-query recommendations
  const ladder = ["sleep","relaxed","balanced","upbeat","energetic"];
  const idx = ladder.indexOf(mood); if (idx === -1) return mood;
  const clamped = Math.max(0, Math.min(ladder.length - 1, idx + tweak));
  return ladder[clamped];
}
async function fetchRecommendations(language, mood, token) {
  const r = await fetch(`${API}/recommendations`, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ language, mood, token }) });
  if (r.status === 401) throw new Error("Spotify login required");
  const d = await r.json(); if (!r.ok) throw new Error(d?.error || "Recommendations failed");
  return d.tracks || [];
}
function renderTracks(list) {
  tracksUl.innerHTML = "";
  if (!list?.length) { hide(tracksCard); createBtn.disabled = true; return; }
  list.slice(0, 35).forEach((t, i) => {
    const li = document.createElement("li");
    li.textContent = `${i + 1}. ${t.name} — ${t.artist}`;
    tracksUl.appendChild(li);
  });
  show(tracksCard); createBtn.disabled = !(accessToken && user);
}

// --- Playlist ---
async function createPlaylist() {
  try {
    if (!accessToken || !user) return error("Login to Spotify first");
    if (!current.tracks.length) return error("No tracks to add");
    createBtn.disabled = true; createBtn.textContent = "Creating…";
    const uris = current.tracks.slice(0, 35).map(t => t.uri).filter(Boolean);

    const r = await fetch(`${API}/create-playlist`, {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ token: accessToken, userId: user.id, tracks: uris, mood: current.mood })
    });
    const d = await r.json(); if (!r.ok || !d.url) throw new Error(d?.error || "Playlist creation failed");
    playlistLink.href = d.url; show(createdBox); createBtn.textContent = "Playlist Created ✅";
  } catch (e) { error(e.message || "Failed to create playlist"); createBtn.textContent = "Create Spotify Playlist"; }
  finally { createBtn.disabled = false; }
}

// --- Main flow ---
async function go() {
  try {
    hide(createdBox); hide(errorBox);
    current.city = (cityInp.value || "").trim(); current.language = (langSel.value || "english").toLowerCase();
    if (!current.city) return error("Enter a city");

    startLoading("Getting weather & mood…");
    const wm = await getWeatherMood(current.city, current.language);
    stopLoading();

    current.mood = wm.mood;
    renderWeather({ text: wm.weather.text, temp: wm.weather.temp }, wm.mood, wm.language);

    startLoading("Finding perfect songs…");
    const queryMood = applyTweak(current.mood, current.tweak);
    const pool = await fetchRecommendations(current.language, queryMood, accessToken);
    stopLoading();

    // Shuffle & keep 35
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    current.tracks = pool.slice(0, 35);
    renderTracks(current.tracks);
  } catch (e) { stopLoading(); error(e.message || "Something went wrong"); }
}

// --- Refine / Surprise / Presets ---
function refine(delta) {
  current.tweak = Math.max(-2, Math.min(2, current.tweak + delta));
  go();
}
function surprise() {
  // Random tweak and random language rotate (within same family rarely)
  const deltas = [-2,-1,0,1,2]; current.tweak = deltas[Math.floor(Math.random() * deltas.length)];
  go();
}
function savePreset() {
  const preset = { city: current.city || cityInp.value.trim(), language: (langSel.value || "english").toLowerCase() };
  localStorage.setItem("wt_preset", JSON.stringify(preset));
  notice("Preset saved");
}
function loadPreset() {
  const raw = localStorage.getItem("wt_preset"); if (!raw) return notice("No preset saved");
  const p = JSON.parse(raw); cityInp.value = p.city || ""; langSel.value = p.language || "english";
  notice("Preset loaded");
}

// --- Events ---
$("createBtn").addEventListener("click", createPlaylist);
$("goBtn").addEventListener("click", go);
$("city").addEventListener("keypress", (e) => e.key === "Enter" && go());

$("refineChill").addEventListener("click", () => refine(-1));
$("refineEnergy").addEventListener("click", () => refine(+1));
$("surprise").addEventListener("click", surprise);
$("savePreset").addEventListener("click", savePreset);
$("loadPreset").addEventListener("click", loadPreset);

$("loginBtn").addEventListener("click", login);
$("logoutBtn").addEventListener("click", logout);

// --- Init ---
restore();
