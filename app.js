const API = "https://weather-tunes-kappa.vercel.app/api";

let spotifyAccessToken = null;
let currentMood = null;
let currentLanguage = "english";
let cachedTracks = [];

function log(...a) { console.log("🎧", ...a); }

async function loginSpotify() {
  const popup = window.open(`${API}/login`, "_blank", "width=500,height=700");

  window.addEventListener("message", (e) => {
    if (e.data.type === "SPOTIFY_AUTH_SUCCESS") {
      spotifyAccessToken = e.data.token;
      window.spotifyAccessToken = spotifyAccessToken;
      localStorage.setItem("spotifyAccessToken", spotifyAccessToken);
      popup.close();
      alert("✅ Logged in!");
    }
  });
}

async function getWeatherMood(city) {
  const weather = await fetch(`https://api.weatherapi.com/v1/current.json?key=${WEATHER_KEY}&q=${city}`)
    .then(r => r.json());

  const temp = weather.current.temp_c;
  if (temp < 10) return "cozy";
  if (temp < 20) return "relaxed";
  if (temp < 30) return "balanced";
  return "upbeat";
}

async function getTracks() {
  const res = await fetch(`${API}/recommendations`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ mood: currentMood, language: currentLanguage, token: spotifyAccessToken })
  });

  const data = await res.json();
  cachedTracks = data.tracks || [];
  renderTracks();
}

function renderTracks() {
  const box = document.getElementById("songs");
  box.innerHTML = cachedTracks.map(t => `<p>${t.title} — ${t.artist}</p>`).join("");
}

async function handleSearch() {
  const city = document.getElementById("locationInput").value.trim();
  currentLanguage = document.getElementById("languageSelect").value;

  currentMood = await getWeatherMood(city);
  await getTracks();
}

async function createPlaylist() {
  if (!spotifyAccessToken) return alert("Login first");

  const create = await fetch(`https://api.spotify.com/v1/me/playlists`, {
    method:"POST",
    headers: {Authorization:`Bearer ${spotifyAccessToken}`,"Content-Type":"application/json"},
    body: JSON.stringify({name:`WeatherTunes - ${currentMood}`, public:false})
  }).then(r=>r.json());

  const playlistId = create.id;
  const uris = cachedTracks.map(t=>t.uri);

  await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    method:"POST",
    headers:{Authorization:`Bearer ${spotifyAccessToken}`,"Content-Type":"application/json"},
    body:JSON.stringify({uris})
  });

  alert("✅ Playlist Created!");
  window.open(create.external_urls.spotify, "_blank");
}

document.getElementById("loginBtn").onclick = loginSpotify;
document.getElementById("searchBtn").onclick = handleSearch;
document.getElementById("createPlaylistBtn").onclick = createPlaylist;

if (localStorage.getItem("spotifyAccessToken")) {
  spotifyAccessToken = localStorage.getItem("spotifyAccessToken");
}
