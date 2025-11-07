let spotifyToken = localStorage.getItem("spotifyToken") || null;
let spotifyUser = JSON.parse(localStorage.getItem("spotifyUser") || "null");
let songs = [];
let currentMood = "chill";

// Elements
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userName = document.getElementById("userName");
const locationInput = document.getElementById("location");
const langSel = document.getElementById("language");
const searchBtn = document.getElementById("searchBtn");
const playlistDiv = document.getElementById("playlist");
const weatherBox = document.getElementById("weather");
const createBtn = document.getElementById("createBtn");

// UI
function updateUI() {
  if (spotifyToken) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "";
    userName.innerText = `✅ Logged in: ${spotifyUser?.display_name}`;
  } else {
    loginBtn.style.display = "";
    logoutBtn.style.display = "none";
    userName.innerText = "";
  }
}

// Helpers
async function postJSON(url, data) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return r.json();
}

// Auth
loginBtn.onclick = async () => {
  const res = await fetch("/api/login");
  const { authUrl } = await res.json();
  window.open(authUrl, "spotify", "width=600,height=700");
};

window.addEventListener("message", e => {
  if (e.data.type === "SPOTIFY_AUTH_SUCCESS") {
    spotifyToken = e.data.token;
    spotifyUser = e.data.user;
    localStorage.setItem("spotifyToken", spotifyToken);
    localStorage.setItem("spotifyUser", JSON.stringify(spotifyUser));
    updateUI();
  }
});

logoutBtn.onclick = () => {
  localStorage.clear();
  location.reload();
};

// WEATHER
async function getWeather(city) {
  return postJSON("/api/get-weather", { city });
}

// SONGS
async function getSongs(lang, mood) {
  return postJSON("/api/get-songs", { token: spotifyToken, language: lang, mood });
}

// MAIN
searchBtn.onclick = async () => {
  if (!spotifyToken) return alert("Login first!");

  playlistDiv.innerHTML = "Loading songs...";
  weatherBox.innerHTML = "Loading weather...";

  const city = locationInput.value.trim();
  if (!city) return alert("Enter a city!");

  const weather = await getWeather(city);

  weatherBox.innerHTML = `
    🌡 ${weather.temp}°C  
    Feels ${weather.feels_like}°C  
    Sky: ${weather.condition}
  `;

  if (weather.temp > 30) currentMood = "energetic";
  if (weather.condition.includes("Rain")) currentMood = "sad";
  if (weather.condition.includes("Haze")) currentMood = "chill";

  const data = await getSongs(langSel.value, currentMood);
  songs = data.tracks || [];

  if (!songs.length) {
    playlistDiv.innerHTML = "❌ No songs found";
    createBtn.style.display = "none";
    return;
  }

  playlistDiv.innerHTML = "";
  songs.forEach(s => {
    playlistDiv.innerHTML += `<div>${s.name} — <b>${s.artist}</b></div>`;
  });

  createBtn.style.display = "block";
};

// CREATE PLAYLIST
createBtn.onclick = async () => {
  const r = await postJSON("/api/create-playlist", { token: spotifyToken, tracks: songs, mood: currentMood });

  if (r.playlistUrl) {
    window.open(r.playlistUrl, "_blank");
    createBtn.innerText = "✅ Playlist Ready!";
  } else alert("❌ Failed");
};

updateUI();
