// WeatherTunes – Final Frontend Application

// =======================================================================================
// === API BASE URL =====================================================================
// =======================================================================================
const getApiBaseUrl = () => {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:3000/api";
  }
  return "/api";

};
const API_BASE_URL = getApiBaseUrl();

// =======================================================================================
// === GLOBAL STATE =====================================================================
// =======================================================================================
let spotifyAccessToken = null;
let spotifyRefreshToken = null;
let currentUser = null;
let currentWeatherData = null;
let currentMoodData = null;
let currentLanguage = "english";
let cachedAiSongs = [];

// =======================================================================================
// === DOM ELEMENTS =====================================================================
// =======================================================================================
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

// =======================================================================================
// === HELPER FUNCTIONS ================================================================
// =======================================================================================
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

// =======================================================================================
// === DISPLAY FUNCTIONS ===============================================================
// =======================================================================================
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

  let spotifySearchUrl = combinedData?.spotifySearchUrl || "";
  if (!spotifySearchUrl) {
    const primary = (moodObj.genres && moodObj.genres[0]) || moodObj.type;
    spotifySearchUrl = `https://open.spotify.com/search/${encodeURIComponent(
      primary + " playlist"
    )}`;
  }
  openSpotifyBtn.onclick = () => window.open(spotifySearchUrl, "_blank");

  playlistCard.classList.remove("hidden");
}

// =======================================================================================
// === RENDER AI SONGS + ENABLE PLAYLIST CREATION =======================================
// =======================================================================================

function displayAiSongsAndEnableCreation(aiSongs) {
  cachedAiSongs = aiSongs || [];
  aiSongList.innerHTML = "";

  if (!cachedAiSongs.length) {
    aiPlaylistSection.classList.add("hidden");
    // Still allow playlist creation even if empty (for testing)
    createPlaylistBtn.disabled = false;
    createPlaylistText.textContent = "Create Empty Playlist";
    createPlaylistBtn.classList.remove("opacity-50", "cursor-not-allowed");
    createPlaylistBtn.style.cursor = "pointer";
    return;
  }

  // Normal case — AI gave you songs
  cachedAiSongs.forEach((song, index) => {
    const li = document.createElement("li");
    li.className =
      "ai-song-item hover:bg-gray-800 px-3 py-1 rounded-lg transition";
    li.textContent = `${index + 1}. ${song.title} — ${song.artist}`;
    aiSongList.appendChild(li);
  });

  aiPlaylistSection.classList.remove("hidden");
  playlistCard.classList.remove("hidden");

  if (spotifyAccessToken && currentUser) {
    createPlaylistBtn.disabled = false;
    createPlaylistText.textContent = "Create Playlist";
    createPlaylistBtn.classList.remove("opacity-50", "cursor-not-allowed");
  } else {
    createPlaylistBtn.disabled = true;
    createPlaylistText.textContent = "Login to Create";
    createPlaylistBtn.classList.add("opacity-50", "cursor-not-allowed");
  }

  createPlaylistBtn.style.cursor = "pointer";
}

// =======================================================================================
// === AUTHENTICATION ===================================================================
// =======================================================================================
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

async function refreshAccessToken() {
  if (!spotifyRefreshToken) return false;
  try {
    const response = await fetch(`${API_BASE_URL}/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: spotifyRefreshToken }),
    });
    const data = await response.json();
    if (data.accessToken) {
      spotifyAccessToken = data.accessToken;
      localStorage.setItem("spotifyAccessToken", spotifyAccessToken);
      return true;
    }
  } catch (err) {
    console.error("Token refresh failed:", err);
  }
  return false;
}

async function loginWithSpotify() {
  try {
    const res = await fetch(`${API_BASE_URL}/login`);
    const data = await res.json();
    const popup = window.open(data.authUrl, "Spotify Login", "width=500,height=700");

    const listener = (e) => {
      if (e.data.type === "SPOTIFY_AUTH_SUCCESS") {
        spotifyAccessToken = e.data.token;
        spotifyRefreshToken = e.data.refreshToken;
        currentUser = e.data.user;

        localStorage.setItem("spotifyAccessToken", spotifyAccessToken);
        localStorage.setItem("spotifyRefreshToken", spotifyRefreshToken);
        localStorage.setItem("spotifyUser", JSON.stringify(currentUser));
        updateAuthUI();
        popup.close();
        window.removeEventListener("message", listener);
      }
    };
    window.addEventListener("message", listener);
  } catch (e) {
    showError("Spotify login failed: " + e.message);
  }
}

// =======================================================================================
// === AI PLAYLIST FETCH ================================================================
async function fetchAiPlaylist(mood, language) {
  try {
    const res = await fetch(`${API_BASE_URL}/ai-playlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood, language }),
    });

    // 🧠 Safely handle non-JSON responses
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("Invalid JSON returned from AI API:", text);
      throw new Error("AI service returned invalid data");
    }

    if (!res.ok) {
      throw new Error(data?.error || "AI playlist generation failed");
    }

    return data.playlist || [];
  } catch (e) {
    console.error("AI Playlist Error:", e);
    showError(e.message || "AI playlist could not be created.");
    return [];
  }
}


