// ===== GLOBAL STATE =====
let spotifyToken = localStorage.getItem("spotifyToken") || null;
let spotifyUser = JSON.parse(localStorage.getItem("spotifyUser") || "null");

// ===== DOM =====
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userName = document.getElementById("userName");

const locationInput = document.getElementById("location");
const languageSelect = document.getElementById("language");
const searchBtn = document.getElementById("searchBtn");
const playlistDiv = document.getElementById("playlist");
const weatherBox = document.getElementById("weather");

// ===== UI Helper =====
function updateUI() {
  if (spotifyToken && spotifyUser) {
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    userName.textContent = `✅ Logged in as ${spotifyUser.display_name}`;
  } else {
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    userName.textContent = "";
  }
}

// ===== LOGIN =====
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

// ===== LOGOUT =====
logoutBtn.onclick = () => {
  localStorage.clear();
  spotifyToken = null;
  spotifyUser = null;
  updateUI();
};

// ===== API CALLS =====
async function getWeather(city) {
  return fetch("/api/get-weather", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ city }),
  }).then(r => r.json());
}

async function getSongs(language, mood) {
  return fetch("/api/get-songs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: spotifyToken, language, mood }),
  }).then(r => r.json());
}

// ===== MAIN SEARCH =====
searchBtn.onclick = async () => {
  if (!spotifyToken) return alert("Login first");

  const city = locationInput.value.trim();
  if (!city) return alert("Enter city");

  playlistDiv.innerHTML = "🎧 Loading songs...";
  weatherBox.textContent = "🌤 Fetching weather...";

  const weather = await getWeather(city);

  if (weather.error) {
    weatherBox.textContent = "Weather error";
    playlistDiv.textContent = "";
    return;
  }

  weatherBox.innerHTML = `
    City: ${city}<br>
    Temp: ${weather.temp}°C<br>
    Feels: ${weather.feels_like}°C<br>
    Condition: ${weather.condition}
  `;

  let mood = "chill";
  if (weather.temp > 30) mood = "summer";
  if (weather.condition.includes("Rain")) mood = "lofi";
  if (weather.condition.includes("Haze")) mood = "gloomy";

  const response = await getSongs(languageSelect.value, mood);

  if (!response.tracks?.length) {
    playlistDiv.innerHTML = "😕 No songs found";
    return;
  }

  playlistDiv.innerHTML = "";
  response.tracks.forEach(t => {
    playlistDiv.innerHTML += `<div>🎵 ${t.name} — <b>${t.artist}</b></div>`;
  });
};

updateUI();
