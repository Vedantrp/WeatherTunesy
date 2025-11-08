let token = localStorage.getItem("spotifyToken");
let user = JSON.parse(localStorage.getItem("spotifyUser") || "null");
let tracksGlobal = [];
const bg = document.querySelector(".bg-effect");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userName = document.getElementById("userName");
const locationInput = document.getElementById("location");
const language = document.getElementById("language");
const searchBtn = document.getElementById("searchBtn");
const playlistDiv = document.getElementById("playlist");
const weatherBox = document.getElementById("weather");
const createBtn = document.getElementById("createBtn");
const playlistCreated = document.getElementById("playlistCreated");

/* UI Update */
function uUI() {
  if (token && user) {
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    userName.innerText = `Hi, ${user.display_name}`;
  }
}

/* SET BACKGROUND */
function setWeatherBG(condition) {
  bg.className = "bg-effect";

  if (/clear/i.test(condition)) bg.classList.add("bg-sunny");
  else if (/rain|drizzle/i.test(condition)) bg.classList.add("bg-rain");
  else if (/snow/i.test(condition)) bg.classList.add("bg-snow");
  else if (/haze|fog|mist/i.test(condition)) bg.classList.add("bg-haze");
  else bg.classList.add("bg-cloudy");
}

/* Login */
loginBtn.onclick = async () => {
  const r = await fetch("/api/login");
  const { authUrl } = await r.json();
  const popup = window.open(authUrl, "", "width=600,height=700");

  window.addEventListener("message", (e) => {
    if (e.data.type === "SPOTIFY_AUTH_SUCCESS") {
      token = e.data.token;
      user = e.data.user;
      localStorage.setItem("spotifyToken", token);
      localStorage.setItem("spotifyUser", JSON.stringify(user));
      popup.close();
      uUI();
    }
  });
};

/* Logout */
logoutBtn.onclick = () => {
  localStorage.clear();
  location.reload();
};

/* Weather */
async function getWeather(city) {
  const r = await fetch("/api/get-weather", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ city })
  });
  return r.json();
}

/* Songs */
async function getSongs(lang, mood) {
  const r = await fetch("/api/get-songs", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ token, language:lang, mood })
  });
  return r.json();
}

/* Create playlist */
createBtn.onclick = async () => {
  const r = await fetch("/api/create-playlist", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ token, tracks: tracksGlobal })
  });

  const data = await r.json();
  playlistCreated.innerHTML = `<a href="${data.url}" target="_blank">🎧 Open Spotify Playlist</a>`;
  createBtn.innerText = "✅ Playlist Ready";
};

/* Search click */
searchBtn.onclick = async () => {
  if (!token) return alert("Login first");
  const city = locationInput.value;
  if (!city) return alert("Enter city");

  playlistDiv.innerHTML = "Loading...";
  weatherBox.innerHTML = "Loading...";

  const w = await getWeather(city);
  weatherBox.innerHTML = `${w.temp}°C – ${w.condition}`;
  setWeatherBG(w.condition);

  let mood = "chill";
  if (w.temp > 30) mood = "summer";
  if (/rain|haze/i.test(w.condition)) mood = "lofi";

  const songs = await getSongs(language.value, mood);
  tracksGlobal = songs.tracks;

  playlistDiv.innerHTML = songs.tracks.map(
    t => `<div>${t.name} — <b>${t.artist}</b></div>`
  ).join("");

  createBtn.classList.remove("hidden");
};

UI();
