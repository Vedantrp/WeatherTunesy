// ===============================
// GLOBAL STATE
// ===============================
let spotifyToken = localStorage.getItem("spotifyToken") || null;
let spotifyUser  = JSON.parse(localStorage.getItem("spotifyUser") || "null");
let lastTracks   = [];

// DOM
const els = {
  loginBtn:  document.getElementById("loginBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  userName:  document.getElementById("userName"),
  city:      document.getElementById("location"),
  lang:      document.getElementById("language"),
  searchBtn: document.getElementById("searchBtn"),
  wLocation: document.getElementById("wLocation"),
  wTemp:     document.getElementById("wTemp"),
  wMood:     document.getElementById("wMood"),
  grid:      document.getElementById("playlistGrid"),
  createBtn: document.getElementById("createBtn"),
  link:      document.getElementById("playlistLink"),
  toast:     document.getElementById("toast"),
  body:      document.body
};

const WEATHER_BG = {
  Clear: "sunny",
  Clouds: "cloudy",
  Rain: "rainy",
  Drizzle: "rainy",
  Thunderstorm: "stormy",
  Snow: "snowy",
  Mist: "foggy",
  Haze: "foggy",
  Fog: "foggy",
};

// ===============================
// HELPERS
// ===============================
function toast(msg, ok=true){
  els.toast.textContent = msg;
  els.toast.style.borderColor = ok ? "#3be0a1" : "#ff7a7a";
  els.toast.classList.remove("hidden");
  setTimeout(()=>els.toast.classList.add("hidden"), 3000);
}
async function postJSON(url, data){
  const r = await fetch(url, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(data)
  });
  const txt = await r.text();
  let json;
  try { json = JSON.parse(txt); } catch {
    throw new Error("Bad JSON "+txt);
  }
  if(!r.ok) throw new Error(json.error || "Request failed");
  return json;
}
function setThemeByCondition(main){
  const theme = WEATHER_BG[main] || "cloudy";
  els.body.className = `theme-${theme}`;
}
function moodFromWeather(temp, main){
  // Simple but effective mood map
  let mood = "chill";
  if (temp >= 32) mood = "happy";
  if (/Rain|Drizzle|Thunderstorm/i.test(main)) mood = "sad";
  if (/Snow|Fog|Haze|Mist/i.test(main)) mood = "cozy";
  if (/Clear/i.test(main) && temp >= 26) mood = "happy";
  return mood;
}
function updateAuthUI(){
  if (spotifyToken && spotifyUser) {
    els.loginBtn.classList.add("hidden");
    els.logoutBtn.classList.remove("hidden");
    els.userName.textContent = `Logged in: ${spotifyUser.display_name || spotifyUser.id}`;
  } else {
    els.loginBtn.classList.remove("hidden");
    els.logoutBtn.classList.add("hidden");
    els.userName.textContent = "";
  }
}
function renderTracks(tracks){
  lastTracks = tracks || [];
  els.grid.innerHTML = "";
  if (!lastTracks.length){
    els.grid.innerHTML = `<div class="card glass">No songs found. Try a nearby city or another language.</div>`;
    els.createBtn.classList.add("hidden");
    els.link.classList.add("hidden");
    return;
  }
  const frag = document.createDocumentFragment();
  lastTracks.forEach(t=>{
    const tile = document.createElement("div");
    tile.className = "tile";
    const cover = document.createElement("div");
    cover.className = "cover";
    cover.style.backgroundImage = t.image ? `url('${t.image}')` : "url('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop')";
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = `
      <div class="name" title="${t.name}">${t.name}</div>
      <div class="artist" title="${t.artist}">${t.artist}</div>
      <span class="chip">Popularity ${t.pop ?? 0}</span>
    `;
    tile.appendChild(cover);
    tile.appendChild(meta);
    tile.onclick = ()=> window.open(t.url || `https://open.spotify.com/track/${t.id}`,'_blank');
    frag.appendChild(tile);
  });
  els.grid.appendChild(frag);

  // Create playlist button visible if logged in
  if (spotifyToken && spotifyUser) {
    els.createBtn.classList.remove("hidden");
  } else {
    els.createBtn.classList.add("hidden");
  }
  els.link.classList.add("hidden");
}

