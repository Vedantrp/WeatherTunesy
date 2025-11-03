// WeatherTunes – FINAL Frontend Application
// =========================================

// === API BASE URL =========================================================
const getApiBaseUrl = () => {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:3000/api";
  }
  return "https://weather-tunes-kappa.vercel.app/api"; // your Vercel backend
};
const API_BASE_URL = getApiBaseUrl();

// === GLOBAL STATE =========================================================
let spotifyAccessToken = null;
let spotifyRefreshToken = null;
let currentUser = null;
let currentWeatherData = null;
let currentMoodData = null;
let currentLanguage = "english";
let cachedAiSongs = [];

// === DOM ELEMENTS =========================================================
const locationInput = document.getElementById("locationInput");
const languageSelect = document.getElementById("languageSelect");
const searchBtn = document.getElementById("searchBtn");
const loading = document.getElementById("loading");
const weatherCard = document.getElementById("weatherCard");
const playlistCard = document.getElementById("playlistCard");
const errorBox = document.getElementById("error");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userInfo = document.getElementById("userInfo");
const userName = document.getElementById("userName");
const cityName = document.getElementById("cityName");
const dateTime = document.getElementById("dateTime");
const temperature = document.getElementById("temperature");
const weatherDescription = document.getElementById("weatherDescription");
const weatherIcon = document.getElementById("weatherIcon");
const feelsLike = document.getElementById("feelsLike");
const humidity = document.getElementById("humidity");
const windSpeed = document.getElementById("windSpeed");
const moodType = document.getElementById("moodType");
const playlistSuggestion = document.getElementById("playlistSuggestion");
const genreTags = document.getElementById("genreTags");
const createPlaylistBtn = document.getElementById("createPlaylistBtn");
const createPlaylistText = document.getElementById("createPlaylistText");
const openSpotifyBtn = document.getElementById("openSpotifyBtn");
const createdPlaylist = document.getElementById("createdPlaylist");
const playlistLink = document.getElementById("playlistLink");
const aiPlaylistSection = document.getElementById("aiPlaylistSection");
const aiSongList = document.getElementById("aiSongList");

// === HELPERS ==============================================================
function getMoodEmoji(mood) {
  const emojiMap = {
    upbeat: "☀️",
    cozy: "🌧️",
    relaxed: "☁️",
    balanced: "⛅",
    calm: "❄️",
    mysterious: "🌫️",
    energetic: "💨",
    intense: "⛈️",
    tropical: "🌴",
    warm: "🔥",
  };
  return emojiMap[mood?.toLowerCase()] || "🎶";
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
  setTimeout(() => errorBox.classList.add("hidden"), 6000);
}

function hideAll() {
  weatherCard.classList.add("hidden");
  playlistCard.classList.add("hidden");
  aiPlaylistSection.classList.add("hidden");
  errorBox.classList.add("hidden");
}

// === DISPLAY FUNCTIONS ====================================================
function displayWeather(data) {
  const weather = data.current;
  const location = data.location;

  cityName.textContent = `${location.location}, ${location.country}`;
  dateTime.textContent = formatDateTime(location.localtime);
  temperature.textContent = `${Math.round(weather.temp_c)}°C`;
  weatherDescription.textContent = weather.condition.text;
  weatherIcon.src = weather.condition.icon;
  weatherIcon.alt = weather.condition.text;
  feelsLike.textContent = `${Math.round(weather.feelslike_c)}°C`;
  humidity.textContent = `${weather.humidity}%`;
  windSpeed.textContent = `${weather.wind_kph} km/h`;

  weatherCard.classList.remove("hidden");
}

