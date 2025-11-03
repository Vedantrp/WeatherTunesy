// ======================= WeatherTunes Final Frontend ================================
console.log("WeatherTunes app loaded");

// ======================= API BASE URL ===============================================
const getApiBaseUrl = () => {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:3000/api";
  }
  return "https://weather-tunes-kappa.vercel.app/api";
};
const API_BASE_URL = getApiBaseUrl();

// ======================= GLOBAL STATE ================================================
let spotifyAccessToken = null;
let spotifyRefreshToken = null;
let currentUser = null;
let currentWeatherData = null;
let currentMoodData = null;
let currentLanguage = "english";
let cachedAiSongs = [];

// ======================= DOM ELEMENTS ===============================================
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

// ======================= UI HELPERS ==================================================
function showLoading(show = true) {
  if (!loading) return;
  loading.classList.toggle("hidden", !show);
}

function hideAll() {
  [weatherCard, playlistCard, aiPlaylistSection, errorBox].forEach((el) =>
    el?.classList.add("hidden")
  );
  if (createPlaylistBtn) {
    createPlaylistBtn.disabled = true;
    createPlaylistText.textContent = "Create Playlist";
  }
  if (createdPlaylist) createdPlaylist.classList.add("hidden");
}

function showError(message) {
  console.error("❌", message);
  if (errorBox) {
    errorBox.textContent = message;
    errorBox.classList.remove("hidden");
    setTimeout(() => errorBox.classList.add("hidden"), 6000);
  } else {
    alert(message);
  }
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

// ======================= DISPLAY FUNCTIONS ===========================================
function displayWeather(data) {
  if (!data || !data.current || !data.location) return;

  const weather = data.current;
  const loc = data.location;

  cityName.textContent = `${loc.location}, ${loc.country}`;
  dateTime.textContent = formatDateTime(loc.localtime);
  temperature.textContent = Math.round(weather.temp_c);
  weatherDescription.textContent = weather.condition.text;
  weatherIcon.src = weather.condition.icon;
  feelsLike.textContent = `${Math.round(weather.feelslike_c)}°C`;
  humidity.textContent = `${weather.humidity}%`;
  windSpeed.textContent = `${weather.wind_kph} km/h`;

  weatherCard.classList.remove("hidden");
}

function displayPlaylistSuggestion(moodObj) {
  if (!moodObj) return;
  const type = moodObj.type || "Unknown";
  currentMoodData = moodObj;

  moodType.textContent = type;
  playlistSuggestion.textContent = `${getMoodEmoji(type)} Perfect for ${type} weather!`;
  genreTags.innerHTML = "";

  (moodObj.genres || []).forEach((g) => {
    const tag = document.createElement("span");
    tag.className = "genre-tag";
    tag.textContent = g;
    genreTags.appendChild(tag);
  });

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

  cachedAiSongs.forEach((song, i) => {
    const li = document.createElement("li");
    li.className = "ai-song-item";
    li.textContent = `${i + 1}. ${song.title} — ${song.artist}`;
    aiSongList.appendChild(li);
  });

  aiPlaylistSection.classList.remove("hidden");
  createPlaylistBtn.disabled = false;
  createPlaylistText.textContent = "Create Playlist";
}

// ======================= AUTH / SPOTIFY ==============================================
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
  spotifyAccessToken = localStorage.getItem("spotifyAccessToken");
  spotifyRefreshToken = localStorage.getItem("spotifyRefreshToken");
  const userStr = localStorage.getItem("spotifyUser");
  if (spotifyAccessToken && spotifyRefreshToken && userStr) {
    currentUser = JSON.parse(userStr);
    updateAuthUI();
  }
}

// ======================= FETCH WEATHER + AI PLAYLIST ==================================
async function fetchAiPlaylist(mood, language) {
  if (!spotifyAccessToken) {
    throw new Error("Missing Spotify token (login required)");
  }

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
      console.error("Invalid JSON from AI API:", text);
      throw new Error("Invalid AI response");
    }

    if (!res.ok) throw new Error(data?.error || "AI playlist generation failed");
    return data.playlist || [];
  } catch (e) {
    console.error("AI Playlist Error:", e);
    showError(e.message);
    return [];
  }
}

async function handleSearch() {
  const location = locationInput.value.trim();
  currentLanguage = languageSelect.value || "english";
  if (!location) return showError("Please enter a location");

  hideAll();
  showLoading(true);

  try {
    const res = await fetch(`${API_BASE_URL}/weather-playlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location, language: currentLanguage }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Weather fetch failed");

    console.log("Weather/mood:", data.mood?.type || data.mood);
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

    displayPlaylistSuggestion(data.mood);
    const aiSongs = await fetchAiPlaylist(data.mood, currentLanguage);
    displayAiSongsAndEnableCreation(aiSongs);
  } catch (err) {
    showError(err.message);
  } finally {
    showLoading(false);
  }
}

// ======================= EVENTS =======================================================
searchBtn.addEventListener("click", handleSearch);
loginBtn.addEventListener("click", loginWithSpotify);
logoutBtn.addEventListener("click", logout);
locationInput.addEventListener("keypress", (e) => e.key === "Enter" && handleSearch());
async function createSpotifyPlaylist() {
  try {
    // Check Spotify login
    if (!spotifyAccessToken || !currentUser) {
      showError("Please login to Spotify first.");
      return;
    }

    // Check AI songs
    if (!cachedAiSongs.length) {
      showError("No songs available to create a playlist.");
      return;
    }

    // Disable button while creating
    createPlaylistBtn.disabled = true;
    createPlaylistText.textContent = "Creating...";

    // 1️⃣ Create playlist on Spotify
    const playlistRes = await fetch(
      `https://api.spotify.com/v1/users/${currentUser.id}/playlists`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${spotifyAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `WeatherTunes – ${currentMoodData?.type || "Vibes"}`,
          description: `Auto-generated ${currentLanguage} songs for ${currentMoodData?.type || "your"} mood 🌦️`,
          public: false,
        }),
      }
    );

    if (playlistRes.status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) return createSpotifyPlaylist(); // retry after token refresh
      throw new Error("Spotify token expired. Please login again.");
    }

    const playlistData = await playlistRes.json();
    if (!playlistData.id) throw new Error("Failed to create playlist.");

    // 2️⃣ Search each AI song and collect track URIs
    const trackUris = [];
    for (const song of cachedAiSongs.slice(0, 35)) {
      const query = encodeURIComponent(`${song.title} ${song.artist}`);
      const searchRes = await fetch(
        `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`,
        { headers: { Authorization: `Bearer ${spotifyAccessToken}` } }
      );
      const searchData = await searchRes.json();
      const uri = searchData?.tracks?.items?.[0]?.uri;
      if (uri) trackUris.push(uri);
    }

    // 3️⃣ Add tracks to the playlist
    if (trackUris.length) {
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

    // 4️⃣ Update UI
    createdPlaylist.classList.remove("hidden");
    playlistLink.href = playlistData.external_urls.spotify;
    playlistLink.textContent = "Open Playlist on Spotify →";
    createPlaylistText.textContent = "Playlist Created ✅";
    showSuccessToast("✅ Your Spotify playlist is ready!");
  } catch (err) {
    console.error("Create playlist error:", err);
    showError(err.message || "Playlist creation failed.");
  } finally {
    createPlaylistBtn.disabled = false;
  }
}

// ======================= INIT =========================================================
restoreAuth();

