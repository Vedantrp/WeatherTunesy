console.log("WeatherTunes loaded ✅");

const API_BASE = "/api";

let token = null;
let user = null;

// DOM
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userInfo = document.getElementById("userInfo");
const userName = document.getElementById("userName");
const searchBtn = document.getElementById("searchBtn");
const createPlaylistBtn = document.getElementById("createPlaylistBtn");
const errorBox = document.getElementById("error");
const cityEl = document.getElementById("city");
const tempEl = document.getElementById("temp");
const conditionEl = document.getElementById("condition");
const weatherBox = document.getElementById("weatherBox");
const playlistCard = document.getElementById("playlistCard");
const songList = document.getElementById("songList");
const playlistLink = document.getElementById("playlistLink");

function showError(msg){
  errorBox.textContent = msg;
  errorBox.classList.remove("hidden");
  setTimeout(()=> errorBox.classList.add("hidden"),3000);
}

function updateUI(){
  if(token){
    loginBtn.classList.add("hidden");
    userInfo.classList.remove("hidden");
    userName.textContent = user?.display_name || "User";
  } else {
    loginBtn.classList.remove("hidden");
    userInfo.classList.add("hidden");
  }
}

async function loginSpotify(){
  const popup = window.open(`${API_BASE}/login`,"spotify","width=500,height=600");
  window.addEventListener("message",(e)=>{
    if(e.data.token){
      token = e.data.token;
      user = e.data.user;
      localStorage.setItem("spotifyToken",token);
      localStorage.setItem("spotifyUser",JSON.stringify(user));
      updateUI();
      popup.close();
    }
  });
}

async function getWeather(city){
  const r = await fetch(`${API_BASE}/weather?city=${city}`);
  return r.json();
}

async function getSongs(language){
  const r = await fetch(`${API_BASE}/generate-playlist`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ language, token })
  });
  return r.json();
}

async function handleSearch(){
  const city = document.getElementById("locationInput").value;
  const language = document.getElementById("languageSelect").value;

  const w = await getWeather(city);
  cityEl.textContent = w.city;
  tempEl.textContent = w.temp + "°C";
  conditionEl.textContent = w.condition;
  weatherBox.classList.remove("hidden");

  const result = await getSongs(language);
  songList.innerHTML = "";
  result.tracks.forEach(t=>{
    const li = document.createElement("li");
    li.textContent = `${t.name} · ${t.artist}`;
    songList.appendChild(li);
  });

  window._tracks = result.tracks;
  playlistCard.classList.remove("hidden");
}

async function createPlaylist(){
  const r = await fetch(`${API_BASE}/generate-playlist`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ token, save:true, tracks: window._tracks })
  });
  const d = await r.json();
  playlistLink.textContent = "Open playlist";
  playlistLink.href = d.url;
}

loginBtn.onclick = loginSpotify;
logoutBtn.onclick = ()=>{ token=null; localStorage.clear(); updateUI(); };
searchBtn.onclick = handleSearch;
createPlaylistBtn.onclick = createPlaylist;

(function restore(){
  token = localStorage.getItem("spotifyToken");
  user = JSON.parse(localStorage.getItem("spotifyUser")||"null");
  updateUI();
})();
