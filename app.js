let spotifyToken = localStorage.getItem("spotifyToken") || null;
let spotifyUser = JSON.parse(localStorage.getItem("spotifyUser") || "null");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userName = document.getElementById("userName");

const locationInput = document.getElementById("location");
const languageSelect = document.getElementById("language");
const searchBtn = document.getElementById("searchBtn");
const playlistDiv = document.getElementById("playlist");
const weatherBox = document.getElementById("weather");
const createBtn = document.getElementById("createPlaylistBtn");
const playlistStatus = document.getElementById("playlistStatus");

function updateUI() {
  if (spotifyToken && spotifyUser) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "block";
    userName.innerText = `Logged in as: ${spotifyUser.display_name}`;
  } else {
    loginBtn.style.display = "block";
    logoutBtn.style.display = "none";
    userName.innerText = "";
  }
}

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
  spotifyToken = null;
  spotifyUser = null;
  localStorage.clear();
  updateUI();
};

async function getWeather(city) {
  return fetch("/api/get-weather", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({city})
  }).then(r=>r.json());
}

async function getSongs(language, mood) {
  return fetch("/api/get-songs", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({token:spotifyToken,language,mood})
  }).then(r=>r.json());
}

searchBtn.onclick = async () => {
  if (!spotifyToken) return alert("Login first");
  const city = locationInput.value.trim();
  if (!city) return alert("Enter city");

  playlistDiv.innerHTML = "Loading songs...";
  weatherBox.innerHTML = "Fetching weather...";

  const weather = await getWeather(city);
  weatherBox.innerHTML = `🌍 ${city}<br>🌡 ${weather.temp}°C<br>🌦 ${weather.condition}`;

  let mood = "chill";
  if (weather.temp > 30) mood = "summer";
  if (weather.condition.includes("Rain")) mood = "lofi";
  if (weather.condition.includes("Haze")) mood = "gloomy";

  const res = await getSongs(languageSelect.value, mood);

  if (!res.tracks?.length) {
    playlistDiv.innerHTML = "No songs found.";
    return;
  }

  window.songURIs = res.tracks.map(t=>t.uri);
  playlistDiv.innerHTML = res.tracks.map(t=>`🎵 ${t.name} — <b>${t.artist}</b>`).join("<br>");

  createBtn.style.display = "block";
};

createBtn.onclick = async () => {
  playlistStatus.innerText = "Creating playlist...";
  
  const res = await fetch("/api/create-playlist", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({token:spotifyToken, tracks:window.songURIs})
  });

  const data = await res.json();

  if (data.url) playlistStatus.innerHTML =
    `✅ Playlist created → <a href="${data.url}" target="_blank">Open</a>`;
  else playlistStatus.innerText = "❌ Error";
};

updateUI();
