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
    // 🛑 FIX 1: Template literal needs backticks (`)
    userName.innerText = `Hi, ${spotifyUser.display_name}`;
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
  // 💡 Improvement: Define popup features as a single variable
  const popupFeatures = "width=600,height=700,scrollbars=yes,resizable=yes";
  const popup = window.open("", "spotifyLogin", popupFeatures);

  if (!popup) {
    alert("Please enable pop-ups to continue login.");
    return;
  }
  
  // 💡 Improvement: Wait for window to load before proceeding
  // This helps ensure the popup is fully established before redirection.
  if (window.focus) popup.focus(); 

  try {
    const res = await fetch("/api/login");
    const { authUrl } = await res.json();

    if (!authUrl) throw new Error("Failed to fetch auth URL");

    popup.location.href = authUrl;
  } catch (err) {
    // 💡 Improvement: Log the error for better debugging
    console.error("Login initiation failed:", err);
    popup.close();
    alert("Login failed. Try again.");
  }
};

// Receive token from callback
window.addEventListener("message", (event) => {
  // 💡 Improvement: Always check the origin for security in real-world apps
  // if (event.origin !== "[http://your-app-domain.com](http://your-app-domain.com)") return; 

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
  // 💡 Improvement: Only remove relevant keys, not all localStorage
  localStorage.removeItem("spotifyToken");
  localStorage.removeItem("spotifyUser");
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
  
  // 💡 Improvement: Check for HTTP errors before parsing JSON
  if (!res.ok) {
    console.error(`HTTP error! status: ${res.status} on ${url}`);
    // Attempt to return error details if available
    try {
      return await res.json();
    } catch {
      return { error: `HTTP error ${res.status}` };
    }
  }

  return res.json();
}


/******************
  WEATHER API
******************/
async function getWeather(city) {
  // Use `await` and `return` in a single line for simplicity
  return postJSON("/api/get-weather", { city });
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

  // 💡 Improvement: Check for an error object from the API helper
  if (result.error || !result.tracks) return [];

  cachedTracks = result.tracks;
  return result.tracks;
}


/******************
  RENDER SONGS
******************/
function renderSongs(list) {
  playlistGrid.innerHTML = "";

  // 💡 Improvement: Use map/join for better performance than += in a loop
  const html = list.map(track => {
    return `
      <div class="tile">
        <div class="cover" style="background-image:url('${track.image || ""}')"></div>
        <div class="meta">
          <p class="name">${track.name}</p>
          <p class="artist">${track.artist}</p>
          <a href="${track.url}" target="_blank" class="chip">Open</a>
        </div>
      </div>
    `;
  }).join('');

  playlistGrid.innerHTML = html;
  
  createBtn.classList.remove("hidden");
  // 💡 Improvement: Hide the playlist link until a new playlist is created
  playlistLink.classList.add("hidden"); 
}


/******************
  MAIN SEARCH
******************/
searchBtn.onclick = async function handleSearch() {
  if (!spotifyToken) return alert("Login first!");

  const city = locationInput.value.trim();
  if (!city) return alert("Enter city name");

  // Clear previous link before a new search
  playlistLink.classList.add("hidden"); 
  playlistGrid.innerHTML = "⏳ Fetching weather...";
  
  // 1️⃣ Get weather
  const weather = await getWeather(city);

  if (weather.error) {
    playlistGrid.innerHTML = "Weather unavailable.";
    return alert("Weather unavailable for that city.");
  }

  // 🛑 FIX 2: Template literal needs backticks (`)
  wTemp.innerText = `${weather.temp}°C`;

  // 💡 Improvement: Simple mood mapping logic
  let mood = "chill";
  if (weather.temp > 32) mood = "summer";
  // Use toLowerCase for safer string comparison
  const condition = weather.condition.toLowerCase(); 
  if (condition.includes("rain")) mood = "lofi";
  else if (condition.includes("clear")) mood = "happy";
  else if (condition.includes("haze") || condition.includes("fog")) mood = "sad";
  else if (condition.includes("cloud")) mood = "chill"; // Default/Fallback

  wLocation.innerText = city;
  wMood.innerText = mood;

  playlistGrid.innerHTML = "🎵 Fetching songs...";

  // 2️⃣ Fetch songs
  const tracks = await getSongs(languageSelect.value, mood);

  if (!tracks.length) {
    playlistGrid.innerHTML = "No songs found. Try another mood/language.";
    // Ensure create button is hidden if no tracks
    createBtn.classList.add("hidden"); 
    return;
  }

  renderSongs(tracks);
};


/******************
  CREATE PLAYLIST
******************/
createBtn.onclick = async () => {
  if (!cachedTracks.length) return alert("Search for tracks first!");
  
  // Disable button and show loading to prevent double-click
  createBtn.disabled = true;
  createBtn.innerText = "Creating...";

  const uris = cachedTracks.map(t => t.uri);

  const result = await postJSON("/api/create-playlist", {
    token: spotifyToken,
    uris,
    name: `WeatherTunes Mix - ${wLocation.innerText} (${wMood.innerText})` // 💡 Improvement: Make playlist name descriptive
  });
  
  // Re-enable button
  createBtn.disabled = false;
  createBtn.innerText = "Create Playlist";

  if (result.url) {
    playlistLink.href = result.url;
    playlistLink.classList.remove("hidden");
    alert("Playlist created!");
  } else {
    // 💡 Improvement: Show the specific error if possible
    console.error("Create playlist failed:", result);
    alert(`Failed to create playlist. ${result.error ? result.error : ''}`);
  }
};
