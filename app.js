// ===== GLOBAL STATE =====
let spotifyToken = localStorage.getItem("spotifyToken") || null;
let spotifyUser = JSON.parse(localStorage.getItem("spotifyUser") || "null");
let lastTracks = [];
let lastMood = "chill";

// ===== DOM =====
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
const toast = document.getElementById("toast");

// ===== UI HELPERS =====
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 3000);
}

function updateAuthUI() {
  if (spotifyToken && spotifyUser) {
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    userName.textContent = `Hi, ${spotifyUser.display_name || "User"} 👋`;
  } else {
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    userName.textContent = "";
  }
}

function setThemeByWeather(condition) {
  const body = document.body;
  body.className = "theme-default";
  const c = (condition || "").toLowerCase();

  if (c.includes("snow")) body.classList.add("theme-snowy");
  else if (c.includes("rain") || c.includes("drizzle")) body.classList.add("theme-rainy");
  else if (c.includes("thunder") || c.includes("storm")) body.classList.add("theme-stormy");
  else if (c.includes("fog") || c.includes("mist") || c.includes("haze")) body.classList.add("theme-foggy");
  else if (c.includes("cloud")) body.classList.add("theme-cloudy");
  else body.classList.add("theme-sunny");
}

function inferMoodFromWeather(tempC, condition) {
  const c = (condition || "").toLowerCase();
  if (c.includes("rain") || c.includes("drizzle")) return "chill";
  if (c.includes("haze") || c.includes("mist") || c.includes("fog")) return "sad";
  if (c.includes("snow") || tempC <= 16) return "sad";
  if (tempC >= 33) return "happy";
  if (c.includes("cloud")) return "chill";
  return "happy";
}

function coverOverlayForCondition(condition) {
  // You chose "All options" → we rotate subtle overlays
  const c = (condition || "").toLowerCase();
  const overlays = [
    "linear-gradient(0deg, rgba(0,0,0,.20), rgba(0,0,0,.05))",
    "linear-gradient(0deg, rgba(10,15,30,.22), rgba(10,15,30,.05))",
    "linear-gradient(0deg, rgba(20,10,30,.18), rgba(20,10,30,.04))",
    "linear-gradient(0deg, rgba(6,18,30,.20), rgba(6,18,30,.05))",
  ];
  // pick one based on condition hash
  let idx = 0;
  if (c.includes("rain")) idx = 1;
  else if (c.includes("cloud")) idx = 2;
  else if (c.includes("snow") || c.includes("fog") || c.includes("haze")) idx = 3;
  return overlays[idx];
}

function renderTracks(tracks, condition) {
  playlistGrid.innerHTML = "";
  if (!tracks.length) {
    playlistGrid.innerHTML = `<div class="tile glass" style="padding:18px;text-align:center">No songs found. Try a nearby city or another language.</div>`;
    createBtn.classList.add("hidden");
    playlistLink.classList.add("hidden");
    return;
  }
  const overlay = coverOverlayForCondition(condition);

  tracks.forEach(t => {
    const div = document.createElement("div");
    div.className = "tile";
    div.innerHTML = `
      <div class="cover" style="background-image:${overlay}, url('${t.image || "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop"}');"></div>
      <div class="meta">
        <p class="name">${t.name}</p>
        <p class="artist">${t.artist}</p>
        <a class="chip" href="${t.link}" target="_blank" rel="noopener">Open in Spotify →</a>
      </div>
    `;
    playlistGrid.appendChild(div);
  });

  if (spotifyToken) {
    createBtn.classList.remove("hidden");
  } else {
    createBtn.classList.add("hidden");
  }
  playlistLink.classList.add("hidden");
}

// ===== LOGIN FLOW =====
loginBtn.onclick = async () => {
  try {
    const res = await fetch("/api/login");
    const { authUrl, error } = await res.json();
    if (error || !authUrl) return showToast("Login failed: config");
    const popup = window.open(authUrl, "spotifyLogin", "width=600,height=700");

    window.addEventListener("message", (event) => {
      if (event.data?.type === "SPOTIFY_AUTH_SUCCESS") {
        spotifyToken = event.data.token;
        spotifyUser = event.data.user;
        localStorage.setItem("spotifyToken", spotifyToken);
        localStorage.setItem("spotifyUser", JSON.stringify(spotifyUser));
        updateAuthUI();
        popup && popup.close();
        showToast("Logged in!");
      }
      if (event.data?.type === "SPOTIFY_AUTH_ERROR") {
        showToast("Login failed");
        popup && popup.close();
      }
    });
  } catch {
    showToast("Popup blocked. Enable popups to login.");
  }
};

logoutBtn.onclick = () => {
  spotifyToken = null;
  spotifyUser = null;
  localStorage.clear();
  updateAuthUI();
  createBtn.classList.add("hidden");
  playlistLink.classList.add("hidden");
};

// ===== API HELPERS =====
async function postJSON(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(body || {})
  });
  const text = await r.text();
  try {
    const json = JSON.parse(text);
    if (!r.ok) throw new Error(json.error || "Request failed");
    return json;
  } catch {
    throw new Error("Bad JSON " + text.slice(0, 120));
  }
}

// ===== WEATHER + SONGS FLOW =====
searchBtn.onclick = async () => {
  const city = (locationInput.value || "").trim();
  if (!city) return showToast("Enter a city");

  wLocation.textContent = "…";
  wTemp.textContent = "…";
  wMood.textContent = "…";
  playlistGrid.innerHTML = `<div class="tile glass" style="padding:18px;text-align:center">Loading…</div>`;
  playlistLink.classList.add("hidden");

  try {
    // weather
    const weather = await postJSON("/api/get-weather", { city });
    const tempC = weather.temp;
    const cond = weather.condition || "";

    setThemeByWeather(cond);
    const mood = inferMoodFromWeather(tempC, cond);
    lastMood = mood;

    wLocation.textContent = city;
    wTemp.textContent = `${tempC}°C (feels ${weather.feels_like}°C)`;
    wMood.textContent = `${mood}`;

    // songs
    const language = languageSelect.value || "english";
    const data = await postJSON("/api/get-songs", {
      token: spotifyToken,
      language,
      mood
    });

    lastTracks = data.tracks || [];
    renderTracks(lastTracks, cond);
  } catch (e) {
    playlistGrid.innerHTML = `<div class="tile glass" style="padding:18px;text-align:center">${e.message}</div>`;
  }
};

// ===== CREATE PLAYLIST =====
createBtn.onclick = async () => {
  if (!spotifyToken) return showToast("Login required");
  if (!lastTracks.length) return showToast("No tracks to add");
  try {
    createBtn.disabled = true;
    createBtn.textContent = "Creating…";

    const uris = lastTracks.map(t => t.uri);
    const out = await postJSON("/api/create-playlist", {
      token: spotifyToken,
      name: `WeatherTunes – ${lastMood}`,
      description: "Auto-generated by WeatherTunes",
      uris
    });

    if (out.url) {
      playlistLink.href = out.url;
      playlistLink.classList.remove("hidden");
      showToast("Playlist created!");
    } else {
      showToast("Playlist created, but link missing");
    }
  } catch (e) {
    showToast("Create failed: " + e.message);
  } finally {
    createBtn.disabled = false;
    createBtn.textContent = "Create Playlist on Spotify";
  }
};

// init
updateAuthUI();
