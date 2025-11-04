// ================================
// WeatherTunes — FINAL APP.JS ✅
// Backend endpoints required:
// /api/login
// /api/callback
// /api/refresh-token
// /api/get-tracks
// /api/weather
// ================================

const apiBase =
  location.hostname === "localhost"
    ? "http://localhost:3000/api"
    : "https://weather-tunes-kappa.vercel.app/api";

// DOM Elements
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userBox = document.getElementById("userBox");
const userNameEl = document.getElementById("userName");
const cityInp = document.getElementById("city");
const langSel = document.getElementById("language");
const moodSelect = document.getElementById("moodSelect");
const goBtn = document.getElementById("goBtn");
const loading = document.getElementById("loading");
const errorBox = document.getElementById("error");
const noticeBox = document.getElementById("notice");
const weatherBox = document.getElementById("weather");
const wText = document.getElementById("wText");
const wTemp = document.getElementById("wTemp");
const moodTag = document.getElementById("mood");
const langTag = document.getElementById("lang");
const tracksCard = document.getElementById("tracksCard");
const tracksEl = document.getElementById("tracks");
const createBtn = document.getElementById("createBtn");
const createdBox = document.getElementById("createdBox");
const playlistLink = document.getElementById("playlistLink");

let token = null;
let refreshToken = null;
let current = {
  mood: "balanced",
  language: "english",
  city: "",
  tracks: [],
  weather: null,
};

// Helpers
function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }

function showError(msg) {
  errorBox.textContent = msg;
  show(errorBox);
  setTimeout(() => hide(errorBox), 4500);
}

function showNotice(msg) {
  noticeBox.textContent = msg;
  show(noticeBox);
  setTimeout(() => hide(noticeBox), 3500);
}

function startLoading(msg) {
  loading.textContent = msg;
  show(loading);
}
function stopLoading() {
  hide(loading);
}

// Local Storage Auth
function saveAuth(t, r) {
  token = t;
  refreshToken = r;
  localStorage.setItem("spotify_token", t);
  localStorage.setItem("spotify_refresh", r);
}

function loadAuth() {
  token = localStorage.getItem("spotify_token");
  refreshToken = localStorage.getItem("spotify_refresh");
  if (token) { show(userBox); hide(loginBtn); }
}

async function refreshSpotify() {
  if (!refreshToken) return false;
  const r = await fetch(`${apiBase}/refresh-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken })
  });
  const j = await r.json();
  if (j.accessToken) {
    saveAuth(j.accessToken, refreshToken);
    return true;
  }
  return false;
}

// Spotify Login
async function loginSpotify() {
  const r = await fetch(`${apiBase}/login`);
  const j = await r.json();
  const popup = window.open(j.authUrl, "_blank", "width=500,height=650");

  window.addEventListener("message", (e) => {
    if (e.data.type === "SPOTIFY_AUTH_SUCCESS") {
      saveAuth(e.data.token, e.data.refreshToken);
      userNameEl.textContent = e.data.user?.display_name || "User";
      hide(loginBtn);
      show(userBox);
      popup.close();
    }
  });
}

// Weather fetch
async function fetchWeather(city) {
  const r = await fetch(`${apiBase}/weather?city=${encodeURIComponent(city)}`);
  if (!r.ok) throw new Error("Weather API failed");
  return r.json();
}

// Tracks fetch
async function fetchTracks(lang, mood) {
  const r = await fetch(`${apiBase}/get-tracks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language: lang, mood, token })
  });

  if (r.status === 401) {
    const ok = await refreshSpotify();
    if (ok) return fetchTracks(lang, mood);
    throw new Error("Login expired, sign in again");
  }

  const j = await r.json();
  if (!j.tracks?.length) throw new Error("No tracks found");
  return j.tracks;
}

// Playlist create
async function createPlaylist() {
  try {
    if (!current.tracks.length) return showError("No songs to add");

    createBtn.disabled = true;
    createBtn.textContent = "Creating…";

    const r = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const me = await r.json();

    const p = await fetch(`https://api.spotify.com/v1/users/${me.id}/playlists`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `WeatherTunes – ${current.mood}`,
        description: `Auto-generated playlist for ${current.city} (${current.language})`,
        public: false
      })
    });
    const playlist = await p.json();

    const uris = current.tracks.slice(0, 35).map(t => t.uri);

    await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ uris })
    });

    playlistLink.href = playlist.external_urls.spotify;
    show(createdBox);
    createBtn.textContent = "Playlist Done ✅";
  } catch (e) {
    showError(e.message);
  }
}

// Render UI
function renderWeather(w, mood, lang) {
  wText.textContent = w.text;
  wTemp.textContent = w.temp;
  moodTag.textContent = mood;
  langTag.textContent = lang;
  show(weatherBox);
}

function renderTracks(arr) {
  tracksEl.innerHTML = arr
    .map(t => `<li>${t.name} — <span class="muted">${t.artist}</span></li>`)
    .join("");
  show(tracksCard);
  createBtn.disabled = false;
}

// Main search
async function go() {
  try {
    hide(createdBox);
    hide(errorBox);
    startLoading("Getting weather…");

    current.city = cityInp.value.trim();
    current.language = langSel.value;
    current.mood = moodSelect.value; // ✅ user mood always wins

    if (!current.city) { stopLoading(); return showError("Enter a city"); }

    const wx = await fetchWeather(current.city);
    renderWeather(wx, current.mood, current.language);

    startLoading("Choosing tracks…");
    const pool = await fetchTracks(current.language, current.mood);

    // Shuffle & limit 35
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    current.tracks = pool.slice(0, 35);

    renderTracks(current.tracks);
    stopLoading();
  } catch (e) {
    stopLoading();
    showError(e.message);
  }
}

// Logout
function logout() {
  localStorage.clear();
  token = null;
  refreshToken = null;
  show(loginBtn);
  hide(userBox);
  showError("Logged out");
}

// Event listeners
loadAuth();
if (token) {
  hide(loginBtn);
  show(userBox);
}

loginBtn.onclick = loginSpotify;
logoutBtn.onclick = logout;
goBtn.onclick = go;
createBtn.onclick = createPlaylist;
