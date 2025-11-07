// ===== Global state
let spotifyToken = localStorage.getItem("spotifyToken") || null;
let spotifyUser = JSON.parse(localStorage.getItem("spotifyUser") || "null");
let currentUris = []; // track URIs for playlist creation

// ===== Elements
const loginBtn   = document.getElementById("loginBtn");
const logoutBtn  = document.getElementById("logoutBtn");
const profile    = document.getElementById("profile");
const avatar     = document.getElementById("avatar");
const userNameEl = document.getElementById("userName");
const userEmail  = document.getElementById("userEmail");

const locationInput = document.getElementById("location");
const languageSel   = document.getElementById("language");
const moodSel       = document.getElementById("mood");
const searchBtn     = document.getElementById("searchBtn");

const weatherBox    = document.getElementById("weather");
const playlistBox   = document.getElementById("playlist");
const createBtn     = document.getElementById("createBtn");
const createResult  = document.getElementById("createResult");

const historyList   = document.getElementById("history");
const clearLibBtn   = document.getElementById("clearLibBtn");

// ===== Local library (saved playlists)
let library = JSON.parse(localStorage.getItem("wt_library") || "[]"); // [{id,name,link,city,language,mood,count,date}]

// ===== UI helpers
function setHidden(el, hidden){
  el.classList[hidden ? "add" : "remove"]("hidden");
}

function updateAuthUI(){
  const isIn = !!(spotifyToken && spotifyUser);
  setHidden(loginBtn, isIn);
  setHidden(logoutBtn, !isIn);
  setHidden(profile, !isIn);

  if(isIn){
    userNameEl.textContent = spotifyUser.display_name || spotifyUser.id || "Spotify User";
    userEmail.textContent  = spotifyUser.email || "";
    const url = (spotifyUser.images && spotifyUser.images[0] && spotifyUser.images[0].url) || "";
    if (url){
      avatar.style.backgroundImage = `url(${url})`;
      avatar.style.backgroundSize = "cover";
      avatar.style.backgroundPosition = "center";
    } else {
      avatar.style.background = "#1a1c24";
    }
  }else{
    userNameEl.textContent = "";
    userEmail.textContent = "";
    avatar.style.background = "#1a1c24";
    avatar.style.backgroundImage = "";
  }
}

// ===== Render library
function renderLibrary(){
  if(!library.length){
    historyList.innerHTML = `<div class="meta">No playlists saved yet.</div>`;
    return;
  }
  historyList.innerHTML = library.map(item => `
    <div class="item">
      <div><b>${item.name}</b></div>
      <div class="meta">
        ${item.city} • ${item.language} • ${item.mood} • ${item.count} tracks • ${item.date}
      </div>
      <div class="actions">
        <a class="btn blue" href="${item.link}" target="_blank" rel="noopener">Open</a>
        <button data-id="${item.id}" class="btn ghost js-remove">Remove</button>
      </div>
    </div>
  `).join("");

  // bind remove buttons
  [...document.querySelectorAll(".js-remove")].forEach(btn=>{
    btn.onclick = () => {
      const id = btn.getAttribute("data-id");
      library = library.filter(x => x.id !== id);
      localStorage.setItem("wt_library", JSON.stringify(library));
      renderLibrary();
    };
  });
}

updateAuthUI();
renderLibrary();

// ===== Auth flow
loginBtn.onclick = async () => {
  const r = await fetch("/api/login");
  const { authUrl } = await r.json();
  const popup = window.open(authUrl, "spotifyLogin", "width=600,height=700");

  window.addEventListener("message", e => {
    if(e.data?.type === "SPOTIFY_AUTH_SUCCESS"){
      spotifyToken = e.data.token;
      spotifyUser  = e.data.user;
      localStorage.setItem("spotifyToken", spotifyToken);
      localStorage.setItem("spotifyUser", JSON.stringify(spotifyUser));
      popup.close();
      updateAuthUI();
    }
  });
};

