let token = localStorage.getItem("spotifyToken");
let user = JSON.parse(localStorage.getItem("spotifyUser") || "null");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userName = document.getElementById("userName");
const locationInput = document.getElementById("location");
const langSelect = document.getElementById("language");
const searchBtn = document.getElementById("searchBtn");
const weatherBox = document.getElementById("weatherBox");
const playlistGrid = document.getElementById("playlistGrid");
const plTitle = document.getElementById("plTitle");
const createBtn = document.getElementById("createBtn");
const playlistLink = document.getElementById("playlistLink");

function ui() {
  const auth = document.getElementById("authArea");

  if (token && user) {
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");

    // ✅ Show username beautifully
    userName.classList.remove("hidden");
    userName.textContent = 👋 Hello, ${user.display_name};
  } else {
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");

    userName.classList.add("hidden");
    userName.textContent = "";
  }
}
ui();

// Login
loginBtn.onclick = async () => {
  const r = await fetch("/api/login");
  const { authUrl } = await r.json();
  const popup = window.open(authUrl, "", "width=600,height=700");

  window.addEventListener("message", (e) => {
    if (e.data.type === "SPOTIFY_AUTH_SUCCESS") {
      token = e.data.token;
      user = e.data.user;
      localStorage.setItem("spotifyToken", token);
      localStorage.setItem("spotifyUser", JSON.stringify(user));
      popup.close();
      ui();
    }
  });
};

// Logout
logoutBtn.onclick = () => {
  token = null;
  user = null;
  localStorage.clear();
  ui();
};

async function post(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(body)
  });
  return r.json();
}

// Get Weather + Songs
searchBtn.onclick = async () => {
  if (!token) return alert("Login first");

  const city = locationInput.value.trim();
  if (!city) return alert("Enter city");

  weatherBox.classList.remove("hidden");
  playlistGrid.innerHTML = "Loading...";
  plTitle.classList.remove("hidden");

  const w = await post("/api/get-weather",{city});
  weatherBox.innerHTML = ${city} • ${w.temp}°C • ${w.condition};

  // Mood AI logic
  let mood = "chill";
  if (w.temp>32) mood="summer";
  if (/Rain|Thunder/.test(w.condition)) mood="lofi";
  if (/Haze|Fog/.test(w.condition)) mood="gloom";

  const s = await post("/api/get-songs",{token,language:langSelect.value,mood});

  if (!s.tracks?.length){
    playlistGrid.innerHTML="No songs 😢 Try different language/city";
    createBtn.classList.add("hidden");
    return;
  }

  playlistGrid.innerHTML="";
  s.tracks.forEach(t=>{
    playlistGrid.innerHTML += `
      <div class="tile">
        <div class="cover" style="background-image:url('${t.image}')"></div>
        <div class="meta">
          <div class="name">${t.name}</div>
          <div class="artist">${t.artist}</div>
        </div>
      </div>`;
  });

  createBtn.classList.remove("hidden");

  createBtn.onclick = async () => {
    const r = await post("/api/create-playlist",{token,tracks:s.tracks});
    playlistLink.href = r.url;
    playlistLink.classList.remove("hidden");
  };
};

