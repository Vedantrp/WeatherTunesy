// WeatherTunes — Premium Glass (A / Fog / Fade)

// -------------------------------
// Helpers & State
// -------------------------------
const $ = (id) => document.getElementById(id);

const state = {
  token: localStorage.getItem("spotifyToken") || null,
  user: JSON.parse(localStorage.getItem("spotifyUser") || "null"),
  tracks: [],
  mood: "-",
  city: "-",
  tempC: "-",
  lastPlaylistId: null
};

const el = {
  loginBtn: $("loginBtn"),
  logoutBtn: $("logoutBtn"),
  userName: $("userName"),
  location: $("location"),
  language: $("language"),
  searchBtn: $("searchBtn"),
  wLocation: $("wLocation"),
  wTemp: $("wTemp"),
  wMood: $("wMood"),
  playlistList: $("playlistList"),
  createBtn: $("createBtn"),
  playlistLink: $("playlistLink"),
  toast: $("toast"),
  bg: $("bg"),
};

// -------------------------------
// UI & Theme
// -------------------------------
function showToast(msg) {
  el.toast.textContent = msg;
  el.toast.classList.remove("hidden");
  setTimeout(() => el.toast.classList.add("hidden"), 3000);
}

function updateUI() {
  if (state.token && state.user) {
    el.loginBtn.classList.add("hidden");
    el.logoutBtn.classList.remove("hidden");
    el.userName.textContent = `Hi, ${state.user.display_name || state.user.id}`;
  } else {
    el.loginBtn.classList.remove("hidden");
    el.logoutBtn.classList.add("hidden");
    el.userName.textContent = "";
  }

  // Create btn visible only when we have tracks + token
  if (state.tracks.length && state.token) {
    el.createBtn.classList.remove("hidden");
  } else {
    el.createBtn.classList.add("hidden");
  }

  // Playlist link shown only after we created it
  if (state.lastPlaylistId) {
    el.playlistLink.href = `https://open.spotify.com/playlist/${state.lastPlaylistId}`;
    el.playlistLink.classList.remove("hidden");
  } else {
    el.playlistLink.classList.add("hidden");
  }
}

// Map weather to mood & theme class
function moodFromWeather(w) {
  const t = (w.condition || "").toLowerCase();
  if (t.includes("rain") || t.includes("drizzle")) return { mood: "cozy", theme: "theme-rainy" };
  if (t.includes("snow")) return { mood: "warm", theme: "theme-snowy" };
  if (t.includes("storm") || t.includes("thunder")) return { mood: "intense", theme: "theme-stormy" };
  if (t.includes("haze") || t.includes("mist") || t.includes("fog")) return { mood: "chill", theme: "theme-foggy" };
  if (t.includes("cloud")) return { mood: "relaxed", theme: "theme-cloudy" };
  if (t.includes("clear") || t.includes("sun")) return { mood: "happy", theme: "theme-sunny" };
  return { mood: "chill", theme: "theme-default" };
}

function applyTheme(themeClass) {
  const classes = ["theme-default","theme-sunny","theme-cloudy","theme-rainy","theme-snowy","theme-stormy","theme-foggy"];
  classes.forEach(c => document.body.classList.remove(c));
  document.body.classList.add(themeClass);
}

