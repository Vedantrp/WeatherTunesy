// ====== GLOBAL STATE ======
let spotifyToken = localStorage.getItem("spotifyToken") || null;
let spotifyUser  = JSON.parse(localStorage.getItem("spotifyUser") || "null");
let lastTracks   = [];
let lastMood     = "chill";
let lastCity     = "";

// ====== DOM ======
const loginBtn   = document.getElementById("loginBtn");
const logoutBtn  = document.getElementById("logoutBtn");
const userName   = document.getElementById("userName");

const locationInput = document.getElementById("location");
const languageSelect= document.getElementById("language");
const searchBtn     = document.getElementById("searchBtn");

const wLocation = document.getElementById("wLocation");
const wTemp     = document.getElementById("wTemp");
const wMood     = document.getElementById("wMood");

const playlistGrid = document.getElementById("playlistGrid");
const createBtn    = document.getElementById("createBtn");
const playlistLink = document.getElementById("playlistLink");

const toastEl      = document.getElementById("toast");

// ====== UI HELPERS ======
function toast(msg){
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  setTimeout(()=> toastEl.classList.add("hidden"), 3000);
}

function updateAuthUI(){
  if(spotifyToken && spotifyUser){
    userName.textContent = `Hi, ${spotifyUser.display_name || "Listener"} 👋`;
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
  }else{
    userName.textContent = "";
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
  }
}

function setThemeFromWeather(condition){
  const c = (condition || "").toLowerCase();
  let theme = "theme-default";
  if (c.includes("clear") || c.includes("sun")) theme = "theme-sunny";
  else if (c.includes("rain") || c.includes("drizzle")) theme = "theme-rainy";
  else if (c.includes("snow")) theme = "theme-snowy";
  else if (c.includes("storm") || c.includes("thunder")) theme = "theme-stormy";
  else if (c.includes("fog") || c.includes("mist") || c.includes("haze")) theme = "theme-foggy";
  else if (c.includes("cloud")) theme = "theme-cloudy";

  document.body.className = theme;
}

function inferMood(temp, condition){
  // very simple, tweak as you like
  const c = (condition || "").toLowerCase();
  if (c.includes("storm") || c.includes("thunder")) return "intense";
  if (c.includes("rain") || c.includes("drizzle")) return "lofi";
  if (c.includes("snow")) return "peaceful";
  if (c.includes("fog") || c.includes("mist") || c.includes("haze")) return "gloomy";
  if (temp >= 32) return "summer";
  if (temp <= 12) return "cozy";
  return "chill";
}

function curationTitleFor(condition){
  const c = (condition || "").toLowerCase();
  if (c.includes("storm")) return "Stormy Weather Collection";
  if (c.includes("rain"))  return "Rainy Weather Collection";
  if (c.includes("snow"))  return "Snowy Weather Collection";
  if (c.includes("fog") || c.includes("haze") || c.includes("mist")) return "Foggy Weather Collection";
  if (c.includes("cloud")) return "Cloudy Weather Collection";
  return "Sunny Weather Collection";
}

// ====== LOGIN FLOW ======
loginBtn.onclick = async () => {
  try{
    const r = await fetch("/api/login");
    if(!r.ok) throw new Error("Login endpoint failed");
    const { authUrl } = await r.json();

    const popup = window.open(authUrl, "spotifyLogin", "width=520,height=680");
    if(!popup){ toast("Allow popups to login."); return; }

    const listener = (e)=>{
      if (e?.data?.type === "SPOTIFY_AUTH_SUCCESS"){
        spotifyToken = e.data.token;
        spotifyUser  = e.data.user;
        localStorage.setItem("spotifyToken", spotifyToken);
        localStorage.setItem("spotifyUser", JSON.stringify(spotifyUser));
        window.removeEventListener("message", listener);
        popup.close();
        updateAuthUI();
        toast("Logged in ✔");
        if(lastTracks.length) createBtn.classList.remove("hidden");
      }
    };
    window.addEventListener("message", listener);
  }catch(err){
    console.error(err); toast("Login failed");
  }
};

logoutBtn.onclick = () => {
  spotifyToken = null; spotifyUser = null; lastTracks = [];
  localStorage.removeItem("spotifyToken");
  localStorage.removeItem("spotifyUser");
  updateAuthUI();
  createBtn.classList.add("hidden");
  playlistLink.classList.add("hidden");
  toast("Logged out");
};

// ====== API HELPERS ======
async function postJSON(url, payload){
  const r = await fetch(url,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(payload || {})
  });
  const text = await r.text();
  let data;
  try{ data = JSON.parse(text); }catch{ throw new Error("Bad JSON " + text) }
  if(!r.ok) throw new Error(data?.error || "Request failed");
  return data;
}

// ====== FETCH WEATHER + SONGS ======
async function getWeather(city){
  return postJSON("/api/get-weather",{ city });
}
async function getSongs(language, mood){
  return postJSON("/api/get-songs",{
    token: spotifyToken,
    language, mood
  });
}

