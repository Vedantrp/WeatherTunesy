// ===== GLOBAL =====
let spotifyToken = localStorage.getItem("spotifyToken") || null;
let spotifyUser = JSON.parse(localStorage.getItem("spotifyUser") || "null");
let currentTracks = [];

// ===== ELEMENTS =====
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userName = document.getElementById("userName");
const locationInput = document.getElementById("location");
const languageSelect = document.getElementById("language");
const moodSelect = document.getElementById("mood");
const searchBtn = document.getElementById("searchBtn");
const playlistDiv = document.getElementById("playlist");
const weatherBox = document.getElementById("weather");
const createBtn = document.getElementById("createBtn");
const playlistResult = document.getElementById("playlistResult");

// ===== UI =====
function updateUI() {
  if (spotifyToken && spotifyUser) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "block";
    userName.innerText = `Logged in as: ${spotifyUser.display_name}`;
  } else {
    loginBtn.style.display = "block";
    logoutBtn.style.display = "none";
    userName.innerText = "";
    createBtn.style.display = "none";
  }
}
updateUI();

// ===== LOGIN =====
loginBtn.onclick = async () => {
  const res = await fetch("/api/login");
  const { authUrl } = await res.json();
  const popup = window.open(authUrl, "", "width=600,height=700");

  window.addEventListener("message", e => {
    if (e.data.type === "SPOTIFY_AUTH_SUCCESS") {
      spotifyToken = e.data.token;
      spotifyUser = e.data.user;
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
  spotifyUser = null;
  updateUI();
};

// ===== API FUNCS =====
async function getWeather(city) {
  return fetch("/api/get-weather", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ city })
  }).then(r=>r.json());
}

async function getSongs(language, mood) {
  return fetch("/api/get-songs", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ token: spotifyToken, language, mood })
  }).then(r=>r.json());
}

// ===== SEARCH =====
searchBtn.onclick = async () => {
  if (!spotifyToken) return alert("Login first ✅");

  const city = locationInput.value.trim();
  if (!city) return alert("Enter city");

  weatherBox.innerText = "Loading weather...";
  playlistDiv.innerHTML = "Loading songs...";

  const weather = await getWeather(city);
  weatherBox.innerHTML = `${city}<br>${weather.temp}°C — ${weather.condition}`;

  const mood = moodSelect.value;
  const songs = await getSongs(languageSelect.value, mood);

  if (!songs.tracks?.length) {
    playlistDiv.innerText = "No songs found 😔";
    return;
  }

  playlistDiv.innerHTML = "";
  currentTracks = songs.tracks.map(t => t.uri);

  songs.tracks.forEach(t => {
    playlistDiv.innerHTML += `
      <div class="song">
        <img src="${t.image}" />
        <div class="info">
          ${t.name}<br>
          <small>${t.artist}</small>
        </div>
        <a href="${t.url}" target="_blank">▶</a>
      </div>
    `;
  });

  createBtn.style.display = "block";
};

// ===== CREATE PLAYLIST =====
createBtn.onclick = async () => {
  const body = {
    token: spotifyToken,
    userId: spotifyUser.id,
    tracks: currentTracks.slice(0, 30),
    name: `${moodSelect.value} — ${locationInput.value} vibes`
  };

  const res = await fetch("/api/create-playlist", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(body)
  });

  const data = await res.json();
  playlistResult.innerHTML = `✅ <a href="${data.link}" target="_blank">Open Playlist</a>`;
};
