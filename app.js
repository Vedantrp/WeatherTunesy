// ===============================
// GLOBAL STATE
// ===============================
let spotifyToken = localStorage.getItem("spotifyToken") || null;
let spotifyRefresh = localStorage.getItem("spotifyRefresh") || null;
let tokenExpiry = Number(localStorage.getItem("tokenExpiry") || "0");
let spotifyUser = JSON.parse(localStorage.getItem("spotifyUser") || "null");

let lastTracks = [];

// ===============================
// AUTO REFRESH TOKEN
// ===============================
async function getValidToken() {
  const now = Date.now();

  if (spotifyToken && now < tokenExpiry) return spotifyToken;

  const r = await fetch("/api/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: spotifyRefresh })
  });

  const data = await r.json();

  if (data.token) {
    spotifyToken = data.token;
    tokenExpiry = now + 3500 * 1000;

    localStorage.setItem("spotifyToken", spotifyToken);
    localStorage.setItem("tokenExpiry", tokenExpiry);

    return spotifyToken;
  }

  localStorage.clear();
  location.reload();
}

// ===============================
// HELPERS
// ===============================
async function postJSON(url, data) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return r.json();
}

// ===============================
// LOGIN
// ===============================
loginBtn.onclick = async () => {
  const r = await fetch("/api/login");
  const { authUrl } = await r.json();

  const popup = window.open(authUrl, "_blank", "width=600,height=700");

  window.addEventListener("message", (event) => {
    if (event.data.type === "SPOTIFY_AUTH_SUCCESS") {
      spotifyToken = event.data.token;
      spotifyRefresh = event.data.refresh;
      spotifyUser = event.data.user;
      tokenExpiry = Date.now() + 3500 * 1000;

      localStorage.setItem("spotifyToken", spotifyToken);
      localStorage.setItem("spotifyRefresh", spotifyRefresh);
      localStorage.setItem("spotifyUser", JSON.stringify(spotifyUser));
      localStorage.setItem("tokenExpiry", tokenExpiry);

      popup.close();
      updateUI();
    }
  });
};

logoutBtn.onclick = () => {
  localStorage.clear();
  location.reload();
};

// ===============================
// WEATHER → SONGS
// ===============================
async function searchSongs() {
  const city = locationInput.value.trim();
  if (!city) return alert("Enter city!");

  const weather = await postJSON("/api/getWeather", { city });

  let mood = "chill";
  if (weather.temp > 32) mood = "energetic";
  if (weather.temp < 20) mood = "cozy";
  if (weather.condition.includes("Rain")) mood = "lofi";

  const token = await getValidToken();

  const songs = await postJSON("/api/getSongs", {
    token,
    language: languageSelect.value,
    mood
  });

  lastTracks = songs.tracks;

  renderTracks(lastTracks);
}

createPlaylistBtn.onclick = async () => {
  const ids = lastTracks.map((t) => t.id);

  const token = await getValidToken();

  const r = await postJSON("/api/createPlaylist", {
    token,
    userId: spotifyUser.id,
    name: `WeatherTunes – ${wMood.innerText}`,
    trackIds: ids
  });

  window.open(r.url, "_blank");
};

