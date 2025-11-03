// app.js - final frontend (trimmed comments)
const getApiBaseUrl = () => {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:3000/api";
  }
  return "/api"; // use same origin to avoid CORS complexity
};
const API_BASE_URL = getApiBaseUrl();

let spotifyAccessToken = null;
let spotifyRefreshToken = null;
let currentUser = null;
let currentWeatherData = null;
let currentMoodData = null;
let currentLanguage = "english";
let cachedAiSongs = [];

// DOM elements
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

// helpers
function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
  setTimeout(() => errorBox.classList.add("hidden"), 7000);
}
function hideAll() {
  weatherCard.classList.add("hidden");
  playlistCard.classList.add("hidden");
  aiPlaylistSection.classList.add("hidden");
  errorBox.classList.add("hidden");
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

// display weather
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

// display playlist suggestion
function displayPlaylistSuggestion(combinedData) {
  const moodData = combinedData?.mood || combinedData;
  const moodObj = typeof moodData === "string" ? { type: moodData, genres: [] } : moodData;
  currentMoodData = moodObj;
  moodType.textContent = moodObj.type || "Unknown";
  playlistSuggestion.textContent = `${getMoodEmoji(moodObj.type)} Perfect for ${moodObj.type} weather!`;
  genreTags.innerHTML = "";
  (moodObj.genres || []).forEach((g) => {
    const tag = document.createElement("span");
    tag.className = "genre-tag";
    tag.textContent = g;
    genreTags.appendChild(tag);
  });
  playlistCard.classList.remove("hidden");
}

// show AI songs and enable creation (up to 35)
function displayAiSongsAndEnableCreation(aiSongs) {
  cachedAiSongs = (aiSongs || []).slice(0, 35); // enforce max 35
  aiSongList.innerHTML = "";

  if (!cachedAiSongs.length) {
    aiPlaylistSection.classList.add("hidden");
    createPlaylistBtn.disabled = true;
    createPlaylistText.textContent = "No songs found";
    return;
  }

  cachedAiSongs.forEach((song, i) => {
    const li = document.createElement("li");
    li.className = "ai-song-item";
    // show language badge
    const lang = song.language || currentLanguage || "unknown";
    li.innerHTML = `<strong>${i + 1}. ${song.title}</strong> — ${song.artist} <span class="lang-badge" style="margin-left:8px;font-size:0.8em;color:#bbb;">${lang}</span>`;
    aiSongList.appendChild(li);
  });

  aiPlaylistSection.classList.remove("hidden");
  playlistCard.classList.remove("hidden");

  if (spotifyAccessToken && currentUser) {
    createPlaylistBtn.disabled = false;
    createPlaylistText.textContent = "Create Playlist";
    createPlaylistBtn.classList.remove("opacity-50");
  } else {
    createPlaylistBtn.disabled = true;
    createPlaylistText.textContent = "Login to Create";
    createPlaylistBtn.classList.add("opacity-50");
  }

  createPlaylistBtn.style.cursor = "pointer";
}

// AUTH handlers (same as before)
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

// SPOTIFY login open popup
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
      } else if (e.data.error) {
        showError("Spotify auth failed: " + e.data.error);
        window.removeEventListener("message", listener);
      }
    };
    window.addEventListener("message", listener);
  } catch (e) {
    showError("Spotify login failed: " + e.message);
  }
}

// Safe AI fetch with text-parsing
async function fetchAiPlaylist(mood, language) {
  try {
    const res = await fetch(`${API_BASE_URL}/ai-playlist`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    mood: data.mood?.type || data.mood || "relaxed",
    language: currentLanguage,
    token: spotifyAccessToken || null,
  }),
});


    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("Invalid JSON returned from AI API:", text);
      throw new Error("Invalid AI response");
    }

    if (!res.ok) {
      throw new Error(data?.error || "AI playlist generation failed");
    }

    // Ensure each item has language field
    const normalized = (data.playlist || []).map((s) => ({
      title: s.title || s.name || "",
      artist: s.artist || s.singer || s.by || "",
      language: s.language || language,
    }));
    return normalized;
  } catch (e) {
    console.error("AI Playlist Error:", e);
    showError(e.message || "AI playlist could not be created.");
    return [];
  }
}

// WEATHER + AI orchestration
async function handleSearch() {
  const location = locationInput.value.trim();
  currentLanguage = languageSelect.value || "english";
  if (!location) return showError("Please enter a location");

  hideAll();
  loading.classList.remove("hidden");

  try {
   const res = await fetch(`${API_BASE_URL}/ai-playlist`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    mood,
    language,
    token: spotifyAccessToken || null, // 👈 send logged-in user’s token
  }),
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
    currentMoodData = data.mood || data.moodType || "balanced";

    displayWeather(currentWeatherData);
    playlistSuggestion.textContent = "Curating playlist using AI...";

    const aiSongs = await fetchAiPlaylist(data.mood || "balanced", currentLanguage);


    displayPlaylistSuggestion({ mood: data.mood || currentMoodData });
    displayAiSongsAndEnableCreation(aiSongs);
  } catch (err) {
    showError(`Error: ${err.message}`);
  } finally {
    loading.classList.add("hidden");
  }
}

// CREATE playlist on Spotify (uses cachedAiSongs - up to 35)
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

    const playlistName = `WeatherTunes – ${currentMoodData?.type || "Vibes"} Mood`;
    const playlistDesc = `Auto-generated playlist for ${currentMoodData?.type || "your"} weather mood 🌦️`;

    const createRes = await fetch(`https://api.spotify.com/v1/users/${currentUser.id}/playlists`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${spotifyAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: playlistName, description: playlistDesc, public: false }),
    });

    if (createRes.status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) return createSpotifyPlaylist();
      throw new Error("Spotify token expired. Please login again.");
    }

    const playlistData = await createRes.json();
    if (!playlistData.id) throw new Error("Failed to create playlist.");

    // search each song; collect URIs (limit rate by 35)
    const trackUris = [];
    for (const song of cachedAiSongs) {
      const q = encodeURIComponent(`${song.title} ${song.artist}`);
      const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`, {
        headers: { Authorization: `Bearer ${spotifyAccessToken}` },
      });
      const searchData = await searchRes.json();
      const uri = searchData?.tracks?.items?.[0]?.uri;
      if (uri) trackUris.push(uri);
    }

    if (trackUris.length > 0) {
      await fetch(`https://api.spotify.com/v1/playlists/${playlistData.id}/tracks`, {
        method: "POST",
        headers: { Authorization: `Bearer ${spotifyAccessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ uris: trackUris }),
      });
    }

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

// small success toast
function showSuccessToast(msg) {
  const toast = document.createElement("div");
  toast.textContent = msg;
  toast.className = "fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// events
searchBtn.addEventListener("click", handleSearch);
loginBtn.addEventListener("click", loginWithSpotify);
logoutBtn.addEventListener("click", logout);
createPlaylistBtn.addEventListener("click", createSpotifyPlaylist);
locationInput.addEventListener("keypress", (e) => e.key === "Enter" && handleSearch());

// init
restoreAuth();



