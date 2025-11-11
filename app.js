let spotifyToken = localStorage.getItem("spotifyToken");
let spotifyUser = JSON.parse(localStorage.getItem("spotifyUser") || "null");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userName = document.getElementById("userName");
const locationInput = document.getElementById("location");
const languageSelect = document.getElementById("language");
const searchBtn = document.getElementById("searchBtn");
const playlistGrid = document.getElementById("playlistGrid");
const wLocation = document.getElementById("wLocation");
const wTemp = document.getElementById("wTemp");
const wMood = document.getElementById("wMood");
const createBtn = document.getElementById("createBtn");
const playlistLink = document.getElementById("playlistLink");

function updateUI() {
  if (spotifyToken && spotifyUser) {
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    userName.innerText = spotifyUser.display_name;
  } else {
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    userName.innerText = "";
  }
}

async function login() {
  const r = await fetch("/api/login");
  const { authUrl } = await r.json();
  const popup = window.open(authUrl, "spotifyLogin", "width=500,height=700");

  window.addEventListener("message", (e) => {
    if (e.data.type === "SPOTIFY_AUTH_SUCCESS") {
      spotifyToken = e.data.token;
      spotifyUser = e.data.user;

      localStorage.setItem("spotifyToken", spotifyToken);
      localStorage.setItem("spotifyUser", JSON.stringify(spotifyUser));

      popup.close();
      updateUI();
    }
  });
}

loginBtn.onclick = login;

logoutBtn.onclick = () => {
  localStorage.clear();
  spotifyToken = null;
  spotifyUser = null;
  updateUI();
};

async function getWeather(city) {
  const r = await fetch("/api/get-weather", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ city })
  });
  return r.json();
}

async function getSongs(language, mood) {
  const r = await fetch("/api/get-songs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: spotifyToken, language, mood })
  });
  return r.json();
}

searchBtn.onclick = async () => {
  const city = locationInput.value.trim();
  if (!city) return alert("Enter city");

  playlistGrid.innerHTML = "Loading...";
  const weather = await getWeather(city);
  
  wLocation.innerText = city;
  wTemp.innerText = `${weather.temp}°C`;
  wMood.innerText = weather.condition;

  let mood = "chill";
  if (weather.temp > 30) mood = "summer";
  if (weather.condition.includes("Rain")) mood = "lofi";
  if (weather.condition.includes("Haze")) mood = "sad";

  const songs = await getSongs(languageSelect.value, mood);

  playlistGrid.innerHTML = "";
  songs.tracks.forEach(t => {
    playlistGrid.innerHTML += `
      <div class="tile glass">
        <div class="meta">
          <div class="name">${t.name}</div>
          <div class="artist">${t.artist}</div>
          <a class="chip" href="${t.url}" target="_blank">Play ▶</a>
        </div>
      </div>`;
  });

  createBtn.classList.remove("hidden");
};

createBtn.onclick = async () => {
  const r = await fetch("/api/create-playlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: spotifyToken })
  });

  const data = await r.json();
  playlistLink.href = data.url;
  playlistLink.classList.remove("hidden");
  playlistLink.innerText = "Open Playlist";
};

updateUI();
