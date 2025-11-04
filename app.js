/* WeatherTunes – Final Frontend
 * - Spotify-only, no AI
 * - Strict language filtering via /api/get-tracks
 * - 35 tracks minimum (shuffled, de-duped)
 * - Playlist link always shown after add
 */

const API_BASE =
  location.hostname.includes("localhost")
    ? "http://localhost:3000/api"
    : `${location.origin}/api`;

const WEATHER_KEY = "b15d294bfca84397a5682344252410";
const PLAYLIST_SIZE = 35;

// STATE
let spotifyToken = null;
let spotifyRefresh = null;
let user = null;
let cachedTracks = [];
let currentMood = "relaxed";
let currentLanguage = "english";
let currentCity = "";

// DOM
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userInfo = document.getElementById("userInfo");
const userName = document.getElementById("userName");

const locationInput = document.getElementById("locationInput");
const languageSelect = document.getElementById("languageSelect");
const searchBtn = document.getElementById("searchBtn");

const loading = document.getElementById("loading");
const errorBox = document.getElementById("error");

const weatherCard = document.getElementById("weatherCard");
const cityName = document.getElementById("cityName");
const dateTime = document.getElementById("dateTime");
const temperature = document.getElementById("temperature");
const weatherDescription = document.getElementById("weatherDescription");
const weatherIcon = document.getElementById("weatherIcon");
const feelsLike = document.getElementById("feelsLike");
const humidity = document.getElementById("humidity");
const windSpeed = document.getElementById("windSpeed");

const playlistCard = document.getElementById("playlistCard");
const moodType = document.getElementById("moodType");
const playlistSuggestion = document.getElementById("playlistSuggestion");
const genreTags = document.getElementById("genreTags");
const aiPlaylistSection = document.getElementById("aiPlaylistSection");
const aiSongList = document.getElementById("aiSongList");

const createPlaylistBtn = document.getElementById("createPlaylistBtn");
const createPlaylistText = document.getElementById("createPlaylistText");
const playlistLink = document.getElementById("playlistLink");
const createdPlaylist = document.getElementById("createdPlaylist");
const openSpotifyBtn = document.getElementById("openSpotifyBtn");

// Helpers
const show = (el) => el && el.classList && el.classList.remove("hidden");
const hide = (el) => el && el.classList && el.classList.add("hidden");
function showError(msg) { if (!errorBox) return; errorBox.textContent = msg; show(errorBox); setTimeout(()=>hide(errorBox), 6000); }
function showLoading(text="Loading…"){ if (!loading) return; loading.innerHTML = `<div class="spinner"></div><p>${text}</p>`; show(loading); }
function hideLoading(){ hide(loading); }

function formatDateTime(str){
  const d = new Date((str||"").replace(" ", "T"));
  return d.toLocaleString(undefined, {weekday:"short", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit"});
}

function mapMood(condition, tempC, isDay, windKph){
  const c = (condition||"").toLowerCase();
  if (c.includes("thunder") || c.includes("storm")) return "intense";
  if (c.includes("rain") || c.includes("drizzle")) return "cozy";
  if (c.includes("snow") || tempC <= 10) return "winter";
  if (c.includes("mist") || c.includes("fog")) return "mysterious";
  if (c.includes("sun") || c.includes("clear")) return isDay ? "upbeat" : "relaxed";
  if (c.includes("cloud")) return "relaxed";
  if (tempC >= 32) return "tropical";
  if (windKph >= 30) return "energetic";
  return "balanced";
}

// Auth
function persistAuth(){ localStorage.setItem("spotify", JSON.stringify({spotifyToken, spotifyRefresh, user})); }
function restoreAuth(){
  try {
    const raw = localStorage.getItem("spotify");
    if (!raw) return;
    const v = JSON.parse(raw);
    spotifyToken = v.spotifyToken;
    spotifyRefresh = v.spotifyRefresh;
    user = v.user;
  } catch {}
  updateAuthUI();
}
function updateAuthUI(){
  if (spotifyToken && user) {
    hide(loginBtn);
    show(userInfo);
    userName.textContent = `Logged in as ${user.display_name || user.id}`;
    if (cachedTracks.length) {
      createPlaylistBtn.disabled = false;
      createPlaylistText.textContent = "Create Playlist";
    }
  } else {
    show(loginBtn);
    hide(userInfo);
    createPlaylistBtn.disabled = true;
    createPlaylistText.textContent = "Login to Create";
  }
}
async function loginSpotify(){
  try {
    const r = await fetch(`${API_BASE}/login`);
    const { authUrl } = await r.json();
    const popup = window.open(authUrl, "Spotify Login", "width=520,height=720");
    if (!popup) return showError("Popup blocked. Allow popups.");
    const listener = (e)=>{
      if (e.data?.type === "SPOTIFY_AUTH_SUCCESS"){
        spotifyToken = e.data.token;
        spotifyRefresh = e.data.refreshToken;
        user = e.data.user;
        persistAuth();
        updateAuthUI();
        window.removeEventListener("message", listener);
        popup.close();
      }
    };
    window.addEventListener("message", listener);
  } catch(e){ showError("Spotify login failed"); }
}
async function refreshToken(){
  const r = await fetch(`${API_BASE}/refresh-token`, {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ refreshToken: spotifyRefresh })
  });
  const d = await r.json();
  if (d.accessToken) {
    spotifyToken = d.accessToken;
    persistAuth();
    updateAuthUI();
  }
}
function logout(){ localStorage.clear(); location.reload(); }

