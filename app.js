let token = localStorage.getItem("spotifyToken");
let user = JSON.parse(localStorage.getItem("spotifyUser") || "null");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const searchBtn = document.getElementById("searchBtn");
const createBtn = document.getElementById("createPlaylistBtn");
const playlistDiv = document.getElementById("playlist");
const playlistLink = document.getElementById("playlistLink");
const weatherBox = document.getElementById("weather");

function updateUI() {
  if (token && user) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "block";
    document.getElementById("userName").innerText = `Logged in as: ${user.display_name}`;
  } else {
    loginBtn.style.display = "block";
    logoutBtn.style.display = "none";
  }
}

loginBtn.onclick = async () => {
  const r = await fetch("/api/login");
  const { authUrl } = await r.json();
  const popup = window.open(authUrl, "", "width=600,height=700");

  window.addEventListener("message", (ev) => {
    if (ev.data.type === "SPOTIFY_AUTH_SUCCESS") {
      token = ev.data.token;
      user = ev.data.user;
      localStorage.setItem("spotifyToken", token);
      localStorage.setItem("spotifyUser", JSON.stringify(user));
      popup.close();
      updateUI();
    }
  });
};

logoutBtn.onclick = () => {
  localStorage.clear();
  token = null;
  user = null;
  updateUI();
};

async function fetchJSON(url, body={}) {
  return fetch(url, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(body)
  }).then(r => r.json());
}

searchBtn.onclick = async () => {
  const city = document.getElementById("location").value;
  const language = document.getElementById("language").value;
  const mood = document.getElementById("mood").value;

  if (!city) return alert("Enter city");

  playlistDiv.innerHTML = "⏳";
  weatherBox.innerHTML = "⏳";

  const weather = await fetchJSON("/api/get-weather", { city });
  weatherBox.innerHTML = `🌍 ${city}<br>🌡 ${weather.temp}°C<br>${weather.condition}`;

  const songs = await fetchJSON("/api/get-songs", { token, language, mood });

  if (!songs.tracks?.length) {
    playlistDiv.innerHTML = "No songs found 😐";
    createBtn.style.display = "none";
    return;
  }

  playlistDiv.innerHTML = "";
  songs.tracks.forEach(t => {
    playlistDiv.innerHTML += `
      <div class="bg-gray-700 p-2 rounded text-sm">
        <img src="${t.image}" class="rounded mb-1">
        ${t.name}<br>
        <span class="text-xs text-gray-300">${t.artist}</span>
      </div>`;
  });

  createBtn.style.display = "block";
  createBtn.dataset.uris = JSON.stringify(songs.tracks.map(t => t.uri));
};

createBtn.onclick = async () => {
  const uris = JSON.parse(createBtn.dataset.uris);

  const r = await fetchJSON("/api/create-playlist", {
    token,
    userId: user.id,
    tracks: uris
  });

  playlistLink.innerHTML = `<a href="${r.url}" class="text-green-400 underline" target="_blank">🎧 Open Playlist</a>`;
};

updateUI();
