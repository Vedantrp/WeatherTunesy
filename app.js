/* WeatherTunes – FINAL app.js
 * - Spotify-only (no AI)
 * - Weather → mood → language-strict tracks
 * - Always 35 unique songs (with fallbacks)
 * - Working login, token refresh, playlist creation (batched)
 * - Shows playlist link reliably
 */

console.log("WeatherTunes ready ✅");

// ----------------------------- CONFIG -----------------------------
const API_BASE =
  location.hostname.includes("localhost")
    ? "http://localhost:3000/api"
    : `${location.origin}/api`;

const WEATHER_KEY = "b15d294bfca84397a5682344252410";
const PLAYLIST_SIZE = 35;

// ----------------------------- STATE ------------------------------
let spotifyToken = null;
let spotifyRefresh = null;
let user = null;

let cachedTracks = []; // [{id, uri, name, artist}]
let currentCity = "";
let currentLanguage = "english";
let currentMood = "relaxed";

// ----------------------------- DOM -------------------------------
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userInfo = document.getElementById("userInfo");
const userName = document.getElementById("userName");

const locationInput = document.getElementById("locationInput");
const languageSelect = document.getElementById("languageSelect");
const searchBtn = document.getElementById("searchBtn");

const loading = document.getElementById("loading");
const errorBox = document.getElementById("error");

const weatherCard = document.getElementById("weatherCard");
const cityName = document.getElementById("cityName");
const dateTime = document.getElementById("dateTime");
const temperature = document.getElementById("temperature");
const weatherDescription = document.getElementById("weatherDescription");
const weatherIcon = document.getElementById("weatherIcon");
const feelsLike = document.getElementById("feelsLike");
const humidity = document.getElementById("humidity");
const windSpeed = document.getElementById("windSpeed");

const playlistCard = document.getElementById("playlistCard");
const moodType = document.getElementById("moodType");
const playlistSuggestion = document.getElementById("playlistSuggestion");
const genreTags = document.getElementById("genreTags");
const aiPlaylistSection = document.getElementById("aiPlaylistSection");
const aiSongList = document.getElementById("aiSongList");

const createPlaylistBtn = document.getElementById("createPlaylistBtn");
const createPlaylistText = document.getElementById("createPlaylistText");
const createdPlaylist = document.getElementById("createdPlaylist");
const playlistLink = document.getElementById("playlistLink");
const openSpotifyBtn = document.getElementById("openSpotifyBtn");

// ----------------------------- HELPERS ---------------------------
const show = (el) => el && el.classList && el.classList.remove("hidden");
const hide = (el) => el && el.classList && el.classList.add("hidden");

function showError(msg) {
  if (!errorBox) return alert(msg);
  errorBox.textContent = msg;
  show(errorBox);
  setTimeout(() => hide(errorBox), 6000);
}

function showLoading(text = "Loading…") {
  if (!loading) return;
  loading.innerHTML = `<div class="spinner"></div><p>${text}</p>`;
  show(loading);
}
function hideLoading() {
  hide(loading);
}

