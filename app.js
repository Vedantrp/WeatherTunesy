let spotifyToken = localStorage.getItem("spotifyToken") || null;
let spotifyUser = JSON.parse(localStorage.getItem("spotifyUser") || "null");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userName = document.getElementById("userName");

const locationInput = document.getElementById("location");
const languageSelect = document.getElementById("language");
const searchBtn = document.getElementById("searchBtn");
const playlistGrid = document.getElementById("playlistGrid");
const createBtn = document.getElementById("createBtn");
const playlistLink = document.getElementById("playlistLink");

const wTemp = document.getElementById("wTemp");
const wMood = document.getElementById("wMood");
const wLocation = document.getElementById("wLocation");

let cachedTracks = [];


/******************
  UI UPDATE
******************/
function updateUI() {
  if (spotifyToken && spotifyUser) {
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    userName.innerText = Hi, ${spotifyUser.display_name};
  } else {
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    userName.innerText = "";
  }
}

updateUI();


/******************
  POPUP LOGIN FLOW (FIXED)
******************/
loginBtn.onclick = async () => {
  const popup = window.open("", "spotifyLogin", "width=600,height=700");

  if (!popup) {
    alert("Please enable pop-ups to continue login.");
    return;
  }

  try {
    const res = await fetch("/api/login");
    const { authUrl } = await res.json();

    if (!authUrl) throw new Error("Failed to fetch auth URL");

    popup.location.href = authUrl;
  } catch (err) {
    popup.close();
    alert("Login failed. Try again.");
  }
};

// Receive token from callback
window.addEventListener("message", (event) => {
  if (event.data.type === "SPOTIFY_AUTH_SUCCESS") {
    spotifyToken = event.data.token;
    spotifyUser = event.data.user;

    localStorage.setItem("spotifyToken", spotifyToken);
    localStorage.setItem("spotifyUser", JSON.stringify(spotifyUser));

    updateUI();
  }
});


/******************
  LOGOUT
******************/
logoutBtn.onclick = () => {
  spotifyToken = null;
  spotifyUser = null;
  localStorage.clear();
  updateUI();
};


/******************
  API HELPERS
******************/
async function postJSON(url, data) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  return res.json();
}


/******************
  WEATHER API
******************/
async function getWeather(city) {
  return await postJSON("/api/get-weather", { city });
};


/******************
  SONG FETCH
******************/
async function getSongs(language, mood) {
  const result = await postJSON("/api/get-songs", {
    token: spotifyToken,
    language,
    mood
  });

  if (!result.tracks) return [];

  cachedTracks = result.tracks;
  return result.tracks;
}


/******************
  RENDER SONGS
******************/
function renderSongs(list) {
  playlistGrid.innerHTML = "";

  list.forEach(track => {
    playlistGrid.innerHTML += `
      <div class="tile">
        <div class="cover" style="background-image:url('${track.image || ""}')"></div>
        <div class="meta">
          <p class="name">${track.name}</p>
          <p class="artist">${track.artist}</p>
          <a href="${track.url}" target="_blank" class="chip">Open</a>
        </div>
      </div>
    `;
  });

  createBtn.classList.remove("hidden");
}


/******************
  MAIN SEARCH
******************/
searchBtn.onclick = async function handleSearch() {
  if (!spotifyToken) return alert("Login first!");

  const city = locationInput.value.trim();
  if (!city) return alert("Enter city name");

  playlistGrid.innerHTML = "⏳ Fetching weather...";
  
  // 1️⃣ Get weather
  const weather = await getWeather(city);

  if (weather.error) return alert("Weather unavailable");

  let mood = "chill";
  if (weather.temp > 32) mood = "summer";
  if (weather.condition.includes("Rain")) mood = "lofi";
  if (weather.condition.includes("Clear")) mood = "happy";
  if (weather.condition.includes("Haze")) mood = "sad";

  wLocation.innerText = city;
  wTemp.innerText = ${weather.temp}°C;
  wMood.innerText = mood;

  // 2️⃣ Fetch songs
  const tracks = await getSongs(languageSelect.value, mood);

  if (!tracks.length) {
    playlistGrid.innerHTML = "No songs found. Try another mood/language.";
    return;
  }

  renderSongs(tracks);
};


/******************
  CREATE PLAYLIST
******************/
createBtn.onclick = async () => {
  if (!cachedTracks.length) return;

  const uris = cachedTracks.map(t => t.uri);

  const result = await postJSON("/api/create-playlist", {
    token: spotifyToken,
    uris,
    name: "WeatherTunes Mix"
  });

  if (result.url) {
    playlistLink.href = result.url;
    playlistLink.classList.remove("hidden");
    alert("Playlist created!");
  } else {
    alert("Failed to create playlist.");
  }
};

