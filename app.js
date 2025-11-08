let token = localStorage.getItem("spotifyToken");
let user = JSON.parse(localStorage.getItem("spotifyUser") || "null");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userName = document.getElementById("userName");
const searchBtn = document.getElementById("searchBtn");
const playlistGrid = document.getElementById("playlistGrid");
const createBtn = document.getElementById("createBtn");
const playlistLink = document.getElementById("playlistLink");

function ui() {
  if (token && user) {
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    userName.classList.remove("hidden");
    userName.textContent = `👋 Hi, ${user.display_name}`;
  } else {
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    userName.classList.add("hidden");
  }
}
ui();

loginBtn.onclick = async () => {
  const r = await fetch("/api/login");
  const { authUrl } = await r.json();
  const popup = window.open(authUrl, "spotify", "width=500,height=600");

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

logoutBtn.onclick = () => {
  localStorage.clear();
  token = null;
  user = null;
  ui();
};

async function post(url, body) {
  const r = await fetch(url,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(body)
  });
  return r.json();
}

async function loadPlaylist() {
  const city = document.getElementById("location").value.trim();
  const lang = document.getElementById("language").value;

  if (!token) return alert("Login first!");
  if (!city) return alert("Enter city");

  playlistGrid.innerHTML = "⏳ Loading...";
  
  const weather = await post("/api/get-weather",{city});
  document.getElementById("wLocation").textContent = city;
  document.getElementById("wTemp").textContent = `${weather.temp}°C`;
  document.getElementById("wMood").textContent = weather.condition;

  const res = await post("/api/get-songs",{token,language:lang,mood:weather.condition});

  if (!res.tracks?.length) {
    playlistGrid.innerHTML = "No tracks found 😔";
    return;
  }

  playlistGrid.innerHTML = res.tracks.map(t=>`
    <div class="tile">
      <div class="cover" style="background-image:url('${t.image}')"></div>
      <div class="meta">
        <p class="name">${t.name}</p>
        <p class="artist">${t.artist}</p>
      </div>
    </div>
  `).join("");

  createBtn.classList.remove("hidden");
  createBtn.onclick = async () => {
    const c = await post("/api/create-playlist",{token,tracks:res.tracks});
    playlistLink.href = c.link;
    playlistLink.classList.remove("hidden");
  };
}

searchBtn.onclick = loadPlaylist;
