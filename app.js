// =========================
// GLOBAL STATE
// =========================
let spotifyToken = localStorage.getItem("spotifyToken") || null;
let spotifyUser = JSON.parse(localStorage.getItem("spotifyUser") || "null");
let currentTracks = [];

// Elements
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userName = document.getElementById("userName");
const locationInput = document.getElementById("location");
const languageSelect = document.getElementById("language");
const searchBtn = document.getElementById("searchBtn");
const playlistDiv = document.getElementById("playlist");
const weatherBox = document.getElementById("weather");
const createBtn = document.getElementById("createBtn");
const playlistResult = document.getElementById("playlistResult");

// =========================
// UI STATE
// =========================
function updateUI() {
  if (spotifyToken && spotifyUser) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    userName.textContent = `Logged in as: ${spotifyUser.display_name}`;
  } else {
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    userName.textContent = "";
    createBtn.style.display = "none";
  }
}
updateUI();

// =========================
// LOGIN
// =========================
loginBtn.onclick = async () => {
  const res = await fetch("/api/login");
  const { authUrl } = await res.json();
  const popup = window.open(authUrl, "spotifyLogin", "width=600,height=700");

  window.addEventListener("message", (event) => {
    if (event.data.type === "SPOTIFY_AUTH_SUCCESS") {
      spotifyToken = event.data.token;
      spotifyUser = event.data.user;
      localStorage.setItem("spotifyToken", spotifyToken);
      localStorage.setItem("spotifyUser", JSON.stringify(spotifyUser));
      popup.close();
      updateUI();
    }
  });
};

logoutBtn.onclick = () => {
  localStorage.clear();
  spotifyToken = null;
  spotifyUser = null;
  updateUI();
};

// =========================
// API HELPERS
// =========================
async function getWeather(city) {
  const res = await fetch("/api/get-weather", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ city })
  });
  return res.json();
}

async function getSongs(language, mood) {
  const res = await fetch("/api/get-songs", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      token: spotifyToken,
      language,
      mood
    })
  });
  return res.json();
}

// =========================
// SEARCH
// =========================
searchBtn.onclick = async () => {
  if (!spotifyToken) return alert("Login first!");

  const city = locationInput.value.trim();
  if (!city) return alert("Enter city");

  weatherBox.innerText = "Loading...";
  playlistDiv.innerText = "Loading songs...";

  const weather = await getWeather(city);
  weatherBox.innerHTML = `${city}<br>Temp: ${weather.temp}°C<br>Condition: ${weather.condition}`;

  let mood = "chill";
  if (weather.temp > 30) mood = "summer";
  if (weather.condition.includes("Rain")) mood = "lofi";
  if (weather.condition.includes("Haze")) mood = "sad";

  const data = await getSongs(languageSelect.value, mood);

  if (!data.tracks?.length) {
    playlistDiv.innerHTML = "No tracks. Try different city.";
    return;
  }

  playlistDiv.innerHTML = "";
  currentTracks = data.tracks.map(t => t.uri);

  data.tracks.forEach(t => {
    playlistDiv.innerHTML += `<div class="song">${t.name} — <b>${t.artist}</b></div>`;
  });

  createBtn.style.display = "inline-block";
};

// =========================
// CREATE PLAYLIST
// =========================
createBtn.onclick = async () => {
  const res = await fetch("/api/create-playlist", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      token: spotifyToken,
      userId: spotifyUser.id,
      tracks: currentTracks.slice(0, 30)
    })
  });

  const data = await res.json();
  if (data.link) {
    playlistResult.innerHTML = `✅ Playlist created: <a href="${data.link}" target="_blank">${data.link}</a>`;
  } else {
    playlistResult.innerText = "❌ Failed to create";
  }
};
