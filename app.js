// app.js — final
console.log("WeatherTunes app loaded");

const API_BASE = (typeof window !== "undefined" && window.location.hostname === "localhost") ? "http://localhost:3000/api" : "https://weather-tunes-kappa.vercel.app/api";

let spotifyAccessToken = null;
let spotifyRefreshToken = null;
let currentUser = null;
let cachedAiSongs = [];
let currentMood = null;
let currentLanguage = "english";

// DOM placeholders
let locationInput, languageSelect, searchBtn, loadingEl, weatherCard, playlistCard, errorBox, loginBtn, logoutBtn, userInfo, userName, aiPlaylistSection, aiSongList, createPlaylistBtn, createPlaylistText, playlistLink, createdPlaylist;

function getEls() {
  locationInput = document.getElementById("locationInput");
  languageSelect = document.getElementById("languageSelect");
  searchBtn = document.getElementById("searchBtn");
  loadingEl = document.getElementById("loading");
  weatherCard = document.getElementById("weatherCard");
  playlistCard = document.getElementById("playlistCard");
  errorBox = document.getElementById("error");
  loginBtn = document.getElementById("loginBtn");
  logoutBtn = document.getElementById("logoutBtn");
  userInfo = document.getElementById("userInfo");
  userName = document.getElementById("userName");
  aiPlaylistSection = document.getElementById("aiPlaylistSection");
  aiSongList = document.getElementById("aiSongList");
  createPlaylistBtn = document.getElementById("createPlaylistBtn");
  createPlaylistText = document.getElementById("createPlaylistText");
  playlistLink = document.getElementById("playlistLink");
  createdPlaylist = document.getElementById("createdPlaylist");
}

function showError(msg) {
  console.error(msg);
  if (!errorBox) { alert(msg); return; }
  errorBox.textContent = msg;
  errorBox.classList.remove("hidden");
  setTimeout(()=> errorBox.classList.add("hidden"), 6000);
}

function showLoading(show=true) { loadingEl?.classList.toggle("hidden", !show); }

function hideAll() {
  [weatherCard, playlistCard, aiPlaylistSection, errorBox].forEach(el => el?.classList.add("hidden"));
  if (createPlaylistBtn) { createPlaylistBtn.disabled = true; createPlaylistText.textContent = "Create Playlist"; }
  if (createdPlaylist) createdPlaylist.classList.add("hidden");
}

function updateAuthUI() {
  if (spotifyAccessToken && currentUser) {
    loginBtn?.classList.add("hidden");
    userInfo?.classList.remove("hidden");
    userName && (userName.textContent = `Logged in as ${currentUser.display_name || currentUser.id}`);
  } else {
    loginBtn?.classList.remove("hidden");
    userInfo?.classList.add("hidden");
  }
}

function persistAuth() {
  try {
    if (spotifyAccessToken) localStorage.setItem("spotifyAccessToken", spotifyAccessToken);
    if (spotifyRefreshToken) localStorage.setItem("spotifyRefreshToken", spotifyRefreshToken);
    if (currentUser) localStorage.setItem("spotifyUser", JSON.stringify(currentUser));
  } catch(e) { console.warn(e); }
}
function restoreAuth() {
  try {
    spotifyAccessToken = localStorage.getItem("spotifyAccessToken");
    spotifyRefreshToken = localStorage.getItem("spotifyRefreshToken");
    const u = localStorage.getItem("spotifyUser");
    currentUser = u ? JSON.parse(u) : null;
  } catch(e) { console.warn(e); }
  updateAuthUI();
}

async function loginWithSpotify() {
  try {
    console.log("Starting login...");
    const r = await fetch(`${API_BASE}/login`);
    if (!r.ok) { const t = await r.text(); console.error(t); showError("Login fetch failed"); return; }
    const { authUrl } = await r.json();
    if (!authUrl) { showError("No auth URL"); return; }
    const popup = window.open(authUrl, "SpotifyLogin", "width=500,height=700");
    if (!popup) { showError("Popup blocked — allow popups"); return; }

    function onMessage(e) {
      if (!e?.data) return;
      if (e.data.type === "SPOTIFY_AUTH_SUCCESS") {
        spotifyAccessToken = e.data.token;
        spotifyRefreshToken = e.data.refreshToken;
        currentUser = e.data.user;
        persistAuth();
        updateAuthUI();
        try { popup.close(); } catch {}
        window.removeEventListener("message", onMessage);
      } else if (e.data.type === "SPOTIFY_AUTH_ERROR") {
        showError("Spotify auth error: " + (e.data.error || ""));
        window.removeEventListener("message", onMessage);
      }
    }
    window.addEventListener("message", onMessage);
  } catch (err) {
    console.error("login error", err);
    showError("Login failed");
  }
}

