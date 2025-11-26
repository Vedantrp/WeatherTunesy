// ===============================
// LOCAL STORAGE STATE
// ===============================
let spotifyToken = localStorage.getItem("spotifyToken") || null;
let spotifyRefresh = localStorage.getItem("spotifyRefresh") || null;
let tokenExpiry = Number(localStorage.getItem("tokenExpiry") || 0);
let spotifyUser = JSON.parse(localStorage.getItem("spotifyUser") || "null");
let lastTracks = [];

// ===============================
// ELEMENTS
// ===============================
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userName = document.getElementById("userName");
const locationInput = document.getElementById("location");
const languageSelect = document.getElementById("language");
const searchBtn = document.getElementById("searchBtn");
const wLocation = document.getElementById("wLocation");
const wTemp = document.getElementById("wTemp");
const wMood = document.getElementById("wMood");
const createBtn = document.getElementById("createPlaylistBtn");
const playlistGrid = document.getElementById("playlistGrid");
const toast = document.getElementById("toast");

// ===============================
function showToast(msg) {
  toast.innerText = msg;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2500);
}

// ===============================
async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return res.json();
}

// ===============================
// TOKEN REFRESH
async function getValidToken() {
  const now = Date.now();

  if (spotifyToken && now < tokenExpiry) return spotifyToken;

  const r = await postJSON("/api/refresh", { refresh: spotifyRefresh });

  if (!r.token) {
    localStorage.clear();
    location.reload();
    return;
  }

  spotifyToken = r.token;
  tokenExpiry = now + 3500 * 1000;

  localStorage.setItem("spotifyToken", spotifyToken);
  localStorage.setItem("tokenExpiry", tokenExpiry);

  return spotifyToken;
}

// ===============================
// UI UPDATE
function updateUI() {
  if (spotifyToken && spotifyUser) {
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    userName.innerText = spotifyUser.display_name || "User";
  } else {
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    userName.innerText = "";
  }
}

// ===============================
// LOGIN
loginBtn.onclick = async () => {
  const r = await fetch("/api/login");
  const { authUrl } = await r.json();

  const popup = window.open(authUrl, "_blank", "width=600,height=700");

  window.addEventListener("message", (event) => {
    if (event.data.type === "SPOTIFY_AUTH_SUCCESS") {
      spotifyToken = event.data.token;
      spotifyRefresh = event.data.refresh;
      spotifyUser = event.data.user;
      tokenExpiry = Date.now() + 3500 * 1000;

      localStorage.setItem("spotifyToken", spotifyToken);
      localStorage.setItem("spotifyRefresh", spotifyRefresh);
      localStorage.setItem("spotifyUser", JSON.stringify(spotifyUser));
      localStorage.setItem("tokenExpiry", tokenExpiry);

      popup.close();
      updateUI();
      showToast("Logged in!");
    }
  });
};

// LOGOUT
logoutBtn.onclick = () => {
  localStorage.clear();
  location.reload();
};

// ===============================
// SEARCH WEATHER + SONGS
searchBtn.onclick = async () => {
  if (!spotifyToken) return showToast("Login first!");

  const city = locationInput.value.trim();
  if (!city) return showToast("Enter a city!");

  const weather = await postJSON("/api/get-weather", { city });

  if (weather.error) return showToast("City not found!");

  wLocation.innerText = city;
  wTemp.innerText = `${weather.temp}°C`;
  wMood.innerText = weather.condition;

  let mood = "chill";
  if (weather.temp > 32) mood = "energetic";
  if (weather.temp < 20) mood = "cosy";
  if (weather.condition.includes("Rain")) mood = "lofi";

  const songs = await postJSON("/api/get-songs", {
    token: await getValidToken(),
    language: languageSelect.value,
    mood
  });

  lastTracks = songs.tracks || [];

  playlistGrid.innerHTML = lastTracks
    .map(
      (t) => `
      <div class="tile">
        <img src="${t.image}">
        <div class="meta">
          <div class="name">${t.name}</div>
          <div class="artist">${t.artist}</div>
        </div>
      </div>
    `
    )
    .join("");

  createBtn.classList.remove("hidden");
};

// ===============================
// CREATE PLAYLIST
createBtn.onclick = async () => {
  const ids = lastTracks.map((t) => t.id);

  const r = await postJSON("/api/create-playlist", {
    token: await getValidToken(),
    userId: spotifyUser.id,
    name: `WeatherTunes – ${wMood.innerText}`,
    trackIds: ids
  });

  if (!r.url) return showToast("Failed to create playlist");

  showToast("Playlist created!");
  window.open(r.url, "_blank");
};

// INIT
updateUI();
