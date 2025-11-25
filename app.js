// WeatherTunes frontend script
// - popup login flow with spotify
// - fetch weather -> then fetch songs -> display -> create playlist

const API_BASE = ""; // same-origin; calls to /api/...

// DOM
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userNameEl = document.getElementById("userName");
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

// state
let spotifyToken = localStorage.getItem("spotifyToken");
let spotifyUser = JSON.parse(localStorage.getItem("spotifyUser") || "null");
let cachedTracks = [];
let lastWeather = null;

// UI helpers
function showToast(txt, ms=3000){
  toast.textContent = txt;
  toast.classList.remove("hidden");
  setTimeout(()=> toast.classList.add("hidden"), ms);
}
function updateAuthUI(){
  if (spotifyToken && spotifyUser){
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    userNameEl.textContent = spotifyUser.display_name || spotifyUser.id || "";
  } else {
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    userNameEl.textContent = "";
  }
}
updateAuthUI();

// OAuth login
loginBtn.onclick = async () => {
  try {
    const res = await fetch("/api/login");
    if (!res.ok) throw new Error("Login endpoint failed");
    const json = await res.json();
    const authUrl = json.authUrl;
    const popup = window.open(authUrl, "spotifyLogin", "width=600,height=700");

    // receive message from popup callback
    function onMessage(e){
      if (!e.data) return;
      if (e.data.type === "SPOTIFY_AUTH_SUCCESS"){
        spotifyToken = e.data.accessToken;
        spotifyUser = e.data.user;
        localStorage.setItem("spotifyToken", spotifyToken);
        localStorage.setItem("spotifyUser", JSON.stringify(spotifyUser));
        updateAuthUI();
        showToast("Logged in!");
        window.removeEventListener("message", onMessage);
        if (popup && !popup.closed) popup.close();
      } else if (e.data.type === "SPOTIFY_AUTH_ERROR"){
        showToast("Login failed: " + (e.data.error || "unknown"));
        window.removeEventListener("message", onMessage);
        if (popup && !popup.closed) popup.close();
      }
    }
    window.addEventListener("message", onMessage, false);
  } catch (err){
    console.error("login error", err);
    showToast("Login error");
  }
};

logoutBtn.onclick = () => {
  spotifyToken = null;
  spotifyUser = null;
  localStorage.removeItem("spotifyToken");
  localStorage.removeItem("spotifyUser");
  updateAuthUI();
  showToast("Logged out");
};

// helpers: post JSON
async function postJSON(path, body){
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch (e) {
    throw new Error("Bad JSON " + text);
  }
}

// simple mood rule based on weather
function chooseMoodFromWeather(w){
  if (!w) return "chill";
  const c = (w.condition || "").toLowerCase();
  const t = w.tempC ?? ( (w.temp && (w.temp - 273.15)) );
  if (c.includes("rain") || c.includes("drizzle")) return "lofi";
  if (c.includes("snow")) return "calm";
  if (c.includes("cloud") || c.includes("overcast")) return "mellow";
  if (c.includes("clear") && t >= 25) return "summer";
  if (c.includes("haze") || c.includes("fog")) return "mysterious";
  if (t >= 30) return "energetic";
  if (t <= 5) return "cozy";
  return "chill";
}