// =======================================================================================
// === WEATHER + AI PLAYLIST ============================================================
async function handleSearch() {
  const location = locationInput.value.trim();
  currentLanguage = languageSelect.value || "english";
  if (!location) return showError("Please enter a location");

  hideAll();
  loading.classList.remove("hidden");

  try {
    const res = await fetch(`${API_BASE_URL}/weather-playlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location, language: currentLanguage }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch weather data.");

    currentWeatherData = {
      current: {
        condition: { text: data.weather.condition, icon: data.weather.icon },
        temp_c: data.weather.temperature,
        feelslike_c: data.weather.feelsLike,
        humidity: data.weather.humidity,
        wind_kph: data.weather.windSpeed,
      },
      location: data.weather,
    };

    displayWeather(currentWeatherData);
    playlistSuggestion.textContent = "Curating playlist using AI...";

    const aiSongs = await fetchAiPlaylist(data.mood, currentLanguage);

    displayPlaylistSuggestion(data);
    displayAiSongsAndEnableCreation(aiSongs);
  } catch (err) {
    showError(err.message);
  } finally {
    loading.classList.add("hidden");
  }
}

// =======================================================================================
// === EVENT LISTENERS =================================================================
searchBtn.addEventListener("click", handleSearch);
loginBtn.addEventListener("click", loginWithSpotify);
logoutBtn.addEventListener("click", logout);
locationInput.addEventListener("keypress", (e) => e.key === "Enter" && handleSearch());

// =======================================================================================
// === INIT ============================================================================
restoreAuth();
// =======================================================================================
// === SPOTIFY PLAYLIST CREATION =========================================================
// =======================================================================================

// =======================================================================================
// === SPOTIFY PLAYLIST CREATION =========================================================
// =======================================================================================

async function createSpotifyPlaylist() {
  if (!spotifyAccessToken || !currentUser) {
    showError("Please login to Spotify first.");
    return;
  }

  if (!cachedAiSongs || cachedAiSongs.length === 0) {
    showError("No songs available to create a playlist.");
    return;
  }

  try {
    createPlaylistText.textContent = "Creating...";
    createPlaylistBtn.disabled = true;

    // 1️⃣ Create a new playlist for the user
    const playlistName = `WeatherTunes – ${currentMoodData?.type || "Vibes"} Mood`;
    const playlistDesc = `Auto-generated playlist for ${currentMoodData?.type || "your"} weather mood 🌦️`;

    const createRes = await fetch(
      `https://api.spotify.com/v1/users/${currentUser.id}/playlists`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${spotifyAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: playlistName,
          description: playlistDesc,
          public: false,
        }),
      }
    );

    if (createRes.status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) return createSpotifyPlaylist(); // retry after refresh
      throw new Error("Spotify token expired. Please login again.");
    }

    const playlistData = await createRes.json();
    if (!playlistData.id) throw new Error("Failed to create playlist.");

    // 2️⃣ Search each AI song and collect Spotify track URIs
    const trackUris = [];
    for (const song of cachedAiSongs) {
      const q = encodeURIComponent(`${song.title} ${song.artist}`);
      const searchRes = await fetch(
        `https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`,
        {
          headers: { Authorization: `Bearer ${spotifyAccessToken}` },
        }
      );

      const searchData = await searchRes.json();
      const uri = searchData?.tracks?.items?.[0]?.uri;
      if (uri) trackUris.push(uri);
    }

    // 3️⃣ Add songs to the playlist
    if (trackUris.length > 0) {
      await fetch(
        `https://api.spotify.com/v1/playlists/${playlistData.id}/tracks`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${spotifyAccessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ uris: trackUris }),
        }
      );
    }

    // 4️⃣ Display success and show link
    createdPlaylist.classList.remove("hidden");
    playlistLink.href = playlistData.external_urls.spotify;
    playlistLink.textContent = "Open in Spotify";
    createPlaylistText.textContent = "Playlist Created ✅";
    showSuccessToast("Your AI playlist is ready!");
  } catch (err) {
    console.error("Create playlist failed:", err);
    showError(err.message);
  } finally {
    createPlaylistBtn.disabled = false;
  }
}

// ✅ Helper to show small success toast
function showSuccessToast(msg) {
  const toast = document.createElement("div");
  toast.textContent = msg;
  toast.className =
    "fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// =======================================================================================
// === EVENT: CREATE PLAYLIST BUTTON =====================================================
// =======================================================================================

createPlaylistBtn.addEventListener("click", createSpotifyPlaylist);

// =======================================================================================
// === INIT (Ensure everything runs) =====================================================
// =======================================================================================

restoreAuth();




