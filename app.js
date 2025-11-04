console.log("WeatherTunes loaded ✅");

const API_BASE = ""; // same domain deployment

// ----------------------------------------------
// DOM
// ----------------------------------------------
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userInfo = document.getElementById("userInfo");
const userName = document.getElementById("userName");

const locationInput = document.getElementById("locationInput");
const languageSelect = document.getElementById("languageSelect");
const searchBtn = document.getElementById("searchBtn");
const weatherCard = document.getElementById("weatherCard");
const playlistCard = document.getElementById("playlistCard");
const errorBox = document.getElementById("error");

const createPlaylistBtn = document.getElementById("createPlaylistBtn");
const playlistLink = document.getElementById("playlistLink");
const createdPlaylist = document.getElementById("createdPlaylist");
const aiSongList = document.getElementById("aiSongList");

// ----------------------------------------------
// State
// ----------------------------------------------
let token = null;
let refreshToken = null;
let currentUser = null;
let currentTracks = [];
let currentMood = "relaxed";

// ----------------------------------------------
// UI Helpers
// ----------------------------------------------
function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.remove("hidden");
  setTimeout(() => errorBox.classList.add("hidden"), 4000);
}

function showWeatherCard() {
  weatherCard.classList.remove("hidden");
  playlistCard.classList.remove("hidden");
}

function hideAll() {
  weatherCard.classList.add("hidden");
  playlistCard.classList.add("hidden");
}

// ----------------------------------------------
// Auth UI
// ----------------------------------------------
function updateAuthUI() {
  if (!token || !currentUser) {
    loginBtn.classList.remove("hidden");
    userInfo.classList.add("hidden");
    return;
  }
  loginBtn.classList.add("hidden");
  userInfo.classList.remove("hidden");
  userName.textContent = `Hi, ${currentUser.display_name || currentUser.id}`;
}

// Restore login
(function restoreAuth() {
  token = localStorage.getItem("spotifyAccessToken");
  refreshToken = localStorage.getItem("spotifyRefreshToken");
  const usr = localStorage.getItem("spotifyUser");
  if (usr) currentUser = JSON.parse(usr);
  updateAuthUI();
})();

// ----------------------------------------------
// Login click
// ----------------------------------------------
loginBtn.onclick = () => {
  const popup = window.open("/api/login", "Login", "width=500,height=700");

  window.addEventListener("message", (event) => {
    if (event.data.type === "SPOTIFY_AUTH_SUCCESS") {
      token = event.data.accessToken;
      refreshToken = event.data.refreshToken;
      currentUser = event.data.user;

      localStorage.setItem("spotifyAccessToken", token);
      localStorage.setItem("spotifyRefreshToken", refreshToken);
      localStorage.setItem("spotifyUser", JSON.stringify(currentUser));

      updateAuthUI();
      popup?.close();
    }
  });
};

// ----------------------------------------------
// Logout
// ----------------------------------------------
logoutBtn.onclick = () => {
  localStorage.clear();
  token = null;
  refreshToken = null;
  currentUser = null;
  updateAuthUI();
};

// ----------------------------------------------
// Weather API
// ----------------------------------------------
async function fetchWeather(city) {
  const key = "6e3de95261eb4f89a17172124250211"; // FREE demo key weatherapi.com
  const url = `https://api.weatherapi.com/v1/current.json?key=${key}&q=${city}&aqi=no`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather not found");
  return res.json();
}

function getMoodByWeather(temp, condition) {
  if (condition.includes("rain")) return "cozy";
  if (temp < 10) return "calm";
  if (temp > 32) return "tropical";
  if (condition.includes("cloud")) return "relaxed";
  return "upbeat";
}

// ----------------------------------------------
// Track Fetch
// ----------------------------------------------
async function getTracks(language, mood) {
  const res = await fetch("/api/get-tracks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language, mood, token })
  });

  const data = await res.json();
  return data.tracks || [];
}

function renderTracks(tracks) {
  aiSongList.innerHTML = "";
  tracks.forEach((t, idx) => {
    const li = document.createElement("li");
    li.textContent = `${idx + 1}. ${t.name} — ${t.artist}`;
    li.className = "track-item";
    aiSongList.appendChild(li);
  });
}

// ----------------------------------------------
// Search+Playlist Flow
// ----------------------------------------------
async function handleSearch() {
  const city = locationInput.value.trim();
  const language = languageSelect.value;

  if (!city) return showError("Enter a city");

  hideAll();
  showError("Loading...");

  try {
    const w = await fetchWeather(city);

    const temp = w.current.temp_c;
    const cond = w.current.condition.text.toLowerCase();
    currentMood = getMoodByWeather(temp, cond);

    const tracks = await getTracks(language, currentMood);
    currentTracks = tracks;

    if (!tracks.length) {
      showError("No songs found for this language & weather");
      return;
    }

    renderTracks(tracks);
    showWeatherCard();
    errorBox.classList.add("hidden");
  } catch (e) {
    showError("Error loading results");
  }
}

searchBtn.onclick = handleSearch;

// ----------------------------------------------
// Create Playlist
// ----------------------------------------------
async function createPlaylist() {
  if (!token) return showError("Login first");
  if (!currentTracks.length) return showError("Search first");

  const res = await fetch("/api/create-playlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      tracks: currentTracks.map(t => t.uri),
      mood: currentMood
    })
  });

  const data = await res.json();
  if (!data.url) return showError("Playlist failed");

  playlistLink.href = data.url;
  createdPlaylist.classList.remove("hidden");
}

createPlaylistBtn.onclick = createPlaylist;