async function handleSearch(){
  if (!spotifyToken){
    showToast("Please login to Spotify first");
    return;
  }
  const city = (locationInput.value || "").trim();
  if (!city){
    showToast("Enter a city");
    return;
  }
  playlistGrid.innerHTML = "";
  showToast("Fetching weather...");
  // fetch weather
  const wRes = await postJSON("/api/get-weather", { city });
  if (!wRes.ok){
    console.error("weather error", wRes);
    showToast(wRes.data?.error || "Weather failed");
    return;
  }
  const w = wRes.data;
  lastWeather = w;
  wLocation.textContent = (w.name || city) + (w.country ? ", " + w.country : "");
  wTemp.textContent = (w.tempC ? ${w.tempC.toFixed(1)}°C : ${(w.temp-273.15).toFixed(1)}°C);
  wMood.textContent = w.description || w.condition || "—";
  // choose mood and language
  const mood = chooseMoodFromWeather(w);
  const language = languageSelect.value || "english";

  // apply theme to body
  const body = document.body;
  body.classList.remove("theme-sunny","theme-cloudy","theme-rainy","theme-snowy","theme-stormy","theme-foggy");
  if (/clear|sunny/i.test(w.description || "")) body.classList.add("theme-sunny");
  else if (/rain|drizzle/i.test(w.description || "")) body.classList.add("theme-rainy");
  else if (/snow/i.test(w.description || "")) body.classList.add("theme-snowy");
  else if (/storm|thunder/i.test(w.description || "")) body.classList.add("theme-stormy");
  else if (/cloud|overcast/i.test(w.description || "")) body.classList.add("theme-cloudy");
  else body.classList.add("theme-foggy");

  showToast("Fetching songs...");
  const songsRes = await postJSON("/api/get-songs", {
    token: spotifyToken,
    language,
    mood
  });
  if (!songsRes.ok){
    console.error("songs error", songsRes);
    if (songsRes.status === 401){
      showToast("Spotify token expired. Login again.");
      // clear and force login flow
      localStorage.removeItem("spotifyToken");
      spotifyToken = null;
      updateAuthUI();
    } else {
      showToast(songsRes.data?.error || "Song fetch failed");
    }
    return;
  }
  const tracks = songsRes.data.tracks || [];
  cachedTracks = tracks;
  renderTracks(tracks);
  if (tracks.length) {
    createBtn.classList.remove("hidden");
    playlistLink.classList.add("hidden");
  } else {
    createBtn.classList.add("hidden");
    playlistLink.classList.add("hidden");
    showToast("No songs found — try different language or nearby city");
  }
}

function renderTracks(tracks){
  playlistGrid.innerHTML = "";
  if (!tracks || !tracks.length){
    playlistGrid.innerHTML = "<p>No songs</p>";
    return;
  }
  for (const t of tracks){
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.innerHTML = `
      <div class="cover" style="background-image:url('${t.image || ""}'); background-size:cover; background-position:center;"></div>
      <div class="meta">
        <div class="name">${escapeHtml(t.name)}</div>
        <div class="artist">${escapeHtml(t.artist)}</div>
        <div style="margin-top:8px"><a href="${t.url || "#"}" target="_blank" class="chip">Open on Spotify</a></div>
      </div>
    `;
    playlistGrid.appendChild(tile);
  }
}

createBtn.onclick = async () => {
  if (!spotifyToken) { showToast("Login first"); return; }
  if (!cachedTracks || !cachedTracks.length){ showToast("No tracks to create playlist"); return; }
  createBtn.disabled = true;
  createBtn.textContent = "Creating...";
  const uris = cachedTracks.slice(0,35).map(t => t.uri).filter(Boolean);
  const createRes = await postJSON("/api/create-playlist", {
    token: spotifyToken,
    name: WeatherTunes – ${wLocation.textContent || "Mix"},
    description: Auto-generated playlist for ${wLocation.textContent || "your place"} • ${wMood.textContent || ""},
    uris
  });
  createBtn.disabled = false;
  createBtn.textContent = "Create Playlist on Spotify";
  if (!createRes.ok){
    console.error("create failed", createRes);
    showToast(createRes.data?.error || "Create failed");
    return;
  }
  const playlist = createRes.data.playlist;
  if (playlist?.external_urls?.spotify){
    playlistLink.href = playlist.external_urls.spotify;
    playlistLink.classList.remove("hidden");
    showToast("Playlist created!");
  } else {
    showToast("Playlist created (no URL returned)");
  }
};

// helper escape HTML
function escapeHtml(s=''){ return String(s).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[m]); }

// initial restore tokens/user
(function restoreAuth(){
  if (spotifyToken){
    spotifyToken = localStorage.getItem("spotifyToken");
    spotifyUser = JSON.parse(localStorage.getItem("spotifyUser") || "null");
  }
  updateAuthUI();
})();
searchBtn.onclick = handleSearch;