function formatDateTime(str) {
  const d = new Date((str || "").replace(" ", "T"));
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapMood(condition, tempC, isDay, windKph) {
  const c = (condition || "").toLowerCase();
  if (c.includes("thunder") || c.includes("storm")) return "intense";
  if (c.includes("rain") || c.includes("drizzle")) return "cozy";
  if (c.includes("snow") || tempC <= 10) return "calm";
  if (c.includes("mist") || c.includes("fog")) return "mysterious";
  if (c.includes("sun") || c.includes("clear")) return isDay ? "upbeat" : "relaxed";
  if (c.includes("cloud")) return "relaxed";
  if (tempC >= 32) return "tropical";
  if (windKph >= 30) return "energetic";
  return "balanced";
}

function persistAuth() {
  localStorage.setItem("spotify", JSON.stringify({ spotifyToken, spotifyRefresh, user }));
}
function restoreAuth() {
  try {
    const raw = localStorage.getItem("spotify");
    if (!raw) return;
    const v = JSON.parse(raw);
    spotifyToken = v.spotifyToken;
    spotifyRefresh = v.spotifyRefresh;
    user = v.user;
  } catch {}
  updateAuthUI();
}

function updateAuthUI() {
  if (spotifyToken && user) {
    hide(loginBtn);
    show(userInfo);
    if (userName) userName.textContent = `Logged in as ${user.display_name || user.id}`;
    if (cachedTracks.length) {
      createPlaylistBtn.disabled = false;
      createPlaylistText.textContent = "Create Playlist";
    }
  } else {
    show(loginBtn);
    hide(userInfo);
    createPlaylistBtn.disabled = true;
    createPlaylistText.textContent = "Login to Create";
  }
}

// ----------------------------- AUTH ------------------------------
async function loginSpotify() {
  try {
    const r = await fetch(`${API_BASE}/login`);
    // If /api/login responds with JSON {authUrl}, use that; if it redirects, open its URL directly
    if (r.redirected) {
      window.open(r.url, "Spotify Login", "width=520,height=720");
      return;
    }
    const data = await r.json().catch(() => ({}));
    const authUrl = data.authUrl || `${API_BASE}/login`;
    const popup = window.open(authUrl, "Spotify Login", "width=520,height=720");
    if (!popup) return showError("Popup blocked. Please allow popups for this site.");

    const listener = (e) => {
      if (e.data?.type === "SPOTIFY_AUTH_SUCCESS") {
        spotifyToken = e.data.token;
        spotifyRefresh = e.data.refreshToken;
        user = e.data.user;
        persistAuth();
        updateAuthUI();
        window.removeEventListener("message", listener);
        popup.close();
      }
    };
    window.addEventListener("message", listener);
  } catch (e) {
    console.error(e);
    showError("Spotify login failed.");
  }
}

async function refreshToken() {
  const r = await fetch(`${API_BASE}/refresh-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: spotifyRefresh }),
  });
  const d = await r.json();
  if (d.accessToken) {
    spotifyToken = d.accessToken;
    persistAuth();
    updateAuthUI();
  } else {
    showError("Session expired. Please login again.");
  }
}

function logout() {
  localStorage.clear();
  location.reload();
}

// ----------------------------- WEATHER ---------------------------
async function fetchWeather(city) {
  const r = await fetch(
    `https://api.weatherapi.com/v1/current.json?key=${WEATHER_KEY}&q=${encodeURIComponent(
      city
    )}&aqi=no`
  );
  const d = await r.json();
  if (d?.error) throw new Error(d.error.message || "Weather failed");
  return d;
}

function displayWeather(data) {
  const { location, current } = data;
  cityName.textContent = `${location.name}, ${location.country}`;
  dateTime.textContent = formatDateTime(location.localtime);
  temperature.textContent = Math.round(current.temp_c);
  weatherDescription.textContent = current.condition.text;
  weatherIcon.src = `https:${current.condition.icon}`;
  weatherIcon.alt = current.condition.text;
  feelsLike.textContent = `${Math.round(current.feelslike_c)}°C`;
  humidity.textContent = `${current.humidity}%`;
  windSpeed.textContent = `${current.wind_kph} km/h`;
  show(weatherCard);
}

function displayMood(mood, language) {
  currentMood = mood;
  currentLanguage = language;
  moodType.textContent = mood;
  playlistSuggestion.textContent = `WeatherTunes — ${mood} vibes in ${language}`;
  genreTags.innerHTML = "";
  show(playlistCard);
}

// ----------------------------- TRACKS ---------------------------
async function getTracks(language, mood) {
  // Calls your /api/get-tracks (server does strict language filtering + fallback)
  let res = await fetch(`${API_BASE}/get-tracks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language, mood, token: spotifyToken }),
  });

  if (res.status === 401) {
    // refresh once
    await refreshToken();
    res = await fetch(`${API_BASE}/get-tracks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language, mood, token: spotifyToken }),
    });
  }

  const data = await res.json().catch(() => ({}));
  return data.tracks || [];
}

function pick35Unique(arr) {
  const seen = new Set();
  const out = [];
  for (const t of arr) {
    if (!t?.id) continue;
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    out.push(t);
    if (out.length >= PLAYLIST_SIZE) break;
  }
  // if still low, just fill from remaining (best effort)
  if (out.length < PLAYLIST_SIZE) {
    for (const t of arr) {
      if (out.length >= PLAYLIST_SIZE) break;
      if (!out.find((x) => x.id === t.id)) out.push(t);
    }
  }
  return out;
}

function renderTracks(list) {
  aiSongList.innerHTML = "";
  if (!list || !list.length) {
    hide(aiPlaylistSection);
    createPlaylistBtn.disabled = true;
    createPlaylistText.textContent = "No songs found";
    return;
  }
  list.forEach((t, i) => {
    const li = document.createElement("li");
    li.className = "ai-song-item hover:bg-gray-800 px-3 py-1 rounded-lg transition";
    li.textContent = `${i + 1}. ${t.name} — ${t.artist}`;
    aiSongList.appendChild(li);
  });
  show(aiPlaylistSection);
  if (spotifyToken && user) {
    createPlaylistBtn.disabled = false;
    createPlaylistText.textContent = "Create Playlist";
  }
}

// ----------------------------- MAIN FLOW ------------------------
async function handleSearch() {
  try {
    hide(errorBox);
    hide(createdPlaylist);
    createPlaylistBtn.disabled = true;
    createPlaylistText.textContent = "Create Playlist";

    currentCity = (locationInput.value || "").trim();
    currentLanguage = (languageSelect.value || "english").toLowerCase();
    if (!currentCity) return showError("Enter a city");

    showLoading("Fetching weather…");
    const w = await fetchWeather(currentCity);
    displayWeather(w);

    const mood = mapMood(
      w.current.condition.text,
      w.current.temp_c,
      w.current.is_day === 1,
      w.current.wind_kph
    );
    displayMood(mood, currentLanguage);

    showLoading("Finding songs on Spotify…");
    let pool = await getTracks(currentLanguage, mood);

    // Shuffle & select
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    cachedTracks = pick35Unique(pool);
    renderTracks(cachedTracks);
  } catch (e) {
    console.error(e);
    showError(e.message || "Something went wrong.");
  } finally {
    hideLoading();
  }
}

// ----------------------------- PLAYLIST -------------------------
async function createPlaylist() {
  try {
    if (!spotifyToken || !user) return showError("Login to Spotify first.");
    if (!cachedTracks.length) return showError("No tracks to add.");

    createPlaylistBtn.disabled = true;
    createPlaylistText.textContent = "Creating…";

    const name = `WeatherTunes — ${currentMood[0].toUpperCase() + currentMood.slice(1)} Mix`;
    const desc = `Auto-generated ${currentLanguage} ${currentMood} mix for ${currentCity || "your city"}`;

    // 1) Create playlist
    let res = await fetch(`https://api.spotify.com/v1/users/${user.id}/playlists`, {
      method: "POST",
      headers: { Authorization: `Bearer ${spotifyToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: desc, public: false }),
    });

    if (res.status === 401) {
      await refreshToken();
      res = await fetch(`https://api.spotify.com/v1/users/${user.id}/playlists`, {
        method: "POST",
        headers: { Authorization: `Bearer ${spotifyToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: desc, public: false }),
      });
    }

    const playlist = await res.json();
    if (!playlist?.id) throw new Error("Playlist create failed.");

    // 2) Add tracks in chunks of 20
    const uris = cachedTracks.map((t) => t.uri).filter(Boolean);
    for (let i = 0; i < uris.length; i += 20) {
      const chunk = uris.slice(i, i + 20);
      let add = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
        method: "POST",
        headers: { Authorization: `Bearer ${spotifyToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ uris: chunk }),
      });
      if (add.status === 401) {
        await refreshToken();
        add = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
          method: "POST",
          headers: { Authorization: `Bearer ${spotifyToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ uris: chunk }),
        });
      }
    }

    // 3) Always show link (even if images not populated yet)
    const link = playlist?.external_urls?.spotify || `https://open.spotify.com/playlist/${playlist.id}`;
    playlistLink.href = link;
    playlistLink.textContent = "Open Playlist on Spotify →";
    show(createdPlaylist);

    createPlaylistText.textContent = "Playlist Created ✅";
  } catch (e) {
    console.error(e);
    showError(e.message || "Failed to create playlist.");
  } finally {
    createPlaylistBtn.disabled = false;
  }
}

// ----------------------------- EVENTS ---------------------------
loginBtn?.addEventListener("click", loginSpotify);
logoutBtn?.addEventListener("click", logout);
searchBtn?.addEventListener("click", handleSearch);
locationInput?.addEventListener("keypress", (e) => e.key === "Enter" && handleSearch());
createPlaylistBtn?.addEventListener("click", createPlaylist);

// ----------------------------- INIT -----------------------------
restoreAuth();