// Render Spotify-style list with fade animation
function renderList(tracks) {
  el.playlistList.innerHTML = "";
  if (!tracks || !tracks.length) {
    el.playlistList.innerHTML = `<div class="row">No songs found. Try a nearby city or different language.</div>`;
    return;
  }
  const frag = document.createDocumentFragment();
  tracks.forEach(t => {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <img class="cover" alt="cover" src="${t.image || "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=600&auto=format&fit=crop"}"/>
      <div class="r-meta">
        <p class="r-title">${t.name}</p>
        <p class="r-artist">${t.artist}</p>
      </div>
      <div class="r-open"><a href="${t.url}" target="_blank" rel="noopener">Open</a></div>
    `;
    frag.appendChild(row);
  });
  el.playlistList.appendChild(frag);
}

// -------------------------------
// Networking
// -------------------------------
async function postJSON(path, body) {
  const r = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {})
  });
  const text = await r.text();
  try {
    const json = JSON.parse(text);
    if (!r.ok) throw new Error(json.error || "Request failed");
    return json;
  } catch {
    throw new Error(`Bad JSON ${text}`);
  }
}

// Auto location → city name fallback
async function getAutoCityIfEmpty() {
  const typed = el.location.value.trim();
  if (typed) return typed;

  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(""); // no geo
    const options = { enableHighAccuracy: true, timeout: 7000, maximumAge: 30000 };
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        // backend accepts coords; if yours only supports city, call reverse geocode here.
        const res = await postJSON("/api/get-weather", { lat: latitude, lon: longitude });
        // We already got weather here, so reuse, but also get a city-ish name
        if (res.name) return resolve(res.name);
        return resolve(""); // fallback
      } catch {
        return resolve("");
      }
    }, () => resolve(""), options);
  });
}

// -------------------------------
// Main flow
// -------------------------------
async function handleSearch() {
  try {
    el.createBtn.classList.add("hidden");
    state.lastPlaylistId = null;
    updateUI();

    // City (typed or auto)
    let city = el.location.value.trim();
    if (!city) {
      city = await getAutoCityIfEmpty();
      if (city) el.location.value = city;
    }
    if (!city) {
      showToast("Enter a city or enable location.");
      return;
    }

    // Weather
    const weather = await postJSON("/api/get-weather", { city });
    // Normalize
    state.city = city;
    state.tempC = Math.round(weather.temp);
    const wx = {
      temp: weather.temp,
      feels_like: weather.feels_like,
      condition: weather.condition || "Clear",
      icon: weather.icon || "01d"
    };
    const moodTheme = moodFromWeather(wx);
    state.mood = moodTheme.mood;
    applyTheme(moodTheme.theme);

    // Update weather UI
    el.wLocation.textContent = city;
    el.wTemp.textContent = `${state.tempC}°C`;
    el.wMood.textContent = state.mood;

    // Songs
    const language = el.language.value || "english";
    const out = await postJSON("/api/get-songs", {
      token: state.token,
      language,
      mood: state.mood
    });

    state.tracks = Array.isArray(out.tracks) ? out.tracks : [];
    renderList(state.tracks);
    updateUI();
    showToast(`${state.tracks.length} songs curated`);
  } catch (e) {
    console.error(e);
    showToast(e.message || "Something went wrong");
  }
}

// -------------------------------
/* Spotify Auth (popup → /api/login → /api/callback) */
// -------------------------------
async function loginSpotify() {
  try {
    const res = await fetch("/api/login");
    const data = await res.json();
    if (!data.authUrl) throw new Error("Login failed");

    // Try popup; if blocked, open in same tab
    const popup = window.open(data.authUrl, "spotifyLogin", "width=520,height=720");
    if (!popup || popup.closed || typeof popup.closed === "undefined") {
      window.location.href = data.authUrl; // fallback
      return;
    }

    const onMsg = (event) => {
      if (event?.data?.type === "SPOTIFY_AUTH_SUCCESS") {
        state.token = event.data.token;
        state.user = event.data.user;
        localStorage.setItem("spotifyToken", state.token);
        localStorage.setItem("spotifyUser", JSON.stringify(state.user));
        window.removeEventListener("message", onMsg);
        if (!popup.closed) popup.close();
        updateUI();
        showToast("Logged in");
      } else if (event?.data?.type === "SPOTIFY_AUTH_ERROR") {
        window.removeEventListener("message", onMsg);
        if (!popup.closed) popup.close();
        showToast("Login failed");
      }
    };
    window.addEventListener("message", onMsg);
  } catch (e) {
    showToast("Popup blocked — enable popups to login");
    console.error(e);
  }
}

function logoutSpotify() {
  state.token = null;
  state.user = null;
  state.tracks = [];
  state.lastPlaylistId = null;
  localStorage.removeItem("spotifyToken");
  localStorage.removeItem("spotifyUser");
  el.playlistList.innerHTML = "";
  renderList([]);
  updateUI();
  showToast("Logged out");
}

// -------------------------------
// Create Spotify Playlist
// -------------------------------
async function createPlaylist() {
  try {
    if (!state.token || !state.user) {
      showToast("Login to create a playlist");
      return;
    }
    if (!state.tracks.length) {
      showToast("No tracks to add");
      return;
    }
    const uris = state.tracks.map(t => t.uri).filter(Boolean).slice(0, 50);
    const name = `WeatherTunes – ${state.city} • ${state.mood}`;
    const out = await postJSON("/api/create-playlist", {
      token: state.token,
      name,
      description: `Auto-generated ${el.language.value} songs for ${state.mood} weather.`
    });

    if (!out.id) throw new Error("Create failed");
    // Add tracks
    await postJSON("/api/create-playlist", {
      token: state.token,
      playlistId: out.id,
      uris
    });

    state.lastPlaylistId = out.id;
    updateUI();
    showToast("Playlist created!");
  } catch (e) {
    console.error(e);
    showToast(e.message || "Create failed");
  }
}

// -------------------------------
// Wire events after DOM is ready
// -------------------------------
document.addEventListener("DOMContentLoaded", () => {
  // Safe bind (no nulls)
  if (el.searchBtn) el.searchBtn.onclick = handleSearch;
  if (el.loginBtn) el.loginBtn.onclick = loginSpotify;
  if (el.logoutBtn) el.logoutBtn.onclick = logoutSpotify;
  if (el.createBtn) el.createBtn.onclick = createPlaylist;

  updateUI();
});