async function fetchAiPlaylist(mood, language) {
  try {
    const r = await fetch(`${API_BASE}/ai-playlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood, language })
    });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch(e) { console.error("AI raw:", text); throw new Error("Invalid AI response"); }
    if (!r.ok) throw new Error(data.error || "AI failed");
    return data.playlist || [];
  } catch (e) {
    console.error("fetchAiPlaylist error", e);
    showError(e.message || "AI playlist failed");
    return [];
  }
}

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
    const li = document.createElement("li"); li.textContent = `${i+1}. ${s.title} — ${s.artist}`; aiSongList.appendChild(li);
  });
  aiPlaylistSection.classList.remove("hidden");
  createPlaylistBtn.disabled = !(spotifyAccessToken && currentUser);
  createPlaylistText.textContent = createPlaylistBtn.disabled ? "Login to Create" : "Create Playlist";
}

async function handleSearch() {
  try {
    const loc = locationInput.value.trim();
    currentLanguage = languageSelect.value || "english";
    if (!loc) return showError("Enter location");
    hideAll(); showLoading(true);

    // weather + mood
    const r = await fetch(`${API_BASE}/weather-playlist`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location: loc, language: currentLanguage })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Weather error");

    // display weather: assume displayWeather function exists in page (or do minimal)
    if (typeof displayWeather === "function") {
      displayWeather({
        current: {
          condition: { text: data.weather.condition, icon: data.weather.icon },
          temp_c: data.weather.temperature,
          feelslike_c: data.weather.feelsLike,
          humidity: data.weather.humidity,
          wind_kph: data.weather.windSpeed
        },
        location: data.weather
      });
    }

    const mood = data.mood || "relaxed";
    currentMood = mood;
    // fetch ai playlist (doesn't require login)
    const songs = await fetchAiPlaylist(mood, currentLanguage);
    renderAiSongs(songs);
  } catch (e) {
    console.error("handleSearch error", e);
    showError(e.message || "Search failed");
  } finally {
    showLoading(false);
  }
}

async function createSpotifyPlaylist() {
  try {
    if (!spotifyAccessToken || !currentUser) return showError("Login first");
    if (!cachedAiSongs.length) return showError("No songs to create playlist");

    createPlaylistBtn.disabled = true; createPlaylistText.textContent = "Creating...";

    // create playlist
    const createRes = await fetch(`https://api.spotify.com/v1/users/${currentUser.id}/playlists`, {
      method: "POST",
      headers: { Authorization: `Bearer ${spotifyAccessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `WeatherTunes — ${currentMood?.type || currentMood || "Vibes"}`,
        description: `Auto-generated playlist`,
        public: false
      })
    });

    if (createRes.status === 401) {
      // token expired — prompt user to re-login
      showError("Spotify token expired - please login again");
      createPlaylistBtn.disabled = false;
      createPlaylistText.textContent = "Create Playlist";
      return;
    }

    const playlistData = await createRes.json();
    if (!playlistData.id) throw new Error("Playlist creation failed");

    // search tracks and add
    const uris = [];
    for (const s of cachedAiSongs.slice(0,35)) {
      const q = encodeURIComponent(`${s.title} ${s.artist}`);
      const sr = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`, { headers: { Authorization: `Bearer ${spotifyAccessToken}` } });
      const sj = await sr.json();
      const uri = sj?.tracks?.items?.[0]?.uri;
      if (uri) uris.push(uri);
    }

    if (uris.length) {
      await fetch(`https://api.spotify.com/v1/playlists/${playlistData.id}/tracks`, {
        method: "POST",
        headers: { Authorization: `Bearer ${spotifyAccessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ uris })
      });
    }

    playlistLink.href = playlistData.external_urls?.spotify || "#";
    if (createdPlaylist) createdPlaylist.classList.remove("hidden");
    createPlaylistText.textContent = "Playlist Created ✅";
    console.log("Playlist created:", playlistData.external_urls?.spotify);
  } catch (e) {
    console.error("createSpotifyPlaylist error", e);
    showError(e.message || "Create failed");
  } finally {
    createPlaylistBtn.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  getEls();
  restoreAuth();
  updateAuthUI();

  searchBtn?.addEventListener("click", handleSearch);
  loginBtn?.addEventListener("click", loginWithSpotify);
  logoutBtn?.addEventListener("click", () => { localStorage.clear(); restoreAuth(); updateAuthUI(); });
  createPlaylistBtn?.addEventListener("click", createSpotifyPlaylist);
  locationInput?.addEventListener("keypress", (e) => { if (e.key === "Enter") handleSearch(); });

  console.log("UI ready");
});
