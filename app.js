console.log("WeatherTunes loaded ✅");

// API base URL
const API = window.location.hostname.includes("localhost")
  ? "http://localhost:3000/api"
  : "https://weather-tunes-kappa.vercel.app/api";

// STATE
let spotifyToken = null;
let spotifyRefresh = null;
let user = null;
let moodData = null;
let cachedTracks = [];

// DOM
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const searchBtn = document.getElementById("searchBtn");
const createPlaylistBtn = document.getElementById("createPlaylistBtn");
const playlistLink = document.getElementById("playlistLink");
const aiSongList = document.getElementById("aiSongList");
const aiSection = document.getElementById("aiPlaylistSection");

const cityName = document.getElementById("cityName");
const temperature = document.getElementById("temperature");
const weatherDescription = document.getElementById("weatherDescription");
const weatherCard = document.getElementById("weatherCard");
const playlistCard = document.getElementById("playlistCard");
const moodType = document.getElementById("moodType");

// 🔥 MOOD MAPPING
function moodForWeather(w) {
  w = w.toLowerCase();
  if (w.includes("rain")) return "cozy";
  if (w.includes("sun") || w.includes("clear")) return "happy";
  if (w.includes("cloud")) return "relaxed";
  if (w.includes("storm")) return "energetic";
  if (w.includes("snow")) return "calm";
  return "chill";
}

// ✅ LOGIN
async function loginSpotify() {
  const r = await fetch(`${API}/login`);
  const { authUrl } = await r.json();
  window.open(authUrl, "login", "width=500,height=700");
}

window.addEventListener("message", (e) => {
  if (e.data.type === "SPOTIFY_AUTH_SUCCESS") {
    spotifyToken = e.data.token;
    spotifyRefresh = e.data.refreshToken;
    user = e.data.user;
    localStorage.setItem("spotify", JSON.stringify({ spotifyToken, spotifyRefresh, user }));
    updateAuth();
  }
});

function restoreAuth() {
  const x = localStorage.getItem("spotify");
  if (!x) return;
  const s = JSON.parse(x);
  spotifyToken = s.spotifyToken;
  spotifyRefresh = s.spotifyRefresh;
  user = s.user;
  updateAuth();
}

function updateAuth() {
  if (spotifyToken && user) {
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
  }
}

logoutBtn.onclick = () => {
  localStorage.clear();
  location.reload();
};

// ✅ WEATHER + SONGS
async function handleSearch() {
  const q = document.getElementById("locationInput").value;
  const lang = document.getElementById("languageSelect").value;

  const w = await fetch(`https://api.weatherapi.com/v1/current.json?key=b15d294bfca84397a5682344252410&q=${q}`);
  const data = await w.json();

  const weather = data.current.condition.text;
  cityName.textContent = q;
  temperature.textContent = data.current.temp_c + "°C";
  weatherDescription.textContent = weather;
  weatherCard.classList.remove("hidden");

  const mood = moodForWeather(weather);
  moodType.textContent = mood;
  playlistCard.classList.remove("hidden");

  // ✅ fetch tracks from Spotify
  await getTracksFromSpotify(mood, lang);
}

// ✅ GET TRACKS FROM SPOTIFY
async function getTracksFromSpotify(mood, lang) {
  cachedTracks = [];
  aiSongList.innerHTML = "";
  aiSection.classList.remove("hidden");

  const query = `${mood} ${lang} playlist`;

  const r = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=50`, {
    headers: { Authorization: `Bearer ${spotifyToken}` },
  });

  const json = await r.json();
  const items = json.tracks?.items || [];

  cachedTracks = items.slice(0, 35).map(t => ({
    title: t.name,
    artist: t.artists[0].name,
    uri: t.uri
  }));

  for (let s of cachedTracks) {
    const li = document.createElement("li");
    li.innerText = `${s.title} — ${s.artist}`;
    aiSongList.appendChild(li);
  }

  createPlaylistBtn.disabled = false;
}

// ✅ CREATE SPOTIFY PLAYLIST
async function createPlaylist() {
  try {
    if (!spotifyToken || !user) {
      alert("Please login first");
      return;
    }

    if (!cachedTracks.length) {
      alert("No tracks generated yet");
      return;
    }

    createPlaylistBtn.disabled = true;
    createPlaylistBtn.innerText = "Creating...";

    // 1️⃣ Create playlist
    const plRes = await fetch(`https://api.spotify.com/v1/users/${user.id}/playlists`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${spotifyToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: `WeatherTunes Mix`,
        description: `Auto-generated weather mix`,
        public: false
      })
    });

    const playlist = await plRes.json();
    if (!playlist.id) throw new Error("Playlist create failed");

    // 2️⃣ Prepare URIs
    let uris = cachedTracks.map(s => s.uri).filter(Boolean);
    if (!uris.length) throw new Error("No valid songs found");

    // 2.5 ✅ Add in batches of 20
    for (let i = 0; i < uris.length; i += 20) {
      const chunk = uris.slice(i, i + 20);
      const addRes = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${spotifyToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ uris: chunk })
      });

      // token expired? refresh & retry
      if (addRes.status === 401) {
        await refreshToken();
        return createPlaylist();
      }
    }

    // ✅ Show link
    playlistLink.href = playlist.external_urls.spotify;
    playlistLink.textContent = "✅ Open Playlist on Spotify";
    playlistLink.classList.remove("hidden");

    createPlaylistBtn.innerText = "Playlist Created ✅";
  } catch (err) {
    console.error(err);
    alert("Playlist error: " + err.message);
  } finally {
    createPlaylistBtn.disabled = false;
  }
}


// EVENTS
loginBtn.onclick = loginSpotify;
searchBtn.onclick = handleSearch;
createPlaylistBtn.onclick = createPlaylist;

restoreAuth();


