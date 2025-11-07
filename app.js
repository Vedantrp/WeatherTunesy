// ===== AUTH STATE =====
let spotifyToken = localStorage.getItem("spotifyToken") || null;
let spotifyUser = JSON.parse(localStorage.getItem("spotifyUser") || "null");

// ===== ELEMENTS =====
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userName = document.getElementById("userName");
const locationInput = document.getElementById("location");
const languageSelect = document.getElementById("language");
const searchBtn = document.getElementById("searchBtn");
const playlistDiv = document.getElementById("playlist");
const weatherBox = document.getElementById("weather");

// ===== UI =====
function updateUI() {
  if (spotifyToken && spotifyUser) {
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    userName.innerText = `Logged in as: ${spotifyUser.display_name}`;
  } else {
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    userName.innerText = "";
  }
}

updateUI();

// ===== LOGIN =====
loginBtn.onclick = async () => {
  const res = await fetch("/api/login");
  const { authUrl } = await res.json();
  const popup = window.open(authUrl, "spotifyLogin", "width=600,height=700");

  window.addEventListener("message", (e) => {
    if (e.data?.type === "SPOTIFY_AUTH_SUCCESS") {
      spotifyToken = e.data.token;
      spotifyUser = e.data.user;
      localStorage.setItem("spotifyToken", spotifyToken);
      localStorage.setItem("spotifyUser", JSON.stringify(spotifyUser));
      popup.close();
      updateUI();
    }
  });
};

// ===== LOGOUT =====
logoutBtn.onclick = () => {
  spotifyToken = null;
  spotifyUser = null;
  localStorage.clear();
  updateUI();
};

// ===== GET WEATHER =====
async function getWeather(city) {
  const res = await fetch("/api/get-weather", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ city })
  });
  return res.json();
}

// ===== GET SONGS =====
async function getSongs(language, mood) {
  const res = await fetch("/api/get-songs", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ token: spotifyToken, language, mood })
  });
  return res.json();
}

// ===== SEARCH =====
searchBtn.onclick = async () => {
  if (!spotifyToken) return alert("Login first ⚠️");

  const city = locationInput.value.trim();
  if (!city) return alert("Enter city");

  playlistDiv.innerHTML = "Loading songs…";
  weatherBox.innerHTML = "Loading weather…";

  const weather = await getWeather(city);
  weatherBox.innerHTML = `
    🌍 ${city}<br>
    🌡 ${weather.temp}°C (Feels ${weather.feels_like}°C)<br>
    🌦 ${weather.condition}
  `;

  // auto mood
  let mood = "chill";
  if (weather.temp > 30) mood = "happy";
  if (weather.condition.includes("Rain")) mood = "sad";

  const songs = await getSongs(languageSelect.value, mood);

  if (!songs.tracks?.length) {
    playlistDiv.innerHTML = "No songs 😐";
    return;
  }

  playlistDiv.innerHTML = "";

  songs.tracks.forEach(t => {
    playlistDiv.innerHTML += `
      <div class="song fade">
        <img src="${t.image || 'https://i.imgur.com/MR2vm7V.png'}">
        <div class="flex-1">${t.name}<br><small>${t.artist}</small></div>
        <a href="${t.url}" target="_blank" class="text-green-400 text-xl">▶</a>
      </div>
    `;
  });
};