// Weather fetch + UI
async function fetchWeather(city){
  const r = await fetch(`https://api.weatherapi.com/v1/current.json?key=${WEATHER_KEY}&q=${encodeURIComponent(city)}&aqi=no`);
  const d = await r.json();
  if (d?.error) throw new Error(d.error.message || "Weather failed");
  return d;
}
function displayWeather(data){
  const { location, current } = data;
  cityName.textContent = `${location.name}, ${location.country}`;
  dateTime.textContent = formatDateTime(location.localtime);
  temperature.textContent = Math.round(current.temp_c);
  weatherDescription.textContent = current.condition.text;
  weatherIcon.src = `https:${current.condition.icon}`;
  weatherIcon.alt = current.condition.text;
  feelsLike.textContent = `${Math.round(current.feelslike_c)}°C`;
  humidity.textContent = `${current.humidity}%`;
  windSpeed.textContent = `${current.wind_kph} km/h`;
  show(weatherCard);
}

function displayMood(mood, language){
  currentMood = mood;
  currentLanguage = language;
  moodType.textContent = mood;
  playlistSuggestion.textContent = `WeatherTunes — ${mood} vibes in ${language}`;
  genreTags.innerHTML = "";
  show(playlistCard);
}

function renderTracks(list){
  aiSongList.innerHTML = "";
  if (!list || !list.length) {
    hide(aiPlaylistSection);
    createPlaylistBtn.disabled = true;
    createPlaylistText.textContent = "No songs found";
    return;
  }
  list.forEach((t, i)=>{
    const li = document.createElement("li");
    li.className = "ai-song-item hover:bg-gray-800 px-3 py-1 rounded-lg transition";
    li.textContent = `${i+1}. ${t.name} — ${t.artist}`;
    aiSongList.appendChild(li);
  });
  show(aiPlaylistSection);
  if (spotifyToken && user) {
    createPlaylistBtn.disabled = false;
    createPlaylistText.textContent = "Create Playlist";
  }
}

// Get tracks from server (language-strict)
async function getTracks(language, mood){
  const r = await fetch(`${API_BASE}/get-tracks`, {
    method:"POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ language, mood, token: spotifyToken })
  });
  // If token expired, refresh once
  if (r.status === 401) {
    await refreshToken();
    const r2 = await fetch(`${API_BASE}/get-tracks`, {
      method:"POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ language, mood, token: spotifyToken })
    });
    const d2 = await r2.json();
    return d2.tracks || [];
  }
  const d = await r.json();
  return d.tracks || [];
}

function pick35Unique(arr){
  const seen = new Set();
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const t = arr[i];
    if (t.id && !seen.has(t.id)) {
      seen.add(t.id);
      out.push(t);
    }
    if (out.length >= PLAYLIST_SIZE) break;
  }
  // if still less, just fill
  if (out.length < PLAYLIST_SIZE) {
    for (const t of arr) {
      if (out.length >= PLAYLIST_SIZE) break;
      if (!out.find(x=>x.id===t.id)) out.push(t);
    }
  }
  return out;
}