// ===============================
// LOGIN / LOGOUT
// ===============================
els.loginBtn.onclick = async () => {
  try {
    const res = await fetch("/api/login");
    const { authUrl } = await res.json();
    const popup = window.open(authUrl, "spotifyLogin", "width=520,height=650");

    if (!popup) {
      toast("Please allow popups for Spotify login.", false);
      return;
    }

    // Receive token from /api/callback
    const handler = (event) => {
      if (event.data?.type === "SPOTIFY_AUTH_SUCCESS") {
        spotifyToken = event.data.token;
        spotifyUser  = event.data.user;
        localStorage.setItem("spotifyToken", spotifyToken);
        localStorage.setItem("spotifyUser", JSON.stringify(spotifyUser));
        updateAuthUI();
        window.removeEventListener("message", handler);
        popup.close();
        toast("Logged in ✅");
        if (lastTracks.length) els.createBtn.classList.remove("hidden");
      } else if (event.data?.type === "SPOTIFY_AUTH_ERROR") {
        toast("Login failed", false);
        window.removeEventListener("message", handler);
        popup.close();
      }
    };
    window.addEventListener("message", handler);
  } catch (e) {
    toast(e.message || "Login failed", false);
  }
};

els.logoutBtn.onclick = () => {
  spotifyToken = null;
  spotifyUser  = null;
  localStorage.removeItem("spotifyToken");
  localStorage.removeItem("spotifyUser");
  updateAuthUI();
  els.createBtn.classList.add("hidden");
  toast("Logged out");
};

// ===============================
// AUTO-LOCATION + WEATHER
// ===============================
window.onload = () => {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        // reverse geocode (accurate human city)
        const geoRes = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
        );
        const geo = await geoRes.json();
        if (geo.city) els.city.value = geo.city;

        // weather by GPS (accurate temp)
        const weather = await postJSON("/api/get-weather", { lat, lon });
        els.wLocation.textContent = `${weather.city}, ${weather.country || ""}`.trim();
        els.wTemp.textContent = `${Math.round(weather.temp)}°C`;
        setThemeByCondition(weather.condition);

        const mood = moodFromWeather(weather.temp, weather.condition);
        els.wMood.textContent = mood;

      } catch (e) {
        console.log("Auto locate failed", e);
      }
    });
  }
  updateAuthUI();
};

// ===============================
// SEARCH (Weather + Songs)
// ===============================
els.searchBtn.onclick = async () => {
  try {
    // Get weather (prefer GPS if available later; fallback to city)
    const city = (els.city.value || "").trim();
    if (!city) {
      toast("Enter a city (or allow location)", false);
      return;
    }

    const weather = await postJSON("/api/get-weather", { city });
    els.wLocation.textContent = `${weather.city}, ${weather.country || ""}`.trim();
    els.wTemp.textContent = `${Math.round(weather.temp)}°C`;
    setThemeByCondition(weather.condition);

    const mood = moodFromWeather(weather.temp, weather.condition);
    els.wMood.textContent = mood;

    // Get songs (requires token for Spotify search)
    const token = spotifyToken;
    const language = els.lang.value;
    const songsResp = await postJSON("/api/get-songs", { token, language, mood });
    renderTracks(songsResp.tracks);

  } catch (e) {
    console.error(e);
    toast(e.message || "Something went wrong", false);
  }
};

// ===============================
// CREATE PLAYLIST
// ===============================
els.createBtn.onclick = async () => {
  try {
    if (!spotifyToken || !spotifyUser) {
      toast("Login to Spotify first", false);
      return;
    }
    if (!lastTracks.length) {
      toast("No tracks to add", false);
      return;
    }
    els.createBtn.disabled = true;
    els.createBtn.textContent = "Creating…";

    const uris = lastTracks.slice(0, 50).map(t=>t.uri).filter(Boolean);
    const resp = await postJSON("/api/create-playlist", {
      token: spotifyToken,
      userId: spotifyUser.id,
      name: "WeatherTunes Mix",
      description: "Auto-generated weather mix",
      uris
    });

    if (resp?.external) {
      els.link.href = resp.external;
      els.link.classList.remove("hidden");
      toast("Playlist created ✅");
    } else {
      toast("Playlist created (no link?)", false);
    }
  } catch (e) {
    console.error(e);
    toast(e.message || "Create failed", false);
  } finally {
    els.createBtn.disabled = false;
    els.createBtn.textContent = "Create Playlist on Spotify";
  }
};
