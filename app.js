// ============================
// GLOBAL STATE
// ============================
let token = localStorage.getItem("spotifyToken") || null;
let user = JSON.parse(localStorage.getItem("spotifyUser") || "null");
let lastTracks = [];

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userName = document.getElementById("userName");

const locationInput = document.getElementById("location");
const languageSelect = document.getElementById("language");
const searchBtn = document.getElementById("searchBtn");

const wLocation = document.getElementById("wLocation");
const wTemp = document.getElementById("wTemp");
const wMood = document.getElementById("wMood");

const playlistGrid = document.getElementById("playlistGrid");
const createBtn = document.getElementById("createBtn");
const playlistLink = document.getElementById("playlistLink");
const toast = document.getElementById("toast");


// ============================
// UI HELPERS
// ============================
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2500);
}

function updateUI() {
  if (token && user) {
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    userName.textContent = `Hi, ${user.display_name} 👋`;
  } else {
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    userName.textContent = "";
  }
}


// ============================
// SPOTIFY LOGIN
// ============================
loginBtn.onclick = async () => {
  const res = await fetch("/api/login");
  const { authUrl } = await res.json();

  const popup = window.open(authUrl, "spotifyAuth", "width=500,height=700");

  window.addEventListener("message", (e) => {
    if (e.data?.type === "SPOTIFY_AUTH_SUCCESS") {
      token = e.data.token;
      user = e.data.user;

      localStorage.setItem("spotifyToken", token);
      localStorage.setItem("spotifyUser", JSON.stringify(user));

      popup?.close();
      updateUI();
      showToast("✅ Logged in successfully");
    }
  });
};

logoutBtn.onclick = () => {
  token = null;
  user = null;
  localStorage.clear();
  updateUI();
  showToast("👋 Logged out");
};


// ============================
// HELPERS
// ============================
async function postJSON(url, data) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  const txt = await r.text();
  try {
    return JSON.parse(txt);
  } catch {
    throw new Error("Bad JSON: " + txt);
  }
}


// ============================
// WEATHER + THEME
// ============================
function applyWeatherTheme(condition) {
  const body = document.body;

  const map = {
    Clear: "theme-sunny",
    Cloud: "theme-cloudy",
    Rain: "theme-rainy",
    Snow: "theme-snowy",
    Thunder: "theme-stormy",
    Mist: "theme-foggy",
    Haze: "theme-foggy"
  };

  let theme = "theme-sunny";
  for (const key in map) {
    if (condition.toLowerCase().includes(key.toLowerCase())) {
      theme = map[key];
      break;
    }
  }

  body.className = theme;
}


// ============================
// SEARCH FLOW
// ============================
searchBtn.onclick = async () => {
  if (!token) return showToast("⚠️ Login first");

  const city = locationInput.value.trim();
  if (!city) return showToast("Enter a city");

  playlistGrid.innerHTML = "Loading songs...";
  wLocation.textContent = "…";
  wTemp.textContent = "…";
  wMood.textContent = "…";

  const weather = await postJSON("/api/get-weather", { city });
  wLocation.textContent = city;
  wTemp.textContent = `${weather.temp}°C`;
  
  // mood rules
  let mood = "chill";
  if (weather.temp > 30) mood = "happy";
  if (/rain|haze|mist|cloud/i.test(weather.condition)) mood = "sad";

  wMood.textContent = mood;
  applyWeatherTheme(weather.condition);

  const data = await postJSON("/api/get-songs", {
    token,
    language: languageSelect.value,
    mood
  });

  if (!data.tracks?.length) {
    playlistGrid.innerHTML = "No tracks found 😕";
    createBtn.classList.add("hidden");
    return;
  }

  lastTracks = data.tracks;
  playlistGrid.innerHTML = "";

  data.tracks.forEach(t => {
    playlistGrid.innerHTML += `
      <div class="tile">
        <div class="cover" style="background-image:url('${t.image}')"></div>
        <div class="meta">
          <div class="name">${t.name}</div>
          <div class="artist">${t.artist}</div>
        </div>
      </div>`;
  });

  createBtn.classList.remove("hidden");
};


// ============================
// CREATE PLAYLIST
// ============================
createBtn.onclick = async () => {
  const r = await postJSON("/api/create-playlist", {
    token,
    user,
    tracks: lastTracks.map(t => t.uri)
  });

  if (!r?.playlistUrl) {
    showToast("Error making playlist");
    return;
  }

  playlistLink.href = r.playlistUrl;
  playlistLink.classList.remove("hidden");
  playlistLink.textContent = "✅ Open Playlist";
  showToast("🎧 Playlist created!");
};


// Init UI
updateUI();