async function handleSearch(){
  try {
    hide(errorBox);
    hide(createdPlaylist);
    currentCity = (locationInput.value || "").trim();
    currentLanguage = (languageSelect.value || "english").toLowerCase();
    if (!currentCity) return showError("Enter a city");

    showLoading("Fetching weather…");
    const w = await fetchWeather(currentCity);
    displayWeather(w);

    const mood = mapMood(
      w.current.condition.text,
      w.current.temp_c,
      w.current.is_day === 1,
      w.current.wind_kph
    );
    displayMood(mood, currentLanguage);

    showLoading("Finding songs on Spotify…");
    const pool = await getTracks(currentLanguage, mood);

    // shuffle & pick 35
    for (let i = pool.length-1; i>0; i--){
      const j = Math.floor(Math.random()*(i+1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    cachedTracks = pick35Unique(pool);
    renderTracks(cachedTracks);
  } catch(e){
    console.error(e);
    showError(e.message || "Something went wrong.");
  } finally {
    hideLoading();
  }
}

// Playlist creation (with batching + link fix)
async function createPlaylist(){
  try {
    if (!spotifyToken || !user) return showError("Login to Spotify first.");
    if (!cachedTracks.length) return showError("No tracks to add.");

    createPlaylistBtn.disabled = true;
    createPlaylistText.textContent = "Creating…";

    const name = `WeatherTunes — ${currentMood[0].toUpperCase()+currentMood.slice(1)} Mix`;
    const desc = `Auto-generated ${currentLanguage} ${currentMood} mix for ${currentCity || "your city"}`;

    // 1) Create
    let res = await fetch(`https://api.spotify.com/v1/users/${user.id}/playlists`, {
      method:"POST",
      headers: { Authorization: `Bearer ${spotifyToken}`, "Content-Type":"application/json" },
      body: JSON.stringify({ name, description: desc, public: false })
    });

    if (res.status === 401) {
      await refreshToken();
      res = await fetch(`https://api.spotify.com/v1/users/${user.id}/playlists`, {
        method:"POST",
        headers: { Authorization: `Bearer ${spotifyToken}`, "Content-Type":"application/json" },
        body: JSON.stringify({ name, description: desc, public: false })
      });
    }

    const playlist = await res.json();
    if (!playlist?.id) throw new Error("Playlist create failed.");

    // 2) Add tracks in chunks of 20
    const uris = cachedTracks.map(t=>t.uri).filter(Boolean);
    for (let i=0; i<uris.length; i+=20) {
      const chunk = uris.slice(i, i+20);
      let add = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
        method:"POST",
        headers: { Authorization: `Bearer ${spotifyToken}`, "Content-Type":"application/json" },
        body: JSON.stringify({ uris: chunk })
      });
      if (add.status === 401) {
        await refreshToken();
        add = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
          method:"POST",
          headers: { Authorization: `Bearer ${spotifyToken}`, "Content-Type":"application/json" },
          body: JSON.stringify({ uris: chunk })
        });
      }
    }

    // 3) Always show link (even if images not ready yet)
    const link = playlist?.external_urls?.spotify || `https://open.spotify.com/playlist/${playlist.id}`;
    playlistLink.href = link;
    playlistLink.textContent = "Open Playlist on Spotify →";
    show(createdPlaylist);

    createPlaylistText.textContent = "Playlist Created ✅";
  } catch(e){
    console.error(e);
    showError(e.message || "Failed to create playlist.");
  } finally {
    createPlaylistBtn.disabled = false;
  }
}

// Events
loginBtn.addEventListener("click", loginSpotify);
logoutBtn.addEventListener("click", logout);
searchBtn.addEventListener("click", handleSearch);
locationInput.addEventListener("keypress", (e)=> e.key==="Enter" && handleSearch());
createPlaylistBtn.addEventListener("click", createPlaylist);

// Init
restoreAuth();
console.log("WeatherTunes ready.");