function displayPlaylistSuggestion(combinedData) {
  const moodData = combinedData?.mood || combinedData;
  const moodObj =
    typeof moodData === "string"
      ? { type: moodData, genres: [] }
      : moodData?.type
      ? moodData
      : { type: moodData, genres: [] };

  currentMoodData = moodObj;
  moodType.textContent = moodObj.type || "Unknown";
  playlistSuggestion.textContent = `${getMoodEmoji(
    moodObj.type
  )} Perfect for ${moodObj.type} weather!`;

  genreTags.innerHTML = "";
  (moodObj.genres || []).forEach((g) => {
    const tag = document.createElement("span");
    tag.className = "genre-tag";
    tag.textContent = g;
    genreTags.appendChild(tag);
  });

  const primary = (moodObj.genres && moodObj.genres[0]) || moodObj.type;
  const spotifySearchUrl = `https://open.spotify.com/search/${encodeURIComponent(
    `${primary} ${currentLanguage} playlist`
  )}`;
  openSpotifyBtn.onclick = () => window.open(spotifySearchUrl, "_blank");

  playlistCard.classList.remove("hidden");
}

function displayAiSongsAndEnableCreation(aiSongs) {
  cachedAiSongs = aiSongs || [];
  aiSongList.innerHTML = "";

  if (!cachedAiSongs.length) {
    aiPlaylistSection.classList.add("hidden");
    createPlaylistBtn.disabled = true;
    createPlaylistText.textContent = "No songs found";
    return;
  }

  cachedAiSongs.forEach((song, index) => {
    const li = document.createElement("li");
    li.className = "ai-song-item hover:bg-gray-800 px-3 py-1 rounded-lg transition";
    li.textContent = `${index + 1}. ${song.title} — ${song.artist}`;
    aiSongList.appendChild(li);
  });

  aiPlaylistSection.classList.remove("hidden");

  if (spotifyAccessToken && currentUser) {
    createPlaylistBtn.disabled = false;
    createPlaylistText.textContent = "Create Playlist";
  } else {
    createPlaylistBtn.disabled = true;
    createPlaylistText.textContent = "Login to Create";
  }

  createPlaylistBtn.style.cursor = "pointer";
}

// === AUTH =================================================================
function updateAuthUI() {
  if (spotifyAccessToken && currentUser) {
    loginBtn.classList.add("hidden");
    userInfo.classList.remove("hidden");
    userName.textContent = `Logged in as ${currentUser.display_name || currentUser.id}`;
  } else {
    loginBtn.classList.remove("hidden");
    userInfo.classList.add("hidden");
  }
}

function logout() {
  spotifyAccessToken = null;
  spotifyRefreshToken = null;
  currentUser = null;
  localStorage.clear();
  updateAuthUI();
  createPlaylistBtn.disabled = true;
  createdPlaylist.classList.add("hidden");
  cachedAiSongs = [];
}

function restoreAuth() {
  const token = localStorage.getItem("spotifyAccessToken");
  const refreshToken = localStorage.getItem("spotifyRefreshToken");
  const userStr = localStorage.getItem("spotifyUser");
  if (token && refreshToken && userStr) {
    spotifyAccessToken = token;
    spotifyRefreshToken = refreshToken;
    currentUser = JSON.parse(userStr);
    updateAuthUI();
  }
}

// === LOGIN HANDLER ========================================================
async function loginWithSpotify() {
  try {
    console.log("🟢 Starting Spotify login flow...");
    const res = await fetch(`${API_BASE_URL}/login`);
    console.log("Response from /api/login:", res.status);

    if (!res.ok) {
      const text = await res.text();
      console.error("❌ /api/login failed:", text);
      showError("Spotify login failed (server error).");
      return;
    }

    const data = await res.json();
    console.log("Auth URL received:", data);

    if (!data.authUrl) {
      showError("Spotify auth URL missing from server.");
      return;
    }

    const popup = window.open(data.authUrl, "Spotify Login", "width=500,height=700");
    if (!popup) {
      showError("Popup blocked! Allow popups for this site.");
      return;
    }

    const listener = (event) => {
      if (event.data.type === "SPOTIFY_AUTH_SUCCESS") {
        spotifyAccessToken = event.data.token;
        spotifyRefreshToken = event.data.refreshToken;
        currentUser = event.data.user;
        localStorage.setItem("spotifyAccessToken", spotifyAccessToken);
        localStorage.setItem("spotifyRefreshToken", spotifyRefreshToken);
        localStorage.setItem("spotifyUser", JSON.stringify(currentUser));
        updateAuthUI();
        popup.close();
        window.removeEventListener("message", listener);
      }
    };

    window.addEventListener("message", listener);
  } catch (err) {
    console.error("⚠️ LoginWithSpotify error:", err);
    showError("Login failed: " + (err.message || err));
  }
}