logoutBtn.onclick = () => {
  localStorage.removeItem("spotifyToken");
  localStorage.removeItem("spotifyUser");
  spotifyToken = null; spotifyUser = null;
  updateAuthUI();
};

// ===== API wrappers
async function postJSON(url, body){
  const r = await fetch(url,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(body||{})
  });
  // On 401, show clean message
  if(r.status === 401){
    const e = await r.json().catch(()=>({error:"Unauthorized"}));
    throw new Error(e.error || "Unauthorized");
  }
  return r.json();
}

const getWeather = (city) => postJSON("/api/get-weather",{city});
const getSongs   = (language,mood) => postJSON("/api/get-songs",{token:spotifyToken,language,mood});
const createPl   = (name,uris) => postJSON("/api/create-playlist",{token:spotifyToken,tracks:uris,name});

// ===== Search
searchBtn.onclick = async () => {
  if(!spotifyToken) return alert("Login with Spotify first");
  const city = (locationInput.value || "").trim();
  if(!city) return alert("Enter a city");

  createResult.textContent = "";
  playlistBox.innerHTML = `<div class="meta">Loading songs…</div>`;
  weatherBox.innerHTML  = `<div class="meta">Fetching weather…</div>`;
  setHidden(createBtn, true);

  try{
    const weather = await getWeather(city);
    weatherBox.innerHTML = `🌍 <b>${city}</b><br>🌡 ${weather.temp}°C (feels ${weather.feels_like}°C)<br>🌦 ${weather.condition}`;

    // very simple mood helper (still respects user's mood dropdown)
    let mood = moodSel.value;
    if(mood === "chill" && weather.temp > 30) mood = "happy";
    if(weather.condition && /rain|shower/i.test(weather.condition)) mood = "sad";

    const language = languageSel.value;
    const songs = await getSongs(language,mood);

    if(!songs.tracks || !songs.tracks.length){
      playlistBox.innerHTML = `<div class="meta">No songs found. Try another mood/language.</div>`;
      return;
    }

    // show plain text list (no images)
    playlistBox.innerHTML = songs.tracks.map((t,i)=>(
      `<div class="item">${i+1}. ${t.name} — <b>${t.artist}</b></div>`
    )).join("");

    currentUris = songs.tracks.map(t=>t.uri);
    setHidden(createBtn, currentUris.length === 0);

    // retain last context for library save
    createBtn.dataset.city     = city;
    createBtn.dataset.language = language;
    createBtn.dataset.mood     = mood;

  }catch(e){
    playlistBox.innerHTML = `<div class="meta">Error: ${e.message}</div>`;
  }
};

// ===== Create playlist & save to library
createBtn.onclick = async () => {
  if(!spotifyToken || !spotifyUser) return alert("Login first");
  if(!currentUris.length) return alert("No songs to add");

  const city = createBtn.dataset.city || "Your city";
  const language = createBtn.dataset.language || "english";
  const mood = createBtn.dataset.mood || "chill";
  const name = `${mood} · ${city} vibes`;

  createResult.textContent = "Creating playlist…";

  try{
    const out = await createPl(name, currentUris.slice(0, 35));
    if(!out || !out.url){
      createResult.textContent = "Failed to create playlist.";
      return;
    }
    createResult.innerHTML = `✅ Playlist ready — <a href="${out.url}" target="_blank" rel="noopener">Open</a>`;

    // save to library (local)
    const entry = {
      id: String(Date.now()),
      name,
      link: out.url,
      city, language, mood,
      count: Math.min(currentUris.length, 35),
      date: new Date().toLocaleString()
    };
    library.unshift(entry);
    library = library.slice(0, 50); // keep latest 50
    localStorage.setItem("wt_library", JSON.stringify(library));
    renderLibrary();

  }catch(e){
    createResult.textContent = `Error: ${e.message}`;
  }
};

// ===== Clear library
clearLibBtn.onclick = () => {
  if(!library.length) return;
  if(confirm("Clear your saved playlists?")){
    library = [];
    localStorage.setItem("wt_library","[]");
    renderLibrary();
  }
};
