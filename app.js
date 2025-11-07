let spotifyToken = localStorage.getItem("spotifyToken") || null;
let spotifyUser = JSON.parse(localStorage.getItem("spotifyUser") || "null");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userName = document.getElementById("userName");
const locationInput = document.getElementById("location");
const languageSelect = document.getElementById("language");
const searchBtn = document.getElementById("searchBtn");
const playlistDiv = document.getElementById("playlist");
const weatherBox = document.getElementById("weather");
const createBtn = document.getElementById("createBtn");
const historyBox = document.getElementById("history");

let lastTracks = [];
let history = JSON.parse(localStorage.getItem("history") || "[]");

function showHistory() {
  if (!history.length) return;
  historyBox.innerHTML = "Recent: " + history.slice(-5).join(", ");
}

showHistory();

function updateUI() {
  if (spotifyToken && spotifyUser) {
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    userName.innerText = `Logged in as: ${spotifyUser.display_name}`;
  } else {
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    userName.innerText = "";
  }
}
updateUI();

// Login
loginBtn.onclick = async () => {
  const res = await fetch("/api/login");
  const { authUrl } = await res.json();
  const popup = window.open(authUrl,"login","width=600,height=700");

  window.addEventListener("message",(e)=>{
    if(e.data?.type==="SPOTIFY_AUTH_SUCCESS"){
      spotifyToken=e.data.token;
      spotifyUser=e.data.user;
      localStorage.setItem("spotifyToken",spotifyToken);
      localStorage.setItem("spotifyUser",JSON.stringify(spotifyUser));
      popup.close(); updateUI();
    }
  });
};

// Logout
logoutBtn.onclick = () => {
  localStorage.clear();
  spotifyToken = null;
  spotifyUser = null;
  updateUI();
};

// APIs
async function getWeather(city){
  const r = await fetch("/api/get-weather",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({city})});
  return r.json();
}

async function getSongs(language,mood){
  const r = await fetch("/api/get-songs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:spotifyToken,language,mood})});
  return r.json();
}

async function createPlaylist(){
  const r = await fetch("/api/create-playlist",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:spotifyToken,tracks:lastTracks})});
  const d = await r.json();
  if(d.url) window.open(d.url,"_blank");
}

// Search
searchBtn.onclick = async () => {
  if(!spotifyToken) return alert("Login first");

  const city = locationInput.value.trim();
  if(!city) return alert("Enter city");

  history.push(city);
  localStorage.setItem("history",JSON.stringify(history));
  showHistory();

  playlistDiv.innerHTML="🎵 Loading songs…";
  weatherBox.innerHTML="⛅ Fetching weather…";
  createBtn.classList.add("hidden");

  const weather = await getWeather(city);
  weatherBox.innerHTML = `🌍 ${city}<br>🌡 ${weather.temp}°C<br>🌦 ${weather.condition}`;

  let mood="chill";
  if(weather.temp>30) mood="happy";
  if(weather.condition.includes("Rain")) mood="sad";

  const songs = await getSongs(languageSelect.value,mood);
  if(!songs.tracks?.length){
    playlistDiv.innerHTML = "😕 No songs found";
    return;
  }

  lastTracks = songs.tracks;
  createBtn.classList.remove("hidden");

  playlistDiv.innerHTML = songs.tracks.map(t => `
    <div class="song">${t.name} — <b>${t.artist}</b></div>
  `).join("");
};

// Playlist create click
createBtn.onclick = createPlaylist;
