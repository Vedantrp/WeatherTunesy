/* --------------------------------------------------
   GLOBAL STATE
-------------------------------------------------- */
let spotifyToken = localStorage.getItem("spotifyToken") || null;
let spotifyUser = JSON.parse(localStorage.getItem("spotifyUser") || "null");
let lastTracks = [];
let lastWeather = null;

/* --------------------------------------------------
   DOM
-------------------------------------------------- */
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userName = document.getElementById("userName");
const searchBtn = document.getElementById("searchBtn");
const playlistGrid = document.getElementById("playlistGrid");
const playlistLink = document.getElementById("playlistLink");
const createBtn = document.getElementById("createBtn");

const wLocation = document.getElementById("wLocation");
const wTemp = document.getElementById("wTemp");
const wMood = document.getElementById("wMood");

/* --------------------------------------------------
   UI UPDATE
-------------------------------------------------- */
function updateUI() {
  if (spotifyToken && spotifyUser) {
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    userName.textContent = `Hi, ${spotifyUser.display_name}`;
  } else {
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    userName.textContent = "";
  }
}

/* --------------------------------------------------
   LOGIN
-------------------------------------------------- */
loginBtn.onclick = async () => {
  const r = await fetch("/api/login");
  const data = await r.json();
  const popup = window.open(data.authUrl, "spotify", "width=500,height=600");

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
};

logoutBtn.onclick = () => {
  spotifyToken = null;
  spotifyUser = null;
  localStorage.clear();
  updateUI();
};

/* --------------------------------------------------
   POST Helper
-------------------------------------------------- */
async function postJSON(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Request failed");
  return d;
}

/* --------------------------------------------------
   WEATHER
-------------------------------------------------- */
async function fetchWeather(city) {
  return await postJSON("/api/get-weather", { city });
}

function applyTheme(cond) {
  const b = document.body.classList;
  b.remove(...["theme-sunny","theme-cloudy","theme-rainy","theme-snowy","theme-stormy","theme-foggy"]);

  if (cond.includes("Clear")) b.add("theme-sunny");
  else if (cond.includes("Cloud")) b.add("theme-cloudy");
  else if (cond.includes("Rain")) b.add("theme-rainy");
  else if (cond.includes("Snow")) b.add("theme-snowy");
  else if (cond.includes("Thunder")) b.add("theme-stormy");
  else b.add("theme-foggy");
}

/* --------------------------------------------------
   SONGS
-------------------------------------------------- */
async function fetchSongs(language, mood) {
  return await postJSON("/api/get-songs", {
    token: spotifyToken,
    language,
    mood
  });
}

/* Render playlist cards */
function renderTracks(tracks) {
  playlistGrid.innerHTML = "";
  tracks.forEach(t => {
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.innerHTML = `
      <div class="cover" style="background-image:url('${t.image || "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee"}')"></div>
      <div class="meta">
        <div class="name">${t.name}</div>
        <div class="artist">${t.artist}</div>
      </div>
    `;
    playlistGrid.appendChild(tile);
  });
}

/* --------------------------------------------------
   MAIN SEARCH ACTION
-------------------------------------------------- */
searchBtn.onclick = async () => {
  const city = document.getElementById("location").value.trim();
  const language = document.getElementById("language").value;

  if (!spotifyToken) return alert("Login with Spotify first");
  if (!city) return alert("Enter a city");

  try {
    // 1️⃣ Weather
    const w = await fetchWeather(city);
    wLocation.textContent = w.city;
    wTemp.textContent = `${w.temp}°C (Feels ${w.feels}°C)`;
    wMood.textContent = w.condition;
    applyTheme(w.condition);

    // mood map
    let mood = "chill";
    if (w.temp > 30) mood = "energetic";
    if (["Rain","Thunderstorm"].includes(w.condition)) mood = "lofi";
    if (["Haze","Fog","Smoke","Mist"].includes(w.condition)) mood = "sad";

    // 2️⃣ Songs
    const songData = await fetchSongs(language, mood);
    lastTracks = songData.tracks;
    if (!lastTracks.length) {
      playlistGrid.innerHTML = "<p>No songs found. Try different language.</p>";
      createBtn.classList.add("hidden");
      playlistLink.classList.add("hidden");
      return;
    }

    renderTracks(lastTracks);
    createBtn.classList.remove("hidden");
    playlistLink.classList.add("hidden");

  } catch (err) {
    console.error(err);
    alert("Failed. Try again.");
  }
};

/* --------------------------------------------------
   CREATE PLAYLIST
-------------------------------------------------- */
createBtn.onclick = async () => {
  try {
    const r = await postJSON("/api/create-playlist", {
      token: spotifyToken,
      tracks: lastTracks.map(t => t.uri)
    });

    playlistLink.href = r.url;
    playlistLink.classList.remove("hidden");
    alert("Playlist created 🎧");
  } catch (err) {
    console.error(err);
    alert("Playlist failed");
  }
};

/* --------------------------------------------------
 Init
-------------------------------------------------- */
updateUI();
