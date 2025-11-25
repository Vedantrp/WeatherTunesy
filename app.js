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
// REFRESH TOKEN FLOW
// ===============================
async function refreshSpotifyToken() {
  if (!refreshToken) return null;

  try {
    const r = await postJSON("/api/refresh-token", {
      refresh_token: refreshToken,
    });

    if (r.access_token) {
      spotifyToken = r.access_token;
      localStorage.setItem("spotifyToken", spotifyToken);
      return spotifyToken;
    }
  } catch (err) {
    console.error("Refresh token error:", err);
  }
  return null;
}


// ===============================
// LOGIN FLOW
// ===============================
loginBtn.onclick = async () => {
  const res = await fetch("/api/login");
  const { authUrl } = await res.json();

  const popup = window.open(authUrl, "_blank", "width=600,height=700");

  window.addEventListener("message", (event) => {
    if (event.data.type === "SPOTIFY_AUTH_SUCCESS") {
      spotifyToken = event.data.token;
      spotifyUser = event.data.user;
      refreshToken = event.data.refresh_token; // STORE REFRESH TOKEN

      localStorage.setItem("spotifyToken", spotifyToken);
      localStorage.setItem("refreshToken", refreshToken);
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
  updateUI();
};


// ===============================
// AUTO-LOGIN ON PAGE LOAD
// ===============================
(async function autoLogin() {
  if (!refreshToken) return;

  const newToken = await refreshSpotifyToken();
  if (newToken) {
    console.log("Auto-login with refreshed token");
    updateUI();
  }
})();


// ===============================
// API CALLS
// ===============================
async function getWeather(city) {
  return postJSON("/api/get-weather", { city });
}

async function getSongs(language, mood) {
  const r = await postJSON("/api/get-songs", {
    token: spotifyToken,
    language,
    mood,
  });

  // If token expired → auto refresh → retry ONCE
  if (r.error === "Spotify token expired") {
    const newToken = await refreshSpotifyToken();
    if (newToken) {
      return postJSON("/api/get-songs", {
        token: newToken,
        language,
        mood,
      });
    }
  }

  return r;
}

async function createPlaylist(tracks) {
  return postJSON("/api/create-playlist", {
    token: spotifyToken,
    tracks,
  });
}


// ===============================
// RENDER SONGS (NO IMAGES)
// ===============================
function renderSongs(tracks) {
  playlistGrid.innerHTML = "";

  if (!tracks.length) {
    playlistGrid.innerHTML = `<div class="empty glass">No songs found</div>`;
    return;
  }

  window.currentTracks = tracks; // Store for playlist creation

  tracks.forEach((t) => {
    playlistGrid.innerHTML += `
      <div class="tile glass">
        <div class="meta">
          <div class="name">${t.name}</div>
          <div class="artist">${t.artist}</div>
          <a class="chip" href="${t.url}" target="_blank">Play →</a>
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

  if (!songs.tracks) return showToast("No tracks found");

  renderSongs(songs.tracks);
};


// ===============================
// CREATE PLAYLIST
// ===============================
createPlaylistBtn.onclick = async () => {
  if (!spotifyToken) return showToast("Login first!");
  if (!window.currentTracks) return showToast("Search songs first!");

  const r = await createPlaylist(window.currentTracks);

  if (r.url) {
    window.open(r.url, "_blank");
    showToast("Playlist created!");
  } else {
    showToast("Playlist failed");
  }
};


// ===============================
// INIT
// ===============================
updateUI();
