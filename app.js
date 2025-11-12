// ============== GLOBALS ==============
let token = localStorage.getItem("spotifyToken");
let user = JSON.parse(localStorage.getItem("spotifyUser") || "null");

const qs = id => document.getElementById(id);
const loginBtn = qs("loginBtn");
const logoutBtn = qs("logoutBtn");
const userName = qs("userName");
const playlistGrid = qs("playlistGrid");
const createBtn = qs("createBtn");
const playlistLink = qs("playlistLink");

// ============== TOAST ==============
function toast(msg){
  const t = qs("toast");
  t.innerText = msg;
  t.classList.remove("hidden");
  setTimeout(()=>t.classList.add("hidden"),2500);
}

// ============== UI UPDATE ==============
function updateUI(){
  if(token && user){
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    userName.textContent = user.display_name;
  } else {
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    userName.textContent = "";
  }
}
updateUI();

// ============== LOGIN ==============
loginBtn.onclick = async () => {
  const res = await fetch("/api/login");
  const { authUrl } = await res.json();
  const popup = window.open(authUrl,"spotify","width=500,height=600");

  window.addEventListener("message", e => {
    if(e.data.type === "SPOTIFY_AUTH_SUCCESS"){
      token = e.data.token;
      user = e.data.user;
      localStorage.setItem("spotifyToken", token);
      localStorage.setItem("spotifyUser", JSON.stringify(user));
      popup.close();
      updateUI();
      toast("✅ Logged in");
    }
  });
};

// ============== LOGOUT ==============
logoutBtn.onclick = () => {
  localStorage.clear();
  token=null; user=null;
  updateUI();
};

// ============== POST HELPER ==============
async function post(url,data){
  const r = await fetch(url,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(data)
  });
  return r.json();
}

// ============== WEATHER FETCH + MOOD LOGIC ==============
function detectMood(temp,condition){
  if(condition.includes("Rain")) return "lofi";
  if(temp < 18) return "sad";
  if(temp > 30) return "summer";
  return "chill";
}

// ============== SEARCH ==============
qs("searchBtn").onclick = async () => {
  if(!token) return toast("Login first");

  const city = qs("location").value.trim();
  if(!city) return toast("Enter city");

  const weather = await post("/api/get-weather",{ city });
  if(weather.error) return toast(weather.error);

  qs("wLocation").textContent = weather.location;
  qs("wTemp").textContent = weather.temp+"°C";
  const mood = detectMood(weather.temp, weather.condition);
  qs("wMood").textContent = mood;

  const lang = qs("language").value;

  const songs = await post("/api/get-songs",{ token, mood, language:lang });
  if(!songs.tracks?.length) return toast("No songs found. Try English");

  playlistGrid.innerHTML = songs.tracks.map(t=>`
    <div class="tile glass">
      <div class="meta">
        <p class="name">${t.name}</p>
        <p class="artist">${t.artist}</p>
      </div>
    </div>`
  ).join("");

  createBtn.classList.remove("hidden");
  createBtn.onclick = async () => {
    const r = await post("/api/create-playlist",{ token, tracks:songs.tracks });
    if(r.url){
      playlistLink.href = r.url;
      playlistLink.classList.remove("hidden");
      toast("✅ Playlist created");
    }
  };
};
