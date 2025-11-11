// ===== Global state =====
let spotifyToken = localStorage.getItem("spotifyToken") || null;
let spotifyUser = JSON.parse(localStorage.getItem("spotifyUser") || "null");
let lastTracks = [];
let lastMood = "chill";

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userName  = document.getElementById("userName");
const popupHint = document.getElementById("popupHint");

const locationInput = document.getElementById("location");
const languageSelect = document.getElementById("language");
const searchBtn = document.getElementById("searchBtn");

const wLocation = document.getElementById("wLocation");
const wTemp     = document.getElementById("wTemp");
const wMood     = document.getElementById("wMood");

const playlistGrid = document.getElementById("playlistGrid");
const createBtn    = document.getElementById("createBtn");
const playlistLink = document.getElementById("playlistLink");
const toast        = document.getElementById("toast");

// ===== UI helpers =====
function showToast(msg, kind="ok"){
  toast.textContent = msg;
  toast.style.borderColor = kind === "error" ? "#ff7a7a55" : "#ffffff22";
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 3000);
}

function updateUI(){
  if (spotifyToken && spotifyUser){
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    userName.textContent = `Hi, ${spotifyUser.display_name || "Listener"}`;
    createBtn.classList.toggle("hidden", !lastTracks.length);
  } else {
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    userName.textContent = "";
    createBtn.classList.add("hidden");
  }
}

function setThemeFromCondition(cond){
  const b = document.body;
  const c = (cond || "").toLowerCase();
  b.classList.remove("theme-sunny","theme-cloudy","theme-rainy","theme-snowy","theme-stormy","theme-foggy");
  if (c.includes("rain") || c.includes("drizzle")) b.classList.add("theme-rainy");
  else if (c.includes("snow")) b.classList.add("theme-snowy");
  else if (c.includes("storm") || c.includes("thunder")) b.classList.add("theme-stormy");
  else if (c.includes("haze") || c.includes("mist") || c.includes("fog")) b.classList.add("theme-foggy");
  else if (c.includes("cloud")) b.classList.add("theme-cloudy");
  else b.classList.add("theme-sunny");
}

function moodFromWeather(temp, condition){
  const c = (condition || "").toLowerCase();
  if (c.includes("rain") || c.includes("drizzle")) return "lofi";
  if (c.includes("haze") || c.includes("mist") || c.includes("fog")) return "gloomy";
  if (c.includes("snow")) return "calm";
  if (temp > 30) return "summer";
  if (temp < 16) return "warmth";
  return "chill";
}

function renderTracks(tracks){
  playlistGrid.innerHTML = "";
  if (!tracks || !tracks.length){
    playlistGrid.innerHTML = `<div class="card glass" style="grid-column:1/-1;text-align:center">No songs found. Try another language or city.</div>`;
    createBtn.classList.add("hidden");
    return;
  }
  const frag = document.createDocumentFragment();
  tracks.forEach(t=>{
    const tile = document.createElement("div");
    tile.className = "tile";
    const img = t.image || "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop";
    tile.innerHTML = `
      <div class="cover" style="background-image:url('${img.replace(/'/g,"%27")}')"></div>
      <div class="meta">
        <p class="name">${t.name}</p>
        <p class="artist">${t.artist}</p>
        <a class="chip" href="${t.url}" target="_blank" rel="noopener">Open in Spotify →</a>
      </div>
    `;
    frag.appendChild(tile);
  });
  playlistGrid.appendChild(frag);
  createBtn.classList.toggle("hidden", !(spotifyToken && spotifyUser));
}

// ===== API helpers =====
async function postJSON(url, body){
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify(body || {})
  });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text) } catch {
    throw new Error("Bad JSON " + text);
  }
  if (!r.ok) throw new Error(data.error || "Request failed");
  return data;
}

// ===== Login flow (popup-safe) =====
loginBtn.onclick = async () => {
  try {
    // Try to open popup immediately (reduces blocking)
    const prePopup = window.open("", "spotifyLogin", "width=560,height=680");
    if (!prePopup) {
      popupHint.classList.remove("hidden");
      showToast("Enable pop-ups to log in", "error");
      return;
    }
    prePopup.document.write(`<p style="font-family:sans-serif;padding:20px">Loading Spotify Login...</p>`);

    const res = await fetch("/api/login");
    const data = await res.json();
    if (!data.authUrl) throw new Error("Auth URL missing");

    // Redirect popup to Spotify
    prePopup.location.href = data.authUrl;

    // Listen for callback message
    const onMsg = (e) => {
      if (e.data?.type === "SPOTIFY_AUTH_SUCCESS") {
        spotifyToken = e.data.token;
        spotifyUser  = e.data.user;
        localStorage.setItem("spotifyToken", spotifyToken);
        localStorage.setItem("spotifyUser", JSON.stringify(spotifyUser));
        try { prePopup.close(); } catch {}
        window.removeEventListener("message", onMsg);
        updateUI();
        showToast("Logged in ✅");
      } else if (e.data?.type === "SPOTIFY_AUTH_FAILED") {
        try { prePopup.close(); } catch {}
        window.removeEventListener("message", onMsg);
        showToast("Login failed", "error");
      }
    };
    window.addEventListener("message", onMsg);
  } catch (err) {
    showToast("Login crashed: " + err.message, "error");
  }
};

logoutBtn.onclick = () => {
  spotifyToken = null;
  spotifyUser = null;
  localStorage.removeItem("spotifyToken");
  localStorage.removeItem("spotifyUser");
  updateUI();
  showToast("Logged out");
};

// ===== Weather + Songs =====
searchBtn.onclick = async () => {
  const city = (locationInput.value || "").trim();
  const language = languageSelect.value || "english";
  if (!city) { showToast("Enter a city"); return; }

  // Weather
  try {
    const w = await postJSON("/api/get-weather", { city });
    const temp = Math.round(w.temp);
    const cond = w.condition || "Clear";

    wLocation.textContent = city;
    wTemp.textContent = `${temp}°C (feels ${Math.round(w.feels_like)}°C)`;
    lastMood = moodFromWeather(temp, cond);
    wMood.textContent = lastMood;
    setThemeFromCondition(cond);

    // Songs
    const s = await postJSON("/api/get-songs", {
      token: spotifyToken,
      language,
      mood: lastMood
    });
    lastTracks = s.tracks || [];
    renderTracks(lastTracks);
  } catch (e) {
    renderTracks([]);
    showToast(e.message || "Error", "error");
  }
};

// ===== Create playlist =====
createBtn.onclick = async () => {
  if (!spotifyToken || !spotifyUser) {
    showToast("Login with Spotify first", "error");
    return;
  }
  if (!lastTracks.length){
    showToast("No tracks to add", "error");
    return;
  }

  try {
    const uris = lastTracks.map(t=>t.uri).filter(Boolean).slice(0, 50);
    const name = `WeatherTunes – ${wMood.textContent || "Vibes"} (${new Date().toLocaleDateString()})`;
    const r = await postJSON("/api/create-playlist", { token: spotifyToken, name, uris });
    if (r.url){
      playlistLink.href = r.url;
      playlistLink.classList.remove("hidden");
      showToast("Playlist created ✅");
    } else {
      showToast("Playlist created but no link?", "error");
    }
  } catch (e) {
    showToast(e.message || "Create failed", "error");
  }
};

// init
updateUI();
