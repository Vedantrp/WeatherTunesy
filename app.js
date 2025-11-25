// ===============================
// GLOBAL STATE
// ===============================
let spotifyToken = localStorage.getItem("spotifyToken") || null;
let refreshToken = localStorage.getItem("refreshToken") || null;
let spotifyUser = JSON.parse(localStorage.getItem("spotifyUser") || "null");

// UI refs
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userName = document.getElementById("userName");
const locationInput = document.getElementById("location");
const languageSelect = document.getElementById("language");
const searchBtn = document.getElementById("searchBtn");
const createPlaylistBtn = document.getElementById("createPlaylistBtn");

const wLocation = document.getElementById("wLocation");
const wTemp = document.getElementById("wTemp");
const wMood = document.getElementById("wMood");
const playlistGrid = document.getElementById("playlistGrid");
const toast = document.getElementById("toast");


// ===============================
// HELPERS
// ===============================
function showToast(msg) {
  toast.innerText = msg;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2000);
}

function updateUI() {
  if (spotifyUser && spotifyToken) {
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    userName.innerText = spotifyUser.display_name;
  } else {
    logoutBtn.classList.add("hidden");
    loginBtn.classList.remove("hidden");
    userName.innerText = "";
  }
}

async function postJSON(url, data) {
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const text = await r.text();
    return JSON.parse(text);
  } catch (err) {
    console.error("BAD JSON:", err);
    return { error: true };
  }
}


// ===============================
// REFRESH FLOW
// ===============================
async function refreshSpotifyToken() {
  if (!refreshToken) return null;
  try {
    const r = await postJSON("/api/refresh-token", { refresh_token: refreshToken });
    if (r.access_token) {
      spotifyToken = r.access_token;
      localStorage.setItem("spotifyToken", spotifyToken);
      if (r.refresh_token) {
        refreshToken = r.refresh_token;
        localStorage.setItem("refreshToken", refreshToken);
      }
      return spotifyToken;
    } else {
      console.warn("Refresh returned no token", r);
    }
  } catch (err) {
    console.error("Refresh error", err);
  }
  return null;
}


// ===============================
// LOGIN FLOW (popup -> callback sends token + refresh_token + user)
// ===============================
loginBtn.onclick = async () => {
  const res = await fetch("/api/login");
  const { authUrl } = await res.json();
  const popup = window.open(authUrl, "_blank", "width=600,height=700");

  window.addEventListener("message", (event) => {
    if (event.data.type === "SPOTIFY_AUTH_SUCCESS") {
      spotifyToken = event.data.token;
      refreshToken = event.data.refresh_token || null;
      spotifyUser = event.data.user;

      localStorage.setItem("spotifyToken", spotifyToken);
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("spotifyUser", JSON.stringify(spotifyUser));

      popup.close();
      updateUI();
    }
  });
};

logoutBtn.onclick = () => {
  localStorage.clear();
  spotifyToken = null;
  refreshToken = null;
  spotifyUser = null;
  window.currentTracks = null;
  updateUI();
};


// ===============================
// AUTO LOGIN ON LOAD
// ===============================
(async function autoLogin() {
  if (!refreshToken) return;
  const newToken = await refreshSpotifyToken();
  if (newToken) {
    console.log("Auto-login success");
    updateUI();
  } else {
    console.log("Auto-login failed");
  }
})();


// ===============================
// API CALLS
// ===============================
async function getWeather(city) {
  return postJSON("/api/get-weather", { city });
}

async function getSongs(language, mood) {
  // primary attempt
  const r = await postJSON("/api/get-songs", { token: spotifyToken, language, mood });

  // handle expired token
  if (r && r.error === "Spotify token expired") {
    const newToken = await refreshSpotifyToken();
    if (newToken) {
      return postJSON("/api/get-songs", { token: newToken, language, mood });
    }
  }

  return r;
}

async function createPlaylist(tracks) {
  return postJSON("/api/create-playlist", { token: spotifyToken, tracks });
}


// ===============================
// RENDER SONGS (NO IMAGES)
// ===============================
function renderSongs(tracks) {
  playlistGrid.innerHTML = "";
  if (!Array.isArray(tracks) || tracks.length === 0) {
    playlistGrid.innerHTML = `<div class="empty glass">No songs found</div>`;
    window.currentTracks = [];
    return;
  }

  // store for playlist creation
  window.currentTracks = tracks.map((t) => ({
    id: t.id,
    uri: t.uri,
    name: t.name,
    artist: t.artist,
    url: t.url,
  }));

  tracks.forEach((t) => {
    playlistGrid.innerHTML += `
      <div class="tile glass">
        <div class="meta">
          <div class="name">${t.name}</div>
          <div class="artist">${t.artist}</div>
          <a class="chip" href="${t.url || '#'}" target="_blank" rel="noreferrer">Play →</a>
        </div>
      </div>
    `;
  });
}


// ===============================
// MAIN SEARCH
// ===============================
searchBtn.onclick = async () => {
  if (!spotifyToken) return showToast("Login first!");
  const city = locationInput.value.trim();
  if (!city) return showToast("Enter a city");

  const weather = await getWeather(city);
  if (!weather || weather.error) return showToast("Weather not found");

  wLocation.innerText = city;
  wTemp.innerText = `${weather.temp}°C`;
  wMood.innerText = weather.condition;

  let mood = "chill";
  if (weather.temp > 32) mood = "energetic";
  if (weather.temp < 20) mood = "cozy";
  if (weather.condition.includes("Rain")) mood = "lofi";
  if (weather.condition.includes("Haze")) mood = "mellow";

  const songs = await getSongs(languageSelect.value, mood);

  if (!songs || !songs.tracks || songs.tracks.length === 0) return showToast("No tracks found");

  renderSongs(songs.tracks);
};


// ===============================
// CREATE PLAYLIST
// ===============================
createPlaylistBtn.onclick = async () => {
  if (!spotifyToken) return showToast("Login first!");
  if (!window.currentTracks || window.currentTracks.length === 0) return showToast("Search songs first!");

  const r = await createPlaylist(window.currentTracks);

  if (r && r.url) {
    window.open(r.url, "_blank");
    showToast("Playlist created!");
  } else {
    console.error("Create playlist failed", r);
    showToast("Playlist failed");
  }
};


// ===============================
// INIT
// ===============================
updateUI();