// === AI PLAYLIST ==========================================================
async function fetchAiPlaylist(mood, language) {
  try {
    const res = await fetch(`${API_BASE_URL}/ai-playlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood, language, limit: 35 }),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("Invalid JSON returned from AI API:", text);
      throw new Error("AI playlist generation failed");
    }

    if (!res.ok) throw new Error(data?.error || "AI playlist generation failed");
    return data.playlist || [];
  } catch (e) {
    console.error("AI Playlist Error:", e);
    showError(e.message || "AI playlist could not be created.");
    return [];
  }
}

// === WEATHER + PLAYLIST ===================================================
async function fetchAiPlaylist(mood, language) {
  try {
    const res = await fetch(`${API_BASE_URL}/ai-playlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood, language }),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("Invalid AI response:", text);
      throw new Error("AI returned invalid data");
    }

    if (!res.ok) throw new Error(data.error || "AI playlist generation failed");
    return data.playlist || [];
  } catch (e) {
    console.error("AI Playlist Error:", e);
    showError(e.message || "AI playlist could not be created.");
    return [];
  }
}


// === SPOTIFY PLAYLIST CREATION ===========================================
async function createSpotifyPlaylist() {
  if (!spotifyAccessToken || !currentUser) return showError("Please login first.");
  if (!cachedAiSongs.length) return showError("No songs to create a playlist.");

  try {
    createPlaylistText.textContent = "Creating...";
    createPlaylistBtn.disabled = true;

    const playlistName = `WeatherTunes – ${currentMoodData?.type || "Vibes"} Mood`;
    const playlistDesc = `AI playlist for ${currentLanguage} mood 🌦️`;

    const createRes = await fetch(
      `https://api.spotify.com/v1/users/${currentUser.id}/playlists`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${spotifyAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: playlistName, description: playlistDesc, public: false }),
      }
    );

    const playlistData = await createRes.json();
    const trackUris = [];

    for (const song of cachedAiSongs.slice(0, 35)) {
      const q = encodeURIComponent(`${song.title} ${song.artist}`);
      const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`, {
        headers: { Authorization: `Bearer ${spotifyAccessToken}` },
      });
      const searchData = await searchRes.json();
      const uri = searchData?.tracks?.items?.[0]?.uri;
      if (uri) trackUris.push(uri);
    }

    if (trackUris.length)
      await fetch(`https://api.spotify.com/v1/playlists/${playlistData.id}/tracks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${spotifyAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uris: trackUris }),
      });

    createdPlaylist.classList.remove("hidden");
    playlistLink.href = playlistData.external_urls.spotify;
    createPlaylistText.textContent = "Playlist Created ✅";
  } catch (err) {
    console.error("Playlist create failed:", err);
    showError(err.message);
  } finally {
    createPlaylistBtn.disabled = false;
  }
}

// === EVENTS ==============================================================
searchBtn.addEventListener("click", handleSearch);
loginBtn.addEventListener("click", loginWithSpotify);
logoutBtn.addEventListener("click", logout);
createPlaylistBtn.addEventListener("click", createSpotifyPlaylist);
locationInput.addEventListener("keypress", (e) => e.key === "Enter" && handleSearch());

// === INIT ================================================================
restoreAuth();

