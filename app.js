// app.js (FINAL) ------------------------------------------------------------
// WeatherTunes final frontend: robust auth popup, restore, AI fetch, create playlist

const getApiBaseUrl = () => {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:3000/api";
  }
  return "https://weather-tunes-kappa.vercel.app/api";
};
const API_BASE_URL = getApiBaseUrl();

// ---- state ----
let spotifyAccessToken = null;
let spotifyRefreshToken = null;
let currentUser = null;
let cachedAiSongs = [];

// ---- elements (grab lazily after DOM ready) ----
let locationInput, languageSelect, activitySelect, searchBtn, loadingEl;
let loginBtn, logoutBtn, userInfoEl, userNameEl;
let weatherCard, playlistCard, aiPlaylistSection, aiSongList, createPlaylistBtn, createPlaylistText, playlistLink, errorBox;

function initElements() {
  locationInput = document.getElementById("locationInput");
  languageSelect = document.getElementById("languageSelect");
  activitySelect = document.getElementById("activitySelect");
  searchBtn = document.getElementById("searchBtn");
  loadingEl = document.getElementById("loading");
  loginBtn = document.getElementById("loginBtn");
  logoutBtn = document.getElementById("logoutBtn");
  userInfoEl = document.getElementById("userInfo");
  userNameEl = document.getElementById("userName");
  weatherCard = document.getElementById("weatherCard");
  playlistCard = document.getElementById("playlistCard");
  aiPlaylistSection = document.getElementById("aiPlaylistSection");
  aiSongList = document.getElementById("aiSongList");
  createPlaylistBtn = document.getElementById("createPlaylistBtn");
  createPlaylistText = document.getElementById("createPlaylistText");
  playlistLink = document.getElementById("playlistLink");
  errorBox = document.getElementById("error");
}

// ---- small UI helpers ----
function showError(msg) {
  if (!errorBox) return alert(msg);
  errorBox.textContent = msg;
  errorBox.classList.remove("hidden");
  setTimeout(() => errorBox.classList.add("hidden"), 5000);
}
function showLoading(on = true) {
  if (!loadingEl) return;
  loadingEl.classList.toggle("hidden", !on);
}
function updateAuthUI() {
  if (!loginBtn || !userInfoEl) return;
  if (spotifyAccessToken && currentUser) {
    loginBtn.classList.add("hidden");
    userInfoEl.classList.remove("hidden");
    if (userNameEl) userNameEl.textContent = `Logged in as ${currentUser.display_name || currentUser.id}`;
  } else {
    loginBtn.classList.remove("hidden");
    userInfoEl.classList.add("hidden");
  }
}

// ---- persist / restore auth ----
function persistAuth() {
  try {
    if (spotifyAccessToken) localStorage.setItem("spotifyAccessToken", spotifyAccessToken);
    if (spotifyRefreshToken) localStorage.setItem("spotifyRefreshToken", spotifyRefreshToken);
    if (currentUser) localStorage.setItem("spotifyUser", JSON.stringify(currentUser));
  } catch (e) {
    console.warn("persistAuth error", e);
  }
}
function restoreAuth() {
  try {
    const tok = localStorage.getItem("spotifyAccessToken");
    const rtok = localStorage.getItem("spotifyRefreshToken");
    const u = localStorage.getItem("spotifyUser");
    if (tok) spotifyAccessToken = tok;
    if (rtok) spotifyRefreshToken = rtok;
    if (u) currentUser = JSON.parse(u);
  } catch (e) {
    console.warn("restoreAuth error", e);
  }
  updateAuthUI();
}

// ---- login flow (popup) ----
async function loginWithSpotify() {
  try {
    console.log("Starting Spotify login...");
    const r = await fetch(`${API_BASE_URL}/login`);
    console.log("/api/login status", r.status);
    if (!r.ok) {
      const t = await r.text();
      console.error("/api/login failed:", t);
      showError("Login server error");
      return;
    }
    const data = await r.json();
    if (!data?.authUrl) {
      console.error("No authUrl in /api/login response:", data);
      showError("Login URL generation failed");
      return;
    }

    const popup = window.open(data.authUrl, "SpotifyLogin", "width=500,height=700");
    if (!popup) { showError("Popup blocked — allow popups for this site"); return; }

    // set up message listener
    function onMessage(e) {
      if (!e?.data) return;
      // NOTE: we accept any origin for now (popup returns script to opener). If you want stricter check, compare e.origin.
      if (e.data.type === "SPOTIFY_AUTH_SUCCESS") {
        spotifyAccessToken = e.data.token;
        spotifyRefreshToken = e.data.refreshToken;
        currentUser = e.data.user;
        persistAuth();
        updateAuthUI();
        console.log("Spotify auth success:", currentUser);
        window.removeEventListener("message", onMessage);
        try { popup.close(); } catch {}
      } else if (e.data.type === "SPOTIFY_AUTH_ERROR") {
        console.error("Auth error from popup:", e.data.error);
        showError("Spotify login failed");
        window.removeEventListener("message", onMessage);
        try { popup.close(); } catch {}
      }
    }
    window.addEventListener("message", onMessage);
  } catch (err) {
    console.error("loginWithSpotify error", err);
    showError("Login failed");
  }
}

