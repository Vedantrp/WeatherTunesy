// /public/app.js
// ELEMENTS
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const languageSelect = document.getElementById("language");

const locationInput = document.getElementById("location");
const searchBtn = document.getElementById("searchBtn");

const wLocation = document.getElementById("wLocation");
const wMood = document.getElementById("wMood");
const wTemp = document.getElementById("wTemp");

const playlistGrid = document.getElementById("playlistGrid");
const createBtn = document.getElementById("createPlaylistBtn");

// TOKEN STATE (localStorage)
let spotifyToken = localStorage.getItem("spotifyToken") || null;
let spotifyRefresh = localStorage.getItem("spotifyRefresh") || null;
let tokenExpiry = Number(localStorage.getItem("tokenExpiry") || 0);
let spotifyUser = JSON.parse(localStorage.getItem("spotifyUser") || "null");

let lastTracks = []; // array of track objects {id,name,artist,image,url}

// UI helper
function showToast(msg) {
  // simple alert fallback
  try {
    alert(msg);
  } catch (e) {
    console.log(msg);
  }
}

function updateAuthUI() {
  if (spotifyToken && spotifyUser) {
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    createBtn.classList.remove("hidden");
  } else {
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    createBtn.classList.add("hidden");
  }
}

// SAFE POST helper
async function postJSON(url, data) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data || {})
  });
  const text = await r.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error("Bad JSON from " + url + " -> " + text);
  }
}

// TOKEN REFRESH flow
async function getValidToken() {
  const now = Date.now();
  if (spotifyToken && now < tokenExpiry) return spotifyToken;

  if (!spotifyRefresh) {
    // no refresh -> force logout
    localStorage.clear();
    spotifyToken = spotifyRefresh = null;
    tokenExpiry = 0;
    spotifyUser = null;
    updateAuthUI();
    throw new Error("Not logged in");
  }

  // call refresh endpoint
  const res = await postJSON("/api/refresh", { refresh: spotifyRefresh });
  if (res && res.token) {
    spotifyToken = res.token;
    tokenExpiry = Date.now() + 3500 * 1000; // 58m
    localStorage.setItem("spotifyToken", spotifyToken);
    localStorage.setItem("tokenExpiry", tokenExpiry);
    return spotifyToken;
  } else {
    // failed refresh
    localStorage.clear();
    spotifyToken = spotifyRefresh = null;
    spotifyUser = null;
    updateAuthUI();
    throw new Error("Refresh failed");
  }
}

// LOGIN flow (opens popup to Spotify authorize)
loginBtn.onclick = async () => {
  try {
    const r = await fetch("/api/login");
    const { authUrl } = await r.json();
    const popup = window.open(authUrl, "_blank", "width=600,height=700");

    // listen for message from callback
    function handler(event) {
      if (event?.data?.type === "SPOTIFY_AUTH_SUCCESS") {
        spotifyToken = event.data.token;
        spotifyRefresh = event.data.refresh;
        spotifyUser = event.data.user;

        tokenExpiry = Date.now() + 3500 * 1000;

        localStorage.setItem("spotifyToken", spotifyToken);
        localStorage.setItem("spotifyRefresh", spotifyRefresh);
        localStorage.setItem("spotifyUser", JSON.stringify(spotifyUser));
        localStorage.setItem("tokenExpiry", tokenExpiry);

        updateAuthUI();
        window.removeEventListener("message", handler);
        try { popup.close(); } catch (e) {}
      }
    }

    window.addEventListener("message", handler);
  } catch (err) {
    console.error(err);
    showToast("Login failed");
  }
};

// LOGOUT
logoutBtn.onclick = () => {
  localStorage.clear();
  spotifyToken = spotifyRefresh = null;
  spotifyUser = null;
  tokenExpiry = 0;
  lastTracks = [];
  playlistGrid.innerHTML = "";
  updateAuthUI();
};

// SEARCH -> weather -> songs
searchBtn.onclick = async () => {
  try {
    let city = locationInput.value.trim();
    if (!city) city = "New York";

    // fetch weather
    const weather = await postJSON("/api/get-weather", { city });
    if (!weather?.temp) return showToast("Weather not found");

    wLocation.innerText = city;
    wTemp.innerText = `${weather.temp}°`;
    wMood.innerText = weather.condition;

    // determine mood
    let mood = "chill";
    if (weather.temp > 32) mood = "energetic";
    if (weather.temp < 20) mood = "cozy";
    if ((weather.condition || "").toLowerCase().includes("rain")) mood = "lofi";
    if ((weather.condition || "").toLowerCase().includes("haze")) mood = "mellow";

    // get a valid token (if logged in, token will be present; if not, we still try with null -> will error)
    let tokenToSend = null;
    try { tokenToSend = await getValidToken(); } catch (e) {
      // not logged in: show songs using clientless Spotify? no — Spotify search needs token.
      // We'll let user search but show a message to login for full songs and playlist creation.
      showToast("Login to fetch real songs & create playlists");
      return;
    }

    // fetch songs
    const songsResp = await postJSON("/api/get-songs", {
      token: tokenToSend,
      language: languageSelect.value,
      mood
    });

    if (!songsResp.tracks || !songsResp.tracks.length) {
      playlistGrid.innerHTML = "<div style='padding:20px'>No tracks found.</div>";
      lastTracks = [];
      return;
    }

    // store tracks and render SONG level UI
    lastTracks = songsResp.tracks;
    renderTracks(lastTracks);
    updateAuthUI();
  } catch (err) {
    console.error(err);
    showToast("Search error: " + (err.message || err));
  }
};

// render SONGS (not playlist cards)
function renderTracks(tracks) {
  playlistGrid.innerHTML = tracks
    .map(t => `
      <div class="playlist-card">
        <img src="${t.image || 'https://via.placeholder.com/600x400?text=No+Image'}" />
        <div class="card-content">
          <div class="card-title">${escapeHtml(t.name)}</div>
          <div class="card-desc">${escapeHtml(t.artist)}</div>
          <div class="track-count">🎵 Track</div>
          <div style="margin-top:8px">
            <a href="${t.url}" target="_blank" style="text-decoration:none;color:#0b74ff">Open on Spotify →</a>
          </div>
        </div>
      </div>
    `).join("");
}

// Create playlist on Spotify
createBtn.onclick = async () => {
  try {
    if (!spotifyUser || !spotifyUser.id) return showToast("Login required");
    if (!lastTracks.length) return showToast("Search songs first");

    const ids = lastTracks.map(t => t.id);
    const r = await postJSON("/api/create-playlist", {
      token: await getValidToken(),
      userId: spotifyUser.id,
      name: `WeatherTunes — ${wLocation.innerText} ${new Date().toLocaleString()}`,
      trackIds: ids
    });

    if (r && r.url) {
      window.open(r.url, "_blank");
      showToast("Playlist created!");
    } else {
      console.error("create-playlist response", r);
      showToast("Failed to create playlist");
    }
  } catch (err) {
    console.error(err);
    showToast("Create playlist failed: " + (err.message || err));
  }
};

// small escaping for safety
function escapeHtml(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// INITIALIZE UI state
updateAuthUI();
