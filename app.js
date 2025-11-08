/* ======== GLOBAL STATE ======== */
let spotifyToken = localStorage.getItem("spotifyToken") || null;
let spotifyUser = JSON.parse(localStorage.getItem("spotifyUser") || "null");

/* ======== DOM ======== */
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userName = document.getElementById("userName");
const locationInput = document.getElementById("location");
const languageSelect = document.getElementById("language");
const searchBtn = document.getElementById("searchBtn");

const wLocation = document.getElementById("wLocation");
const wTemp = document.getElementById("wTemp");
const wMood = document.getElementById("wMood");

const playlistGrid = document.getElementById("playlistGrid");
const createBtn = document.getElementById("createBtn");
const playlistLink = document.getElementById("playlistLink");
const toast = document.getElementById("toast");

/* ======== HELPERS ======== */
function showToast(msg) {
  toast.innerText = msg;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2500);
}

function applyTheme(condition) {
  const c = condition.toLowerCase();
  document.body.className = ""; // reset theme

  if (c.includes("rain")) document.body.classList.add("theme-rainy");
  else if (c.includes("cloud")) document.body.classList.add("theme-cloudy");
  else if (c.includes("sun") || c.includes("clear")) document.body.classList.add("theme-sunny");
  else if (c.includes("snow")) document.body.classList.add("theme-snowy");
  else if (c.includes("storm") || c.includes("thunder")) document.body.classList.add("theme-stormy");
  else if (c.includes("fog") || c.includes("haze") || c.includes("mist")) document.body.classList.add("theme-foggy");
  else document.body.classList.add("theme-default");
}

function updateUI() {
  if (spotifyToken && spotifyUser) {
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    userName.innerText = spotifyUser.display_name;
  } else {
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    userName.innerText = "";
  }
}

/* ======== POPUP LOGIN ✅ ======== */
loginBtn.onclick = async () => {
  const res = await fetch("/api/login");
  const { authUrl } = await res.json();

  const popup = window.open(authUrl, "spotify", "width=600,height=700");

  window.addEventListener("message", (e) => {
    if (e.data.type === "SPOTIFY_AUTH_SUCCESS") {
      spotifyToken = e.data.token;
      spotifyUser = e.data.user;
      localStorage.setItem("spotifyToken", spotifyToken);
      localStorage.setItem("spotifyUser", JSON.stringify(spotifyUser));
      popup.close();
      updateUI();
      showToast("✅ Logged in");
    }
  });
};

logoutBtn.onclick = () => {
  spotifyToken = null;
  spotifyUser = null;
  localStorage.clear();
  updateUI();
  showToast("✅ Logged out");
};

/* ======== API WRAPPER ======== */
async function postJSON(url, data) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

/* ======== SEARCH CLICK ======== */
searchBtn.onclick = async () => {
  const city = locationInput.value.trim();
  const language = languageSelect.value;

  if (!spotifyToken) return showToast("⚠️ Login first");
  if (!city) return showToast("Enter city");

  playlistGrid.innerHTML = "⏳ Loading...";

  try {
    /* 🌦 1. Weather */
    const weather = await postJSON("/api/get-weather", { city });
    wLocation.innerText = city;
    wTemp.innerText = weather.temp + "°C";
    applyTheme(weather.condition);

    /* 🤖 2. AI Mood */
    const moodRes = await postJSON("/api/get-mood", {
      weather: weather.condition,
      city
    });

    const aiMood = moodRes.mood;
    const aiLang = moodRes.language || language;

    wMood.innerText = aiMood;

    /* 🎵 3. Get Songs */
    const tracks = await postJSON("/api/get-songs", {
      token: spotifyToken,
      language: aiLang,
      mood: aiMood
    });

    if (!tracks.tracks?.length) {
      playlistGrid.innerHTML = "No songs found 😐";
      return;
    }

    /* 🎨 UI Playlist */
    playlistGrid.innerHTML = tracks.tracks
      .map(
        (t) => `
        <div class="tile">
          <div class="cover" style="background-image:url('${t.image || ""}')"></div>
          <div class="meta">
            <p class="name">${t.name}</p>
            <p class="artist">${t.artist}</p>
            <div class="chip">${aiMood}</div>
          </div>
        </div>
    `
      )
      .join("");

    /* 🎧 Save for playlist creation */
    window.currentTracks = tracks.tracks;

    createBtn.classList.remove("hidden");
    playlistLink.classList.add("hidden");

    showToast("✅ Playlist Ready!");

  } catch (err) {
    console.error(err);
    showToast("❌ Error loading");
  }
};

/* ======== CREATE PLAYLIST ======== */
createBtn.onclick = async () => {
  try {
    const result = await postJSON("/api/create-playlist", {
      token: spotifyToken,
      tracks: window.currentTracks
    });

    createBtn.classList.add("hidden");

    playlistLink.href = result.url;
    playlistLink.classList.remove("hidden");

    showToast("✅ Playlist Created!");
  } catch (e) {
    showToast("❌ Playlist failed");
  }
};

/* ======== INIT ======== */
updateUI();
