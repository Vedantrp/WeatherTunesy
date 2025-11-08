// ===== GLOBAL STATE =================================
let spotifyToken = localStorage.getItem("spotifyToken") || null;
let spotifyUser  = JSON.parse(localStorage.getItem("spotifyUser") || "null");
let lastTracks   = []; // currently rendered tracks (with image & uri)

const els = {
  loginBtn:     document.getElementById("loginBtn"),
  logoutBtn:    document.getElementById("logoutBtn"),
  userName:     document.getElementById("userName"),
  location:     document.getElementById("location"),
  language:     document.getElementById("language"),
  searchBtn:    document.getElementById("searchBtn"),
  weather:      document.getElementById("weather"),
  playlist:     document.getElementById("playlist"),
  status:       document.getElementById("status"),
  createBtn:    document.getElementById("createBtn"),
  playlistLink: document.getElementById("playlistLink"),
};

// ===== UI HELPERS ===================================
function setStatus(msg, type="") {
  els.status.textContent = msg || "";
  els.status.className = type || "";
}
function updateAuthUI() {
  const logged = !!(spotifyToken && spotifyUser);
  els.loginBtn.classList.toggle("hidden", logged);
  els.logoutBtn.classList.toggle("hidden", !logged);
  els.userName.textContent = logged ? `Logged in as ${spotifyUser.display_name || spotifyUser.id}` : "";
  // show create button only if logged & tracks exist
  els.createBtn.classList.toggle("hidden", !(logged && lastTracks.length));
}

// ===== POPUP LOGIN ==================================
els.loginBtn.onclick = async () => {
  try {
    setStatus("Opening Spotify…");
    const r = await fetch("/api/login");
    const j = await r.json();
    if (!j.authUrl) throw new Error("Login URL not returned");

    const popup = window.open(j.authUrl, "spotifyLogin", "width=520,height=680");

    const listener = (e) => {
      if (e.data?.type === "SPOTIFY_AUTH_SUCCESS") {
        spotifyToken = e.data.token;
        spotifyUser  = e.data.user;
        localStorage.setItem("spotifyToken", spotifyToken);
        localStorage.setItem("spotifyUser", JSON.stringify(spotifyUser));
        window.removeEventListener("message", listener);
        popup && popup.close();
        setStatus("Logged in ✓", "success");
        updateAuthUI();
      }
      if (e.data?.error) {
        setStatus(`Auth failed: ${e.data.error}`, "error");
        window.removeEventListener("message", listener);
        popup && popup.close();
      }
    };
    window.addEventListener("message", listener);
  } catch (err) {
    setStatus(err.message || "Login error", "error");
  }
};

els.logoutBtn.onclick = () => {
  spotifyToken = null;
  spotifyUser  = null;
  localStorage.clear();
  lastTracks = [];
  els.playlist.innerHTML = "";
  els.playlistLink.classList.add("hidden");
  updateAuthUI();
  setStatus("Logged out");
};

// ===== API HELPERS ==================================
async function postJSON(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify(body)
  });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error("Bad JSON " + text); }
  if (!r.ok) throw new Error(data.error || "Request failed");
  return data;
}

// ===== WEATHER + SONGS ===============================
async function getWeather(city) {
  return postJSON("/api/get-weather", { city });
}
async function getSongs(language, mood) {
  return postJSON("/api/get-songs", { token: spotifyToken, language, mood });
}

// Render track cards with album art
function renderTracks(tracks) {
  lastTracks = tracks || [];
  els.playlist.innerHTML = "";
  if (!lastTracks.length) {
    els.playlist.innerHTML = `<div class="pill">No songs found. Try a different language or city.</div>`;
    els.createBtn.classList.add("hidden");
    return;
  }

  const frag = document.createDocumentFragment();
  lastTracks.forEach(t => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img class="cover" src="${t.image || ""}" alt="Album cover" />
      <div class="meta">
        <div class="title">${t.name}</div>
        <div class="artist">${t.artist}</div>
      </div>
    `;
    // Open track on click
    card.style.cursor = "pointer";
    card.onclick = () => { if (t.url) window.open(t.url, "_blank"); };
    frag.appendChild(card);
  });
  els.playlist.appendChild(frag);

  // enable create button if logged
  els.createBtn.classList.toggle("hidden", !(spotifyToken && spotifyUser));
}

els.searchBtn.onclick = async () => {
  try {
    if (!spotifyToken) return setStatus("Login with Spotify first.", "error");

    const city = (els.location.value || "").trim();
    if (!city) return setStatus("Enter a city.", "error");

    setStatus("Fetching weather…");
    const w = await getWeather(city);
    els.weather.textContent = `📍 ${city} • ${w.temp}°C • ${w.condition}`;

    // simple mood mapping
    let mood = "chill";
    if (w.temp > 32) mood = "happy";
    if (/rain|drizzle/i.test(w.condition)) mood = "sad";
    if (/haze|fog|mist/i.test(w.condition)) mood = "romantic";
    if (/snow/i.test(w.condition)) mood = "chill";

    setStatus("Finding songs…");
    const { tracks } = await getSongs(els.language.value, mood);
    renderTracks(tracks);
    setStatus("");
  } catch (err) {
    setStatus(err.message, "error");
  }
};

// ===== CREATE PLAYLIST ===============================
els.createBtn.onclick = async () => {
  try {
    if (!spotifyToken || !spotifyUser) return setStatus("Login first.", "error");
    if (!lastTracks.length) return setStatus("No songs to add.", "error");

    els.createBtn.disabled = true;
    setStatus("Creating playlist…");

    const uris = lastTracks.map(t => t.uri).filter(Boolean).slice(0, 50);
    const resp = await postJSON("/api/create-playlist", {
      token: spotifyToken,
      userId: spotifyUser.id,
      name: "WeatherTunes Mix",
      description: "Auto-generated weather mix",
      uris
    });

    if (resp?.playlist?.external_urls?.spotify) {
      els.playlistLink.href = resp.playlist.external_urls.spotify;
      els.playlistLink.classList.remove("hidden");
      setStatus("Playlist created ✓", "success");
    } else {
      setStatus("Created, but no link returned.", "error");
    }
  } catch (err) {
    setStatus(err.message || "Create failed", "error");
  } finally {
    els.createBtn.disabled = false;
  }
};

// ===== INIT =========================================
updateAuthUI();
