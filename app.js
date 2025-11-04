/* WeatherTunes – Frontend (no AI)
 * - Calls your Vercel API:
 *   /api/login          -> { authUrl }
 *   /api/callback       -> handled in popup, posts token back
 *   /api/weather-playlist  POST { location, language } -> { weather, mood, language }
 *   /api/get-tracks        POST { mood, language, token } -> { tracks: [{id, uri, name, artist}] }
 *   /api/create-playlist   POST { token, userId, tracks:[uris], mood } -> { url }
 */

const API_BASE = location.origin + "/api";

// ---- State ----
let accessToken = null;
let refreshToken = null; // not used in this simple pass, can be wired later
let user = null;
let current = { city: "", language: "english", mood: "relaxed", tracks: [] };

// ---- DOM ----
const loginBtn    = document.getElementById("loginBtn");
const logoutBtn   = document.getElementById("logoutBtn");
const userBox     = document.getElementById("userBox");
const userName    = document.getElementById("userName");

const cityInp     = document.getElementById("city");
const langSel     = document.getElementById("language");
const goBtn       = document.getElementById("goBtn");

const loading     = document.getElementById("loading");
const errorBox    = document.getElementById("error");
const noticeBox   = document.getElementById("notice");

const weatherBox  = document.getElementById("weather");
const wText       = document.getElementById("wText");
const wTemp       = document.getElementById("wTemp");
const moodEl      = document.getElementById("mood");
const langEl      = document.getElementById("lang");

const tracksCard  = document.getElementById("tracksCard");
const tracksUl    = document.getElementById("tracks");
const createBtn   = document.getElementById("createBtn");
const createdBox  = document.getElementById("createdBox");
const playlistLink= document.getElementById("playlistLink");

// ---- Helpers ----
const show = (el) => el.classList.remove("hidden");
const hide = (el) => el.classList.add("hidden");
const setText = (el, t) => { el.textContent = t; };

function showError(msg) {
  errorBox.textContent = msg;
  show(errorBox);
  setTimeout(() => hide(errorBox), 6000);
}
function showNotice(msg) {
  noticeBox.textContent = msg;
  show(noticeBox);
  setTimeout(() => hide(noticeBox), 4000);
}
function startLoading(msg = "Loading…") { loading.textContent = msg; show(loading); }
function stopLoading() { hide(loading); }

function persist() {
  localStorage.setItem("wt_auth", JSON.stringify({ accessToken, refreshToken, user }));
}
function restore() {
  try {
    const v = JSON.parse(localStorage.getItem("wt_auth") || "{}");
    accessToken = v.accessToken || null;
    refreshToken = v.refreshToken || null;
    user = v.user || null;
  } catch {}
  updateAuthUI();
}

function updateAuthUI() {
  if (accessToken && user) {
    hide(loginBtn);
    setText(userName, user.display_name || user.id || "Spotify user");
    show(userBox);
    createBtn.disabled = current.tracks.length === 0;
  } else {
    show(loginBtn);
    hide(userBox);
    createBtn.disabled = true;
  }
}

// ---- Auth ----
async function login() {
  try {
    const res = await fetch(`${API_BASE}/login`);
    const data = await res.json();
    if (!data.authUrl) return showError("Login endpoint failed.");

    const popup = window.open(data.authUrl, "Spotify Login", "width=520,height=720");
    if (!popup) return showError("Popup blocked; allow popups for this site.");

    const onMsg = (e) => {
      if (e.data?.type === "SPOTIFY_AUTH_SUCCESS") {
        accessToken = e.data.token;
        refreshToken = e.data.refreshToken || null;
        user = e.data.user;
        persist();
        updateAuthUI();
        window.removeEventListener("message", onMsg);
        popup.close();
        showNotice("Logged in with Spotify");
      } else if (e.data?.error) {
        showError("Spotify auth failed: " + e.data.error);
        window.removeEventListener("message", onMsg);
        popup.close();
      }
    };
    window.addEventListener("message", onMsg);
  } catch (e) {
    showError("Login failed.");
  }
}

function logout() {
  accessToken = null;
  refreshToken = null;
  user = null;
  localStorage.removeItem("wt_auth");
  updateAuthUI();
  showNotice("Logged out");
}

// ---- Weather → Mood ----
async function fetchWeatherAndMood(city, language) {
  const res = await fetch(`${API_BASE}/weather-playlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ location: city, language })
  });
  if (!res.ok) throw new Error("Weather/mood failed");
  return res.json(); // { weather, mood, language }
}

function renderWeather(w, mood, language) {
  setText(wText, w.text);
  setText(wTemp, Math.round(w.temp));
  setText(moodEl, mood);
  setText(langEl, language);
  show(weatherBox);
}

// ---- Tracks ----
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
  createBtn.disabled = !(accessToken && user && list.length);
}

async function fetchTracks(language, mood) {
  const res = await fetch(`${API_BASE}/get-tracks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language, mood, token: auth.accessToken })
  });
  if (res.status === 401) throw new Error("Spotify login required");
  if (!res.ok) throw new Error("Track fetch failed");
  const data = await res.json();
  return data.tracks || [];
}

// ---- Create Playlist ----
async function createPlaylist() {
  try {
    if (!accessToken || !user) return showError("Login to Spotify first.");
    if (!current.tracks.length) return showError("No tracks to add.");

    createBtn.disabled = true;
    createBtn.textContent = "Creating…";

    const uris = current.tracks.slice(0, 35).map(t => t.uri).filter(Boolean);

    const res = await fetch(`${API_BASE}/create-playlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: accessToken,
        userId: user.id,
        tracks: uris,
        mood: current.mood
      })
    });

    const data = await res.json();
    if (!res.ok || !data.url) throw new Error("Playlist create failed");
    playlistLink.href = data.url;
    show(createdBox);
    createBtn.textContent = "Playlist Created ✅";
  } catch (e) {
    showError(e.message || "Could not create playlist");
  } finally {
    createBtn.disabled = false;
  }
}

// ---- Main flow ----
async function go() {
  try {
    hide(createdBox);
    hide(errorBox);
    startLoading("Getting weather & mood…");

    current.city = (cityInp.value || "").trim();
    current.language = (langSel.value || "english").toLowerCase();
    if (!current.city) { stopLoading(); return showError("Enter a city"); }

    // 1) Weather + mood
    const wm = await fetchWeatherAndMood(current.city, current.language);
    renderWeather(
      { text: wm.weather.text, temp: wm.weather.temp },
      wm.mood,
      wm.language
    );
    current.mood = wm.mood;

    // 2) Tracks
    startLoading("Finding songs on Spotify…");
    const pool = await fetchTracks(current.language, current.mood);
    // simple shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    current.tracks = pool.slice(0, 35);
    renderTracks(current.tracks);

    stopLoading();
  } catch (e) {
    stopLoading();
    showError(e.message || "Something went wrong");
  }
}

// ---- Events ----
loginBtn.addEventListener("click", login);
logoutBtn.addEventListener("click", logout);
goBtn.addEventListener("click", go);
cityInp.addEventListener("keypress", (e) => e.key === "Enter" && go());
createBtn.addEventListener("click", createPlaylist);

// ---- Init ----
restore();

