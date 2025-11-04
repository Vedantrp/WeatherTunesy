console.log("WeatherTunes app loaded ✅");

const API_BASE_URL =
  location.hostname === "localhost"
    ? "http://localhost:3000/api"
    : "https://weather-tunes-kappa.vercel.app/api";

let spotifyAccessToken = localStorage.getItem("spotifyAccessToken");
let spotifyRefreshToken = localStorage.getItem("spotifyRefreshToken");
let currentUser = JSON.parse(localStorage.getItem("spotifyUser") || "null");
let currentLanguage = "english";
let currentMood = "relaxed";
let cachedTracks = [];

// DOM Elements
const locationInput = document.getElementById("locationInput");
const languageSelect = document.getElementById("languageSelect");
const moodSelect = document.getElementById("moodSelect");
const searchBtn = document.getElementById("searchBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const createPlaylistBtn = document.getElementById("createPlaylistBtn");
const playlistLink = document.getElementById("playlistLink");

const weatherCard = document.getElementById("weatherCard");
const playlistCard = document.getElementById("playlistCard");
const aiSongList = document.getElementById("aiSongList");

function showError(msg) {
  alert(msg);
}

function updateAuthUI() {
  if (spotifyAccessToken && currentUser) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
  } else {
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
  }
}

async function loginSpotify() {
  const res = await fetch(`${API_BASE_URL}/login`);
  const data = await res.json();

  const popup = window.open(data.authUrl, "_blank", "width=500,height=700");

  window.addEventListener("message", (event) => {
    if (event.data.type === "SPOTIFY_AUTH_SUCCESS") {
      spotifyAccessToken = event.data.token;
      spotifyRefreshToken = event.data.refreshToken;
      currentUser = event.data.user;

      localStorage.setItem("spotifyAccessToken", spotifyAccessToken);
      localStorage.setItem("spotifyRefreshToken", spotifyRefreshToken);
      localStorage.setItem("spotifyUser", JSON.stringify(currentUser));

      popup.close();
      updateAuthUI();
    }
  });
}

async function refreshAccessToken() {
  const res = await fetch(`${API_BASE_URL}/refresh-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: spotifyRefreshToken }),
  });

  const data = await res.json();
  spotifyAccessToken = data.accessToken;
  localStorage.setItem("spotifyAccessToken", spotifyAccessToken);
}

async function handleSearch() {
  const city = locationInput.value.trim();
  currentLanguage = languageSelect.value;
  currentMood = moodSelect.value;

  if (!city) return showError("Enter a city");

  // ✅ Fetch Weather + Mood
  const weatherRes = await fetch(`${API_BASE_URL}/weather-playlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ location: city, language: currentLanguage }),
  });

  const weatherData = await weatherRes.json();

  document.getElementById("weatherText").textContent = weatherData.weather.condition;
  document.getElementById("weatherTemp").textContent = weatherData.weather.temperature + "°C";
  document.getElementById("weatherIcon").src = weatherData.weather.icon;

  weatherCard.style.display = "block";

  // ✅ Fetch Tracks
  await getTracks(weatherData.mood);
}

async function getTracks(mood) {
  const res = await fetch(`${API_BASE_URL}/get-tracks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: currentLanguage,
      mood: currentMood,
      token: spotifyAccessToken,
    }),
  });

  if (res.status === 401) {
    await refreshAccessToken();
    return getTracks(mood);
  }

  const data = await res.json();
  cachedTracks = data.tracks || [];

  aiSongList.innerHTML = "";
  cachedTracks.slice(0, 35).forEach((t, i) => {
    const li = document.createElement("li");
    li.textContent = `${i + 1}. ${t.name} – ${t.artist}`;
    aiSongList.appendChild(li);
  });

  playlistCard.style.display = "block";
  createPlaylistBtn.disabled = false;
}

async function createSpotifyPlaylist() {
  if (!spotifyAccessToken) return showError("Login first");

  const playlistRes = await fetch(
    `https://api.spotify.com/v1/users/${currentUser.id}/playlists`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${spotifyAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `WeatherTunes – ${currentMood}`,
        description: "Auto playlist",
        public: false,
      }),
    }
  );

  const pl = await playlistRes.json();
  const uris = cachedTracks.slice(0, 35).map((t) => t.uri);

  await fetch(`https://api.spotify.com/v1/playlists/${pl.id}/tracks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${spotifyAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ uris }),
  });

  playlistLink.href = pl.external_urls.spotify;
  playlistLink.textContent = "Open Playlist on Spotify →";
  playlistLink.style.display = "block";
}

// Events
searchBtn.onclick = handleSearch;
loginBtn.onclick = loginSpotify;
logoutBtn.onclick = () => {
  localStorage.clear();
  window.location.reload();
};
createPlaylistBtn.onclick = createSpotifyPlaylist;

updateAuthUI();
