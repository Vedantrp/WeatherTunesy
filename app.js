/* WeatherTunes – FINAL FRONTEND (No AI)
 * Flow:
 * 1) Login with Spotify (popup to /api/login → /api/callback returns postMessage)
 * 2) Enter city + language → Get weather → derive mood (client-side)
 * 3) Fetch real tracks from Spotify (server) based on language (and mood if backend uses it)
 * 4) Create playlist in user account
 */

const API = location.origin + "/api";

/* ---------- STATE ---------- */
let accessToken = null;
let refreshToken = null;
let currentUser = null;

let current = {
  city: "",
  language: "english",
  weather: null,
  mood: "",
  tracks: []
};

/* ---------- DOM ---------- */
const loginBtn      = document.getElementById("loginBtn");
const logoutBtn     = document.getElementById("logoutBtn");
const userBox       = document.getElementById("userBox");
const userName      = document.getElementById("userName");

const cityInp       = document.getElementById("city");
const langSel       = document.getElementById("language");
const goBtn         = document.getElementById("goBtn");

const loading       = document.getElementById("loading");
const errorBox      = document.getElementById("error");
const noticeBox     = document.getElementById("notice");

const weatherBox    = document.getElementById("weather");
const wText         = document.getElementById("wText");
const wTemp         = document.getElementById("wTemp");
const moodEl        = document.getElementById("mood");
const langEl        = document.getElementById("lang");

const tracksCard    = document.getElementById("tracksCard");
const tracksUl      = document.getElementById("tracks");
const createBtn     = document.getElementById("createBtn");
const createdBox    = document.getElementById("createdBox");
const playlistLink  = document.getElementById("playlistLink");

/* ---------- UI HELPERS ---------- */
const show = (el) => el.classList.remove("hidden");
const hide = (el) => el.classList.add("hidden");
const setText = (el, t) => { el.textContent = t; };

function startLoading(msg = "Loading…") { loading.textContent = msg; show(loading); }
function stopLoading() { hide(loading); }

function showError(msg) {
  errorBox.textContent = msg || "Something went wrong";
  show(errorBox);
  setTimeout(() => hide(errorBox), 6000);
}
function showNotice(msg) {
  noticeBox.textContent = msg || "";
  show(noticeBox);
  setTimeout(() => hide(noticeBox), 4000);
}

/* ---------- AUTH PERSIST ---------- */
function saveAuth() {
  localStorage.setItem("wt_auth", JSON.stringify({
    accessToken, refreshToken, user: currentUser
  }));
}
function restoreAuth() {
  try {
    const v = JSON.parse(localStorage.getItem("wt_auth") || "{}");
    accessToken = v.accessToken || null;
    refreshToken = v.refreshToken || null;
    currentUser = v.user || null;
  } catch {}
  updateAuthUI();
}
function updateAuthUI() {
  if (accessToken && currentUser) {
    hide(loginBtn);
    setText(userName, currentUser.display_name || currentUser.id || "Spotify user");
    show(userBox);
    createBtn.disabled = current.tracks.length === 0;
  } else {
    show(loginBtn);
    hide(userBox);
    createBtn.disabled = true;
  }
}

/* ---------- LOGIN / LOGOUT ---------- */
async function login() {
  try {
    const popup = window.open(`${API}/login`, "Spotify Login", "width=520,height=720");
    if (!popup) return showError("Popup blocked. Allow popups for this site.");

    const onMsg = (e) => {
      if (e.data?.type === "SPOTIFY_AUTH_SUCCESS") {
        accessToken = e.data.token;
        refreshToken = e.data.refreshToken || null;
        currentUser  = e.data.user;
        saveAuth();
        updateAuthUI();
        window.removeEventListener("message", onMsg);
        try { popup.close(); } catch {}
        showNotice("Logged in to Spotify");
      } else if (e.data?.error) {
        showError("Spotify auth failed: " + e.data.error);
        window.removeEventListener("message", onMsg);
        try { popup.close(); } catch {}
      }
    };
    window.addEventListener("message", onMsg);
  } catch {
    showError("Login failed.");
  }
}

function logout() {
  accessToken = null;
  refreshToken = null;
  currentUser = null;
  localStorage.removeItem("wt_auth");
  updateAuthUI();
  showNotice("Logged out");
}

