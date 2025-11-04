console.log("WeatherTunes app loaded ✅");

// ========= CONFIG =========
const API_BASE = "https://weather-tunes-kappa.vercel.app/api"; // change ONLY if your domain changes

let accessToken = localStorage.getItem("spotifyAccessToken");
let refreshToken = localStorage.getItem("spotifyRefreshToken");
let user = JSON.parse(localStorage.getItem("spotifyUser") || "null");

// ========= DOM =========
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userBox = document.getElementById("userBox");
const userName = document.getElementById("userName");

const cityInput = document.getElementById("city");
const langSelect = document.getElementById("language");
const goBtn = document.getElementById("goBtn");

const weatherBox = document.getElementById("weather");
const wText = document.getElementById("wText");
const wTemp = document.getElementById("wTemp");
const moodSpan = document.getElementById("mood");
const langSpan = document.getElementById("lang");

const tracksCard = document.getElementById("tracksCard");
const tracksList = document.getElementById("tracks");
const createBtn = document.getElementById("createBtn");

const loading = document.getElementById("loading");
const errorBox = document.getElementById("error");
const notice = document.getElementById("notice");

const createdBox = document.getElementById("createdBox");
const playlistLink = document.getElementById("playlistLink");

// ========= UI helpers =========
function showError(msg) {
  errorBox.innerText = msg;
  errorBox.classList.remove("hidden");
  setTimeout(() => errorBox.classList.add("hidden"), 4000);
}

function showLoad(b) { b ? loading.classList.remove("hidden") : loading.classList.add("hidden"); }

function updateUI() {
  if (accessToken) {
    loginBtn.classList.add("hidden");
    userBox.classList.remove("hidden");
    userName.innerText = user?.display_name || user?.id;
  } else {
    loginBtn.classList.remove("hidden");
    userBox.classList.add("hidden");
  }
}
updateUI();

// ========= Spotify Login =========
loginBtn.onclick = async () => {
  const res = await fetch(`${API_BASE}/login`);
  const data = await res.json();
  const popup = window.open(data.authUrl, "_blank", "width=500,height=650");

  window.addEventListener("message", (e) => {
    if (e.data.type === "SPOTIFY_AUTH_SUCCESS") {
      accessToken = e.data.token;
      refreshToken = e.data.refreshToken;
      user = e.data.user;

      localStorage.setItem("spotifyAccessToken", accessToken);
      localStorage.setItem("spotifyRefreshToken", refreshToken);
      localStorage.setItem("spotifyUser", JSON.stringify(user));

      popup.close();
      updateUI();
    }
  });
};

logoutBtn.onclick = () => {
  localStorage.clear();
  accessToken = null;
  refreshToken = null;
  location.reload();
};

// ========= Weather to Mood =========
function moodFromWeather(desc) {
  desc = desc.toLowerCase();
  if (desc.includes("rain") || desc.includes("drizzle")) return "cozy";
  if (desc.includes("sun") || desc.includes("clear")) return "upbeat";
  if (desc.includes("cloud")) return "relaxed";
  if (desc.includes("snow")) return "calm";
  return "balanced";
}

// ========= Search Tracks =========
async function getTracks(mood, language) {
  if (!accessToken) throw new Error("Login first");
  const res = await fetch(`${API_BASE}/get-tracks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mood, language, token: accessToken })
  });
  return res.json();
}

// ========= Create Spotify Playlist =========
async function createPlaylist(tracks) {
  createBtn.innerText = "Creating...";
  createBtn.disabled = true;

  const res = await fetch(`https://api.spotify.com/v1/users/${user.id}/playlists`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "WeatherTunes Mix",
      description: "Auto-generated weather mix",
      public: false
    })
  });

  const playlist = await res.json();
  if (!playlist.id) throw new Error("Playlist create failed");

  const uris = tracks.map(t => t.uri);
  await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ uris })
  });

  playlistLink.href = playlist.external_urls.spotify;
  createdBox.classList.remove("hidden");
  createBtn.innerText = "Done ✅";
}

// ========= Weather + Track flow =========
goBtn.onclick = async () => {
  let city = cityInput.value.trim();
  let language = langSelect.value;

  if (!city) return showError("Enter city");

  showLoad(true);
  createdBox.classList.add("hidden");
  tracksCard.classList.add("hidden");

  try {
    const res = await fetch(`${API_BASE}/weather?city=${city}`);
    const weather = await res.json();

    const mood = moodFromWeather(weather.condition);

    wText.innerText = weather.condition;
    wTemp.innerText = weather.temp;
    moodSpan.innerText = mood;
    langSpan.innerText = language;
    weatherBox.classList.remove("hidden");

    const data = await getTracks(mood, language);
    if (!data.tracks.length) {
      tracksList.innerHTML = "<li>No songs found</li>";
      tracksCard.classList.remove("hidden");
      return;
    }

    tracksList.innerHTML = "";
    data.tracks.forEach(t => {
      const li = document.createElement("li");
      li.innerText = `${t.name} — ${t.artist}`;
      tracksList.appendChild(li);
    });

    tracksCard.classList.remove("hidden");
    createBtn.disabled = false;
    createBtn.innerText = "Create Playlist";

    createBtn.onclick = () => createPlaylist(data.tracks);
  } catch (err) {
    showError(err.message);
  }

  showLoad(false);
};