// ====== RENDER ======
function renderWeather({ temp, feels_like, condition }){
  wLocation.textContent = lastCity;
  wTemp.textContent     = `${Math.round(temp)}°C (feels ${Math.round(feels_like)}°C)`;
  wMood.textContent     = lastMoodLabel(lastMood);
  setThemeFromWeather(condition);
  document.getElementById("curationTitle").textContent = curationTitleFor(condition);
}

function lastMoodLabel(m){
  const map = {
    summer:"Upbeat & Energetic",
    cozy:"Cozy & Contemplative",
    lofi:"Rainy & Lo-Fi",
    peaceful:"Peaceful & Serene",
    intense:"Intense & Dramatic",
    gloomy:"Mysterious & Ethereal",
    chill:"Mellow & Reflective"
  };
  return map[m] || "Vibe Mix";
}

function renderTracks(tracks){
  playlistGrid.innerHTML = "";
  const max = Math.min(8, tracks.length);
  for (let i=0;i<max;i++){
    const t = tracks[i];
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.innerHTML = `
      <div class="cover" style="${t.image ? `background-image:url('${t.image}')` : ""}"></div>
      <div class="meta">
        <div class="name">${escapeHtml(t.name)}</div>
        <div class="artist">${escapeHtml(t.artist || "Unknown")}</div>
        <div class="chip">Track • ${i+1}</div>
      </div>
    `;
    tile.onclick = ()=> t.url && window.open(t.url,"_blank");
    playlistGrid.appendChild(tile);
  }

  // Enable create button if logged in + we have tracks
  if (spotifyToken && tracks.length){
    createBtn.classList.remove("hidden");
  }else{
    createBtn.classList.add("hidden");
  }
  playlistLink.classList.add("hidden");
}

function escapeHtml(s=""){
  return s.replace(/[&<>'"]/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;" }[m]));
}

// ====== SEARCH HANDLER ======
searchBtn.onclick = async () => {
  try{
    const city = locationInput.value.trim();
    if(!city){ toast("Enter a city"); return; }

    lastCity = city;
    playlistGrid.innerHTML = ""; createBtn.classList.add("hidden");
    playlistLink.classList.add("hidden");

    const weather = await getWeather(city);      // {temp, feels_like, condition, icon}
    const mood    = inferMood(Number(weather.temp), weather.condition);
    lastMood      = mood;

    renderWeather(weather);

    const { tracks = [] } = await getSongs(languageSelect.value, mood);
    if(!tracks.length){
      toast("No songs found for this combo. Try another city/language.");
      return;
    }
    lastTracks = tracks;
    renderTracks(tracks);
  }catch(err){
    console.error(err);
    toast(err.message || "Failed to fetch data");
  }
};

// ====== CREATE PLAYLIST ======
createBtn.onclick = async () => {
  if(!spotifyToken || !spotifyUser){ toast("Login to Spotify first"); return; }
  if(!lastTracks.length){ toast("No tracks to add"); return; }

  createBtn.disabled = true; createBtn.textContent = "Creating…";
  try{
    // Try backend first if you have /api/create-playlist, else fall back to direct Spotify calls
    let created;
    try{
      created = await postJSON("/api/create-playlist",{
        token: spotifyToken,
        name: `WeatherTunes – ${lastMoodLabel(lastMood)}`,
        uris: lastTracks.map(t=>t.uri).slice(0,50)
      });
    }catch(_){
      created = await createDirectSpotifyPlaylist();
    }

    if (created?.url){
      playlistLink.href = created.url;
      playlistLink.classList.remove("hidden");
      toast("Playlist created ✔");
    }else{
      toast("Playlist created, open Spotify to view.");
    }
  }catch(err){
    console.error(err); toast(err.message || "Create failed");
  }finally{
    createBtn.disabled = false; createBtn.textContent = "Create Playlist on Spotify";
  }
};

// Direct calls to Spotify Web API (fallback)
async function createDirectSpotifyPlaylist(){
  // 1) Create playlist
  const r1 = await fetch(`https://api.spotify.com/v1/users/${spotifyUser.id}/playlists`,{
    method:"POST",
    headers:{ Authorization:`Bearer ${spotifyToken}`, "Content-Type":"application/json" },
    body: JSON.stringify({
      name: `WeatherTunes – ${lastMoodLabel(lastMood)}`,
      description: "Auto-generated by WeatherTunes",
      public:false
    })
  });
  const p = await r1.json();
  if(!p.id) throw new Error("Failed to create playlist");

  // 2) Add tracks
  const uris = lastTracks.map(t=>t.uri).slice(0,50);
  if (uris.length){
    await fetch(`https://api.spotify.com/v1/playlists/${p.id}/tracks`,{
      method:"POST",
      headers:{ Authorization:`Bearer ${spotifyToken}`, "Content-Type":"application/json" },
      body: JSON.stringify({ uris })
    });
  }
  return { url: p.external_urls?.spotify };
}

// ====== INIT ======
updateAuthUI();