// ---- logout ----
function logout() {
  spotifyAccessToken = null;
  spotifyRefreshToken = null;
  currentUser = null;
  localStorage.removeItem("spotifyAccessToken");
  localStorage.removeItem("spotifyRefreshToken");
  localStorage.removeItem("spotifyUser");
  updateAuthUI();
}

// ---- ai playlist fetch (does NOT require login) ----
async function fetchAiPlaylist(mood, language) {
  try {
    const res = await fetch(`${API_BASE_URL}/ai-playlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood, language }),
    });
    const txt = await res.text();
    let data;
    try { data = JSON.parse(txt); } catch { 
      console.warn("AI returned non-JSON; raw:", txt);
      throw new Error("AI returned invalid response");
    }
    if (!res.ok) throw new Error(data.error || "AI failed");
    return data.playlist || [];
  } catch (e) {
    console.error("fetchAiPlaylist error", e);
    showError(e.message || "AI playlist error");
    return [];
  }
}

// ---- display helpers ----
function renderAiSongs(songs) {
  cachedAiSongs = songs || [];
  aiSongList.innerHTML = "";
  if (!cachedAiSongs.length) {
    aiPlaylistSection.classList.add("hidden");
    createPlaylistBtn.disabled = true;
    createPlaylistText.textContent = "No songs";
    return;
  }
  cachedAiSongs.forEach((s, i) => {
    const li = document.createElement("li");
    li.textContent = `${i+1}. ${s.title} — ${s.artist}`;
    aiSongList.appendChild(li);
  });
  aiPlaylistSection.classList.remove("hidden");
  createPlaylistBtn.disabled = !(spotifyAccessToken && currentUser);
  createPlaylistText.textContent = createPlaylistBtn.disabled ? "Login to Create" : "Create Playlist";
}

// ---- handle search ----
async function handleSearch() {
  try {
    const location = locationInput.value.trim();
    const language = languageSelect.value || "english";
    if (!location) return showError("Please enter a location");

    hideAll();
    showLoading(true);

    // 1) call weather-playlist to get mood + weather
    const r = await fetch(`${API_BASE_URL}/weather-playlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location, language }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Weather API failed");

    // normalize mood
    const mood = data?.mood || "relaxed";
    console.log("Weather/mood:", mood);

    // show UI for weather (your displayWeather function can be called if present)
    // (safe: display only if your displayWeather exists)
    if (typeof displayWeather === "function") {
      displayWeather({
        current: {
          condition: { text: data.weather.condition, icon: data.weather.icon },
          temp_c: data.weather.temperature,
          feelslike_c: data.weather.feelsLike,
          humidity: data.weather.humidity,
          wind_kph: data.weather.windSpeed,
        },
        location: data.weather,
      });
    }

    // 2) get AI songs
    const aiSongs = await fetchAiPlaylist(mood, language);
    renderAiSongs(aiSongs);
  } catch (err) {
    console.error("handleSearch error", err);
    showError(err.message || "Search failed");
  } finally {
    showLoading(false);
  }
}

// ---- create playlist (requires login) ----
async function createPlaylist() {
  try {
    if (!spotifyAccessToken || !currentUser) return showError("Login first");
    if (!cachedAiSongs.length) return showError("No songs to add");

    createPlaylistText.textContent = "Creating...";
    createPlaylistBtn.disabled = true;

    // create playlist in user account
    const createRes = await fetch(`https://api.spotify.com/v1/users/${currentUser.id}/playlists`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${spotifyAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `WeatherTunes — ${new Date().toLocaleString()}`,
        description: "Generated by WeatherTunes",
        public: false,
      }),
    });
    const playlistData = await createRes.json();
    if (!createRes.ok) throw new Error(playlistData.error?.message || "Playlist creation failed");

    // search & add tracks
    const uris = [];
    for (const song of cachedAiSongs.slice(0, 35)) {
      const q = encodeURIComponent(`${song.title} ${song.artist}`);
      const sres = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`, {
        headers: { Authorization: `Bearer ${spotifyAccessToken}` },
      });
      const sjson = await sres.json();
      const uri = sjson?.tracks?.items?.[0]?.uri;
      if (uri) uris.push(uri);
    }

    if (uris.length) {
      await fetch(`https://api.spotify.com/v1/playlists/${playlistData.id}/tracks`, {
        method: "POST",
        headers: { Authorization: `Bearer ${spotifyAccessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ uris }),
      });
    }

    playlistLink.href = playlistData.external_urls?.spotify || "#";
    createdPlaylist.classList.remove("hidden");
    createPlaylistText.textContent = "Created ✅";
  } catch (e) {
    console.error("createPlaylist error", e);
    showError(e.message || "Create playlist failed");
  } finally {
    createPlaylistBtn.disabled = false;
  }
}

// ---- attach events after DOM ready ----
document.addEventListener("DOMContentLoaded", () => {
  initElements();
  // attach listeners
  searchBtn?.addEventListener("click", handleSearch);
  loginBtn?.addEventListener("click", loginWithSpotify);
  logoutBtn?.addEventListener("click", logout);
  createPlaylistBtn?.addEventListener("click", createPlaylist);
  locationInput?.addEventListener("keypress", (e) => { if (e.key === "Enter") handleSearch(); });

  restoreAuth();
  updateAuthUI();
  console.log("WeatherTunes app loaded");
});
