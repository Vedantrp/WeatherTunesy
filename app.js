let spotifyToken = localStorage.getItem("spotifyToken") || null;
let spotifyUser = JSON.parse(localStorage.getItem("spotifyUser") || "null");
let currentTracks = [];
let history = JSON.parse(localStorage.getItem("playlistHistory") || "[]");

// DOM
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
const historyList = document.getElementById("historyList");

// UI
function updateUI() {
  if (spotifyToken && spotifyUser) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "block";
    userName.textContent = `Hey, ${spotifyUser.display_name} 👋`;
  } else {
    loginBtn.style.display = "block";
    logoutBtn.style.display = "none";
    userName.textContent = "";
    createBtn.style.display = "none";
  }
}
updateUI();

// Show History
function showHistory() {
  historyList.innerHTML = "";
  if (!history.length) {
    historyList.innerHTML = "<i>No playlists yet.</i>";
    return;
  }

  history.forEach(h => {
    historyList.innerHTML += `
      <div class="song fade">
        <div class="info">
          <b>${h.name}</b><br>
          <small>${h.date}</small>
        </div>
        <a href="${h.link}" target="_blank">Open ▶</a>
      </div>
    `;
  });
}
showHistory();

// Login
loginBtn.onclick = async () => {
  const r = await fetch("/api/login");
  const { authUrl } = await r.json();
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
  location.reload();
};

// API helpers
const jsonPost = (url, data) =>
  fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) })
  .then(r => r.json());

// Search
searchBtn.onclick = async () => {
  if (!spotifyToken) return alert("Login first ✔️");

  const city = locationInput.value.trim();
  if (!city) return alert("Enter city");

  playlistDiv.innerHTML = "Finding vibe...";
  weatherBox.innerHTML = "Checking weather...";

  const weather = await jsonPost("/api/get-weather", { city });
  weatherBox.innerHTML = `${city}<br>${weather.temp}°C — ${weather.condition}`;

  const songs = await jsonPost("/api/get-songs", {
    token: spotifyToken,
    language: languageSelect.value,
    mood: moodSelect.value
  });

  if (!songs.tracks?.length) {
    playlistDiv.innerHTML = "No songs found 😔 Try different mood.";
    return;
  }

  currentTracks = songs.tracks.map(t => t.uri);

  playlistDiv.innerHTML = "";
  songs.tracks.forEach(t => {
    playlistDiv.innerHTML += `
    <div class="song fade">
      <img src="${t.image}">
      <div class="info">${t.name}<br><small>${t.artist}</small></div>
      <a href="${t.url}" target="_blank">▶</a>
    </div>`;
  });

  createBtn.style.display = "block";
};

// Create Playlist
createBtn.onclick = async () => {
  const name = `${moodSelect.value} · ${locationInput.value} vibes`;
  const data = await jsonPost("/api/create-playlist", {
    token: spotifyToken,
    userId: spotifyUser.id,
    tracks: currentTracks.slice(0, 30),
    name
  });

  playlistResult.innerHTML = `✅ Playlist ready → <a href="${data.link}" target="_blank">Open</a>`;

  history.unshift({
    name,
    link: data.link,
    date: new Date().toLocaleString()
  });

  localStorage.setItem("playlistHistory", JSON.stringify(history));
  showHistory();
};
