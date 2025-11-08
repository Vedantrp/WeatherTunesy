// ================= STATE ==================
let spotifyToken = localStorage.getItem("spotifyToken");
let spotifyRefresh = localStorage.getItem("spotifyRefresh");
let spotifyUser = JSON.parse(localStorage.getItem("spotifyUser") || "null");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userName = document.getElementById("userName");
const locationInput = document.getElementById("location");
const languageSelect = document.getElementById("language");
const searchBtn = document.getElementById("searchBtn");
const playlistDiv = document.getElementById("playlist");
const weatherDiv = document.getElementById("weather");
const createBtn = document.getElementById("createBtn");

// ================= UI ======================
function updateUI() {
  if (spotifyToken && spotifyUser) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    userName.innerText = `Logged in: ${spotifyUser.display_name}`;
  } else {
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    userName.innerText = "";
  }
}

// ---------------- REFRESH TOKEN -----------
async function refreshSpotifyToken() {
  if (!spotifyRefresh) return false;
  const r = await fetch("/api/refresh-token", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ refreshToken: spotifyRefresh })
  });
  const data = await r.json();
  if (data.accessToken) {
    spotifyToken = data.accessToken;
    localStorage.setItem("spotifyToken", spotifyToken);
    return true;
  }
  return false;
}

// ---------------- LOGIN -------------------
loginBtn.onclick = async () => {
  const res = await fetch("/api/login");
  const { authUrl } = await res.json();
  const popup = window.open(authUrl,"spotifyLogin","width=600,height=700");

  window.addEventListener("message", (event) => {
    if (event.data.type === "SPOTIFY_AUTH_SUCCESS") {
      spotifyToken = event.data.token;
      spotifyRefresh = event.data.refreshToken;
      spotifyUser = event.data.user;

      localStorage.setItem("spotifyToken", spotifyToken);
      localStorage.setItem("spotifyRefresh", spotifyRefresh);
      localStorage.setItem("spotifyUser", JSON.stringify(spotifyUser));

      popup.close();
      updateUI();
    }
  });
};

// ---------------- LOGOUT -------------------
logoutBtn.onclick = () => {
  spotifyToken = null;
  spotifyRefresh = null;
  spotifyUser = null;
  localStorage.clear();
  updateUI();
};

// --------- WRAPPER FOR API CALL ----------
async function postJSON(url,data){
  let r = await fetch(url,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify(data)
  });

  let txt = await r.text();
  try { return JSON.parse(txt); }
  catch { throw new Error("Bad JSON "+txt); }
}

// ---------------- WEATHER ---------------
async function getWeather(city){
  return postJSON("/api/get-weather",{ city });
}

// ---------------- SONGS ------------------
async function getSongs(language,mood){
  async function call(){
    return postJSON("/api/get-songs",{ token: spotifyToken, language, mood });
  }

  let data = await call();
  if (data?.error === "Spotify token expired") {
    const ok = await refreshSpotifyToken();
    if (ok) data = await call();
  }
  return data;
}

// ---------------- CREATE PLAYLIST --------
async function createPlaylist(items){
  let data = await postJSON("/api/create-playlist",{
    token: spotifyToken,
    tracks: items
  });

  if (data?.error === "Spotify token expired") {
    const ok = await refreshSpotifyToken();
    if (ok) data = await postJSON("/api/create-playlist",{
      token: spotifyToken, tracks: items
    });
  }

  alert("✅ Playlist Created!");
  window.open(data.url,"_blank");
}

// ---------------- SEARCH CLICK -----------
searchBtn.onclick = async () => {
  if (!spotifyToken) return alert("Login first");

  const city = locationInput.value.trim();
  if (!city) return alert("Enter a city");

  playlistDiv.innerHTML = "⏳ Loading songs...";
  weatherDiv.innerHTML = "⏳ Weather...";
  createBtn.style.display="none";

  const weather = await getWeather(city);

  if (!weather.temp) {
    weatherDiv.innerHTML = "❌ No weather found";
    return;
  }

  weatherDiv.innerHTML =
  `${city}<br>🌡 ${weather.temp}°C<br>☁️ ${weather.condition}`;

  let mood = "chill";
  if (weather.temp > 30) mood="summer";
  if (weather.condition.includes("Rain")) mood="lofi";
  if (weather.condition.includes("Haze")) mood="sad";

  const result = await getSongs(languageSelect.value,mood);

  if (!result.tracks?.length){
    playlistDiv.innerHTML = "❌ No songs found";
    return;
  }

  playlistDiv.innerHTML = "";
  result.tracks.forEach(t=>{
    playlistDiv.innerHTML += `<div>${t.name} — <b>${t.artist}</b></div>`;
  });

  createBtn.style.display="block";
  createBtn.onclick = ()=> createPlaylist(result.tracks);
};

updateUI();
