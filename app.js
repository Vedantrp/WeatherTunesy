// ===============================
// GLOBAL STATE
// ===============================
let spotifyToken = localStorage.getItem("spotifyToken") || null;
let spotifyUser  = JSON.parse(localStorage.getItem("spotifyUser") || "null");
let lastURIs = []; // for playlist creation
let lastVibe = { title: "WeatherTunes Mix", desc: "" };

// ===============================
// DOM
// ===============================
const loginBtn   = document.getElementById("loginBtn");
const logoutBtn  = document.getElementById("logoutBtn");
const userName   = document.getElementById("userName");

const locationInput = document.getElementById("location");
const languageSelect= document.getElementById("language");
const searchBtn     = document.getElementById("searchBtn");

const moodRange = document.getElementById("moodRange");
const moodLabel = document.getElementById("moodLabel");

const weatherBox = document.getElementById("weather");
const playlistDiv= document.getElementById("playlist");

const vibeBox  = document.getElementById("vibeBox");
const vibeTitle= document.getElementById("vibeTitle");
const vibeDesc = document.getElementById("vibeDesc");

const createBtn = document.getElementById("createPlaylistBtn");
const playlistStatus = document.getElementById("playlistStatus");

// ===============================
// UI HELPERS
// ===============================
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

const moodMap = { 1: "sad", 2: "chill", 3: "happy", 4: "energetic", 5: "party" };
const moodEmoji = { sad:"😢", chill:"😌", happy:"😊", energetic:"⚡", party:"🎉" };

moodRange.oninput = () => {
  const m = moodMap[moodRange.value];
  moodLabel.textContent = `Mood: ${moodEmoji[m]} ${m}`;
};

function setWeatherBG(condition, temp) {
  if (!condition) return;
  const c = condition.toLowerCase();
  let cls = "bg-gray-900";
  if (c.includes("rain") || c.includes("drizzle")) cls = "bg-rain";
  else if (c.includes("haze") || c.includes("fog") || c.includes("mist")) cls = "bg-haze";
  else if (c.includes("clear")) cls = "bg-sunny";
  else if (temp < 20) cls = "bg-winter";
  else cls = "bg-night";
  document.body.className = `${cls} text-white min-h-screen flex flex-col items-center p-6`;
}

// Local “AI” vibe namer: deterministic & free
function buildVibeName(weather, language, moodLabel) {
  const temp = Math.round(weather.temp);
  const cond = weather.condition;
  const emojiByCond =
    cond.includes("Rain") ? "🌧️" :
    cond.includes("Haze") || cond.includes("Fog") || cond.includes("Mist") ? "🌫️" :
    cond.includes("Clear") ? "☀️" :
    temp < 20 ? "❄️" : "🌤️";

  // Title pattern varies a bit for fun
  const patterns = [
    `${emojiByCond} ${capitalize(language)} ${capitalize(moodLabel)} Vibes`,
    `${emojiByCond} ${capitalize(cond)} ${capitalize(language)} Mix`,
    `${emojiByCond} ${capitalize(language)} ${temp}° ${capitalize(moodLabel)}`
  ];
  const pick = patterns[(temp + cond.length) % patterns.length];

  const desc = `Auto-curated ${language} ${moodLabel} playlist for ${cond.toLowerCase()} • ${temp}°C`;
  return { title: pick, desc };
}

function capitalize(s){ return (s||"").charAt(0).toUpperCase() + (s||"").slice(1); }

// ===============================
// AUTH
// ===============================
loginBtn.onclick = async () => {
  const res = await fetch("/api/login");
  const { authUrl } = await res.json();
  const popup = window.open(authUrl, "spotifyLogin", "width=600,height=700");

  window.addEventListener("message", (event) => {
    if (event.data.type === "SPOTIFY_AUTH_SUCCESS") {
      spotifyToken = event.data.token;
      spotifyUser  = event.data.user;
      localStorage.setItem("spotifyToken", spotifyToken);
      localStorage.setItem("spotifyUser", JSON.stringify(spotifyUser));
      popup.close();
      updateUI();
    }
  });
};

