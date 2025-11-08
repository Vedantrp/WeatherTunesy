// === Global State ===
let token = localStorage.getItem("spotifyToken");
let user = JSON.parse(localStorage.getItem("spotifyUser") || "null");

// UI Elements
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userName = document.getElementById("userName");
const searchBtn = document.getElementById("searchBtn");
const playlistGrid = document.getElementById("playlistGrid");
const createBtn = document.getElementById("createBtn");
const playlistLink = document.getElementById("playlistLink");

// === Helpers ===
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 2000);
}

function updateAuthUI() {
  if (token && user) {
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    userName.textContent = `👋 ${user.display_name}`;
  } else {
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    userName.textContent = "";
  }
}

// === Login ===
loginBtn.onclick = async () => {
  const res = await fetch("/api/login");
  const { authUrl } = await res.json();

  const popup = window.open(authUrl, "spotify", "width=600,height=700");

  window.addEventListener("message", e => {
    if (e.data.type === "SPOTIFY_AUTH_SUCCESS") {
      token = e.data.token;
      user = e.data.user;
      localStorage.setItem("spotifyToken", token);
      localStorage.setItem("spotifyUser", JSON.stringify(user));
      popup.close();
      updateAuthUI();
    }
  });
};

logoutBtn.onclick = () => {
  localStorage.clear();
  token = null;
  user = null;
  updateAuthUI();
};

// === Weather Fetch ===
async function getWeather(city) {
  const res = await fetch("/api/get-weather", {
    method: "POST",
    body: JSON.stringify({ city }),
  });
  return res.json();
}

// === Song Fetch ===
async function getSongs(language, mood) {
  const res = await fetch("/api/get-songs", {
    method: "POST",
    body: JSON.stringify({ token, language, mood })
  });
  return res.json();
}

// === UI Weather Theme ===
function applyTheme(cond) {
  const body = document.body;
  body.className = ""; // reset

  if (cond.includes("Rain")) body.classList.add("theme-rainy");
  else if (cond.includes("Cloud")) body.classList.add("theme-cloudy");
  else if (cond.includes("Haze") || cond.includes("Fog")) body.classList.add("theme-foggy");
  else if (cond.includes("Snow")) body.classList.add("theme-snowy");
  else if (cond.includes("Storm")) body.classList.add("theme-stormy");
  else body.classList.add("theme-sunny");
}

// === Search Action ===
searchBtn.onclick = async () => {
  const city = document.getElementById("location").value;
  const language = document.getElementById("language").value;
  if (!city) return toast("Enter a city");

  playlistGrid.innerHTML = "⏳ Loading...";

  const weather = await getWeather(city);
  applyTheme(weather.condition || "");

  document.getElementById("wLocation").textContent = city;
  document.getElementById("wTemp").textContent = `${weather.temp}°C`;
  document.getElementById("wMood").textContent = weather.condition;

  const mood = weather.temp > 30 ? "energetic" :
               weather.condition.includes("Rain") ? "sad" :
               "chill";

  const data = await getSongs(language, mood);
  playlistGrid.innerHTML = "";

  if (!data.tracks?.length) {
    playlistGrid.textContent = "No songs found 😐";
    return;
  }

  window.latestTracks = data.tracks; // store for playlist creation

  data.tracks.forEach(t => {
    playlistGrid.innerHTML += `
      <div class="tile">
        <div class="cover" style="background-image:url('${t.image || ""}')"></div>
        <div class="meta">
          <div class="name">${t.name}</div>
          <div class="artist">${t.artist}</div>
        </div>
      </div>`;
  });

  createBtn.classList.remove("hidden");
};

// === Create Playlist in Spotify ===
createBtn.onclick = async () => {
  const res = await fetch("/api/create-playlist", {
    method: "POST",
    body: JSON.stringify({ token, tracks: window.latestTracks })
  });

  const data = await res.json();

  if (data.url) {
    playlistLink.href = data.url;
    playlistLink.classList.remove("hidden");
    toast("✅ Playlist created!");
  } else toast("Playlist error");
};

// init UI
updateAuthUI();
