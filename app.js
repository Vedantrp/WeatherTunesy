// =============================
// GLOBAL
// =============================
let spotifyToken = localStorage.getItem("spotifyToken") || null;
let spotifyUser = JSON.parse(localStorage.getItem("spotifyUser") || "null");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const searchBtn = document.getElementById("searchBtn");

const locationInput = document.getElementById("location");
const languageSelect = document.getElementById("language");

const wLocation = document.getElementById("wLocation");
const wTemp = document.getElementById("wTemp");
const wMood = document.getElementById("wMood");
const playlistGrid = document.getElementById("playlistGrid");

const createBtn = document.getElementById("createBtn");
const playlistLink = document.getElementById("playlistLink");

let cachedSongs = [];
let lastHour = null;

// =============================
// UI STATE
// =============================
function updateUI() {
  if (spotifyToken && spotifyUser) {
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    document.getElementById("userName").innerText = spotifyUser.display_name;
  } else {
    logoutBtn.classList.add("hidden");
    loginBtn.classList.remove("hidden");
  }
}

// =============================
// HELPER: POST
// =============================
async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Bad JSON " + text);
  }
}

// =============================
// LOGIN
// =============================
loginBtn.onclick = async () => {
  // open placeholder popup immediately (allowed by browser)
  const popup = window.open("", "spotifyLogin", "width=600,height=700");

  try {
    const res = await fetch("/api/login");
    const { authUrl } = await res.json();

    if (!authUrl) throw Error("No auth URL returned");

    popup.location.href = authUrl;
  } catch (err) {
    popup.close();
    alert("Login failed: " + err.message);
  }
};
window.addEventListener("message", (event) => {
  if (event.data.type === "SPOTIFY_AUTH_SUCCESS") {
    spotifyToken = event.data.token;
    spotifyUser = event.data.user;
    localStorage.setItem("spotifyToken", spotifyToken);
    localStorage.setItem("spotifyUser", JSON.stringify(spotifyUser));
    updateUI();
  }
});

logoutBtn.onclick = () => {
  localStorage.clear();
  spotifyToken = null;
  spotifyUser = null;
  updateUI();
};

// =============================
// SEARCH FLOW
// =============================
searchBtn.onclick = async function handleSearch() {
  if (!spotifyToken) return alert("Login with Spotify first");
  
  const city = locationInput.value.trim();
  if (!city) return alert("Enter city");

  // 1️⃣ WEATHER
  const weather = await postJSON("/api/get-weather", { city });
  lastHour = weather.hour;

  wLocation.innerText = weather.city;
  wTemp.innerText = ${weather.temp}°C;
  wMood.innerText = weather.condition;

  // 2️⃣ SONGS
  const data = await postJSON("/api/get-songs", {
    token: spotifyToken,
    language: languageSelect.value,
    hour: lastHour
  });

  playlistGrid.innerHTML = "";
  cachedSongs = data.tracks || [];

  cachedSongs.forEach(t => {
    playlistGrid.innerHTML += `
      <div class="tile">
        <img class="cover" src="${t.image}" />
        <div class="meta">
          <div class="name">${t.name}</div>
          <div class="artist">${t.artist}</div>
        </div>
      </div>`;
  });

  createBtn.classList.remove("hidden");
};

// =============================
// CREATE SPOTIFY PLAYLIST
// =============================
createBtn.onclick = async () => {
  if (!cachedSongs.length) return alert("No songs available");

  const uris = cachedSongs.map(t => t.uri);

  const data = await postJSON("/api/create-playlist", {
    token: spotifyToken,
    uris,
    name: "WeatherTunes Mix"
  });

  playlistLink.href = data.url;
  playlistLink.classList.remove("hidden");
  alert("Playlist Created!");
};

// init
updateUI();