logoutBtn.onclick = () => {
  localStorage.clear();
  spotifyToken = null;
  spotifyUser  = null;
  updateUI();
};

// ===============================
// API CALLS
// ===============================
async function getWeather(city) {
  return fetch("/api/get-weather", {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ city })
  }).then(r => r.json());
}

async function getSongs(language, mood) {
  return fetch("/api/get-songs", {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ token: spotifyToken, language, mood })
  }).then(r => r.json());
}

async function createPlaylist(uris, name, description) {
  return fetch("/api/create-playlist", {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ token: spotifyToken, tracks: uris, name, description })
  }).then(r => r.json());
}

// ===============================
// SEARCH
// ===============================
searchBtn.onclick = async () => {
  if (!spotifyToken) return alert("Login first");
  const city = locationInput.value.trim();
  if (!city) return alert("Enter city");

  weatherBox.classList.remove("hidden");
  playlistDiv.classList.remove("hidden");
  vibeBox.classList.remove("hidden");
  createBtn.classList.add("hidden");
  playlistStatus.textContent = "";

  weatherBox.textContent = "🌤 Fetching weather...";
  playlistDiv.textContent = "🎧 Loading songs...";

  // 1) Weather
  const weather = await getWeather(city);
  if (weather.error) {
    weatherBox.textContent = "Weather error.";
    playlistDiv.textContent = "";
    return;
  }

  weatherBox.innerHTML = `
    <div class="text-center">
      <div class="text-2xl font-bold">${city}</div>
      <div class="text-xl">${weather.temp}°C • Feels ${weather.feels_like}°C</div>
      <div class="text-gray-300">${weather.condition}</div>
    </div>
  `;
  setWeatherBG(weather.condition, weather.temp);

  // 2) Mood (from slider) + basic weather-override
  let mood = moodMap[moodRange.value]; // sad/chill/happy/energetic/party
  const cond = weather.condition || "";
  if (cond.includes("Rain")) mood = "chill";
  if (cond.includes("Haze") || cond.includes("Fog") || cond.includes("Mist")) mood = "sad";
  if (weather.temp > 30 && mood !== "sad") mood = "energetic";

  // 3) “AI” Vibe name (local function)
  const vibe = buildVibeName(weather, languageSelect.value, mood);
  lastVibe = vibe;
  vibeTitle.textContent = vibe.title;
  vibeDesc.textContent  = vibe.desc;
  vibeBox.classList.remove("hidden");

  // 4) Songs
  const res = await getSongs(languageSelect.value, mood);
  if (!res.tracks?.length) {
    playlistDiv.innerHTML = "😕 No songs found for this combo. Try another city or language.";
    return;
  }

  lastURIs = res.tracks.map(t => t.uri);

  // Render list with cover + open link
  playlistDiv.innerHTML = res.tracks.map(t => `
    <div class="bg-white/10 p-2 rounded flex items-center gap-3">
      <img src="${t.image}" class="w-12 h-12 rounded">
      <div class="text-sm flex-1">
        <p class="font-bold">${t.name}</p>
        <p class="text-gray-300">${t.artist}</p>
      </div>
      <a href="${t.url}" target="_blank" class="text-green-400 text-xl" title="Open in Spotify">▶️</a>
    </div>
  `).join("");

  createBtn.classList.remove("hidden");
};

// ===============================
// CREATE PLAYLIST
// ===============================
createBtn.onclick = async () => {
  if (!lastURIs.length) return alert("No songs to add");

  playlistStatus.textContent = "⏳ Creating playlist...";
  createBtn.disabled = true;

  const out = await createPlaylist(
    lastURIs.slice(0, 35), // cap to 35
    lastVibe.title,
    lastVibe.desc
  );

  if (out?.url) {
    playlistStatus.innerHTML = `✅ Playlist created → <a href="${out.url}" target="_blank" class="underline text-blue-300">Open</a>`;
    createBtn.textContent = "Playlist Created ✅";
  } else {
    playlistStatus.textContent = "❌ Failed to create playlist";
    createBtn.disabled = false;
  }
};

updateUI();
