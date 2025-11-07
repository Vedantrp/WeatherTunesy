// ===== Minimal global state
let spotifyToken = localStorage.getItem("spotifyToken") || null;
let spotifyUser  = JSON.parse(localStorage.getItem("spotifyUser") || "null");
let currentUris  = []; // for playlist creation

// ===== Elements (exact IDs used in index.html)
const loginBtn    = document.getElementById("loginBtn");
const logoutBtn   = document.getElementById("logoutBtn");
const userName    = document.getElementById("userName");

const locationEl  = document.getElementById("location");
const languageEl  = document.getElementById("language");
const moodEl      = document.getElementById("mood");
const searchBtn   = document.getElementById("searchBtn");

const weatherBox  = document.getElementById("weather");
const playlistBox = document.getElementById("playlist");
const createBtn   = document.getElementById("createBtn");
const createResult= document.getElementById("createResult");

// ===== Helpers
function setHidden(el, hidden){ el.classList[hidden ? "add" : "remove"]("hidden"); }

function updateUI() {
  const loggedIn = !!(spotifyToken && spotifyUser);
  setHidden(loginBtn, loggedIn);
  setHidden(logoutBtn, !loggedIn);
  userName.textContent = loggedIn ? `Logged in as: ${spotifyUser.display_name || spotifyUser.id}` : "";
}

// ===== Auth: Login (popup → postMessage)
loginBtn.onclick = async () => {
  try {
    const res = await fetch("/api/login");
    const { authUrl } = await res.json();
    const popup = window.open(authUrl, "spotifyLogin", "width=600,height=700");
    if (!popup) { alert("Please allow popups for login."); return; }

    const onMsg = (e) => {
      if (e.data?.type === "SPOTIFY_AUTH_SUCCESS") {
        spotifyToken = e.data.token;
        spotifyUser  = e.data.user;
        localStorage.setItem("spotifyToken", spotifyToken);
        localStorage.setItem("spotifyUser", JSON.stringify(spotifyUser));
        window.removeEventListener("message", onMsg);
        try { popup.close(); } catch(_) {}
        updateUI();
      }
    };
    window.addEventListener("message", onMsg);
  } catch (err) {
    alert("Login failed.");
    console.error(err);
  }
};

// ===== Auth: Logout
logoutBtn.onclick = () => {
  localStorage.removeItem("spotifyToken");
  localStorage.removeItem("spotifyUser");
  spotifyToken = null; spotifyUser = null;
  updateUI();
};

// ===== Backend wrappers
async function postJSON(url, body){
  const r = await fetch(url, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(body || {})
  });
  const text = await r.text(); // robust against server errors
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error(text || "Invalid server response"); }
  if (!r.ok) throw new Error(data?.error || "Request failed");
  return data;
}

const getWeather = (city)           => postJSON("/api/get-weather", { city });
const getSongs   = (language, mood) => postJSON("/api/get-songs", { token: spotifyToken, language, mood });
const createPl   = (name, uris)     => postJSON("/api/create-playlist", { token: spotifyToken, tracks: uris, name });

// ===== Main: Search flow
searchBtn.onclick = async () => {
  if (!spotifyToken) { alert("Login with Spotify first."); return; }

  const city = (locationEl.value || "").trim();
  if (!city) { alert("Enter a city."); return; }

  weatherBox.innerHTML  = "Fetching weather…";
  playlistBox.innerHTML = "Fetching songs…";
  createResult.textContent = "";
  setHidden(createBtn, true);
  currentUris = [];

  try {
    // 1) Weather
    const weather = await getWeather(city);
    weatherBox.innerHTML = `
      🌍 <b>${city}</b><br>
      🌡 ${weather.temp}°C (feels ${weather.feels_like}°C)<br>
      🌦 ${weather.condition}
    `;

    // Mood: respect dropdown but gently adjust on rain/heat
    let mood = moodEl.value;
    if (/rain|shower/i.test(weather.condition)) mood = "sad";
    else if (weather.temp > 30 && mood === "chill") mood = "happy";

    // 2) Songs
    const language = languageEl.value;
    const songs = await getSongs(language, mood);

    if (!songs?.tracks?.length) {
      playlistBox.innerHTML = "No songs found. Try another mood/language.";
      return;
    }

    // Render simple text list
    playlistBox.innerHTML = songs.tracks.map((t, i) =>
      `<div class="item">${i+1}. ${t.name} — <b>${t.artist}</b></div>`
    ).join("");

    // enable create
    currentUris = songs.tracks.map(t => t.uri).filter(Boolean);
    setHidden(createBtn, currentUris.length === 0);

    // store context in button (optional)
    createBtn.dataset.city = city;
    createBtn.dataset.language = language;
    createBtn.dataset.mood = mood;

  } catch (err) {
    playlistBox.innerHTML = `Error: ${err.message}`;
    console.error(err);
  }
};

// ===== Create playlist click
createBtn.onclick = async () => {
  if (!spotifyToken || !spotifyUser) { alert("Login first."); return; }
  if (!currentUris.length) { alert("No songs to add."); return; }

  createResult.textContent = "Creating playlist…";
  const city = createBtn.dataset.city || "City";
  const mood = createBtn.dataset.mood || "Vibes";
  const name = `${mood} · ${city}`;

  try {
    const out = await createPl(name, currentUris.slice(0, 35));
    if (out?.url) {
      createResult.innerHTML = `✅ Playlist ready — <a href="${out.url}" target="_blank" rel="noopener">Open</a>`;
    } else {
      createResult.textContent = "Failed to create playlist.";
    }
  } catch (err) {
    createResult.textContent = `Error: ${err.message}`;
    console.error(err);
  }
};

// Initial UI
updateUI();