/* ---------- WEATHER + MOOD ---------- */
// Map WeatherAPI condition text → simple mood buckets
function deriveMood(conditionText) {
  const c = (conditionText || "").toLowerCase();
  if (c.includes("storm") || c.includes("thunder")) return "intense";
  if (c.includes("rain") || c.includes("drizzle"))  return "cozy";
  if (c.includes("sun")  || c.includes("clear"))    return "upbeat";
  if (c.includes("snow"))                           return "calm";
  if (c.includes("fog")  || c.includes("mist"))     return "mysterious";
  if (c.includes("cloud"))                          return "balanced";
  return "relaxed";
}

async function fetchWeather(city) {
  const r = await fetch(`${API}/weather`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ location: city })
  });
  if (!r.ok) throw new Error("Weather fetch failed");
  return r.json();
}

function renderWeatherUI(w, mood, language) {
  setText(wText, w?.current?.condition?.text || "—");
  setText(wTemp, Math.round(w?.current?.temp_c ?? 0));
  setText(moodEl, mood);
  setText(langEl, language);
  show(weatherBox);
}

/* ---------- TRACKS ---------- */
function renderTracks(list) {
  tracksUl.innerHTML = "";
  if (!list || !list.length) {
    hide(tracksCard);
    return;
  }
  list.slice(0, 35).forEach((t, i) => {
    const li = document.createElement("li");
    li.textContent = `${i + 1}. ${t.name} — ${t.artist}`;
    tracksUl.appendChild(li);
  });
  show(tracksCard);
  createBtn.disabled = !(accessToken && currentUser && list.length);
}

async function getTracks(language, mood) {
  // Back-end currently requires token + language; mood is extra (harmless).
  const r = await fetch(`${API}/get-tracks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language, mood, token: accessToken })
  });
  if (r.status === 401) throw new Error("Login to Spotify first.");
  if (!r.ok) throw new Error("Track fetch failed");
  const data = await r.json();
  return data.tracks || [];
}

/* ---------- CREATE PLAYLIST ---------- */
async function createPlaylist() {
  try {
    if (!accessToken || !currentUser) return showError("Login to Spotify first.");
    if (!current.tracks.length) return showError("No tracks to add.");

    createBtn.disabled = true;
    const origText = createBtn.textContent;
    createBtn.textContent = "Creating…";

    const uris = current.tracks.slice(0, 35).map(t => t.uri).filter(Boolean);

    const r = await fetch(`${API}/create-playlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: accessToken,
        userId: currentUser.id,
        tracks: uris,
        mood: current.mood
      })
    });

    const data = await r.json();
    if (!r.ok || !data.playlist) throw new Error("Playlist creation failed");
    playlistLink.href = data.playlist;
    show(createdBox);
    createBtn.textContent = "Playlist Created ✅";
  } catch (e) {
    showError(e.message || "Could not create playlist");
  } finally {
    createBtn.disabled = false;
  }
}

/* ---------- MAIN ACTION ---------- */
async function handleGo() {
  try {
    hide(createdBox);
    hide(errorBox);

    if (!accessToken || !currentUser) return showError("Please login with Spotify first.");

    current.city = (cityInp.value || "").trim();
    current.language = (langSel.value || "english").toLowerCase();
    if (!current.city) return showError("Enter a city");

    // 1) Weather → mood
    startLoading("Getting weather…");
    const weatherJson = await fetchWeather(current.city);
    const conditionText = weatherJson?.current?.condition?.text || "";
    current.mood = deriveMood(conditionText);
    current.weather = weatherJson;
    renderWeatherUI(weatherJson, current.mood, current.language);

    // 2) Tracks
    startLoading("Finding songs on Spotify…");
    const tracks = await getTracks(current.language, current.mood);

    // If backend returns empty (rare), make a second pass with looser language
    if (!tracks.length && current.language !== "english") {
      showNotice("No exact matches — trying a broader search.");
      const fallback = await getTracks("english", current.mood);
      current.tracks = fallback;
    } else {
      current.tracks = tracks;
    }

    renderTracks(current.tracks);
    stopLoading();
  } catch (e) {
    stopLoading();
    showError(e.message || "Something went wrong");
  }
}

/* ---------- EVENTS ---------- */
loginBtn.addEventListener("click", login);
logoutBtn.addEventListener("click", logout);
goBtn.addEventListener("click", handleGo);
cityInp.addEventListener("keypress", (e) => e.key === "Enter" && handleGo());
createBtn.addEventListener("click", createPlaylist);

/* ---------- INIT ---------- */
restoreAuth();
