// ---------- Global state ----------
let spotifyToken = localStorage.getItem("spotifyToken") || null;
let spotifyUser  = JSON.parse(localStorage.getItem("spotifyUser") || "null");
let lastTracks   = [];   // [{id, uri, name, artist, image, url}]
let lastMood     = "chill";
let lastWeather  = null;

const loginBtn    = document.getElementById("loginBtn");
const logoutBtn   = document.getElementById("logoutBtn");
const userName    = document.getElementById("userName");
const locationEl  = document.getElementById("location");
const languageSel = document.getElementById("language");
const searchBtn   = document.getElementById("searchBtn");
const playlistGrid= document.getElementById("playlistGrid");
const wLocation   = document.getElementById("wLocation");
const wTemp       = document.getElementById("wTemp");
const wMood       = document.getElementById("wMood");
const createBtn   = document.getElementById("createBtn");
const playlistLink= document.getElementById("playlistLink");
const toast       = document.getElementById("toast");
const supportBtn  = document.getElementById("supportBtn");
const supportModal= document.getElementById("supportModal");
const closeSupport= document.getElementById("closeSupport");
const upiDeepLink = document.getElementById("upiDeepLink");

// ---------- Helpers ----------
const showToast = (msg) => {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 3000);
};

const setThemeByCondition = (text) => {
  const body = document.body;
  body.classList.remove("theme-sunny","theme-cloudy","theme-rainy","theme-snowy","theme-stormy","theme-foggy");
  const t = (text || "").toLowerCase();
  let theme = "theme-cloudy";
  if (/sun|clear/.test(t)) theme = "theme-sunny";
  else if (/rain|drizzle|shower/.test(t)) theme = "theme-rainy";
  else if (/snow|sleet|ice/.test(t)) theme = "theme-snowy";
  else if (/thunder|storm/.test(t)) theme = "theme-stormy";
  else if (/fog|mist|haze|smoke/.test(t)) theme = "theme-foggy";
  body.classList.add(theme);
};

const moodFromWeather = (tempC, conditionText) => {
  const t = (conditionText || "").toLowerCase();
  if (/thunder|storm/.test(t)) return "intense";
  if (/snow/.test(t)) return "peaceful";
  if (/rain|drizzle/.test(t)) return "cozy";
  if (/fog|mist|haze/.test(t)) return "mysterious";
  if (tempC >= 30) return "upbeat";
  if (tempC <= 15) return "chill";
  return "balanced";
};

const postJSON = async (url, body) => {
  const r = await fetch(url, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(body || {})
  });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Bad JSON ${text}`); }
  if (!r.ok) throw new Error(data.error || "Server error");
  return data;
};

// ---------- Auth UI ----------
const updateUI = () => {
  if (spotifyToken && spotifyUser) {
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    userName.textContent = `Hi, ${spotifyUser.display_name || spotifyUser.id}`;
    createBtn.classList.remove("hidden");
  } else {
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    userName.textContent = "";
    createBtn.classList.add("hidden");
  }
};

// ---------- Login flow ----------
loginBtn.onclick = async () => {
  try {
    const r = await fetch("/api/login");
    const { authUrl, error } = await r.json();
    if (error) throw new Error(error);

    const popup = window.open(authUrl, "spotifyLogin",
      "width=520,height=720,menubar=no,toolbar=no,status=no");

    // Fallback for blocked popups
    setTimeout(() => {
      if (!popup || popup.closed) showToast("If nothing opens, allow pop-ups and try again.");
    }, 600);

    const listener = (e) => {
      if (e.data && e.data.type === "SPOTIFY_AUTH_SUCCESS") {
        spotifyToken = e.data.token;
        spotifyUser  = e.data.user;
        localStorage.setItem("spotifyToken", spotifyToken);
        localStorage.setItem("spotifyUser", JSON.stringify(spotifyUser));
        window.removeEventListener("message", listener);
        try { popup && popup.close(); } catch {}
        updateUI();
        showToast("Logged in!");
      }
    };
    window.addEventListener("message", listener);
  } catch (err) {
    showToast(err.message);
  }
};

logoutBtn.onclick = () => {
  spotifyToken = null;
  spotifyUser  = null;
  localStorage.clear();
  updateUI();
  showToast("Logged out");
};

// ---------- Support modal ----------
supportBtn.onclick = () => {
  upiDeepLink.href = "upi://pay?pa=7040135660@fam&pn=WeatherTunes&tn=Support%20WeatherTunes&am=50&cu=INR";
  supportModal.classList.remove("hidden");
};
closeSupport.onclick = () => supportModal.classList.add("hidden");
supportModal.addEventListener("click", (e)=>{ if(e.target===supportModal) supportModal.classList.add("hidden"); });

// ---------- Weather + Songs ----------
const renderTracks = (tracks) => {
  playlistGrid.innerHTML = "";
  tracks.forEach(t => {
    const div = document.createElement("div");
    div.className = "tile";
    div.innerHTML = `
      <div class="cover" style="background-image:url('${(t.image || "").replace(/'/g,"%27")}')"></div>
      <div class="meta">
        <div class="name">${t.name}</div>
        <div class="artist">${t.artist}</div>
        <a class="chip" href="${t.url}" target="_blank" rel="noopener">Open in Spotify →</a>
      </div>
    `;
    playlistGrid.appendChild(div);
  });
};

searchBtn.onclick = async () => {
  try {
    if (!spotifyToken) { showToast("Login with Spotify first"); return; }

    const city = (locationEl.value || "").trim();
    if (!city) { showToast("Enter a city"); return; }

    // 1) Weather
    const weather = await postJSON("/api/get-weather", { city });
    lastWeather = weather;
    const cond = weather.condition || "—";
    const temp = weather.temp;
    const mood  = moodFromWeather(temp, cond);
    lastMood = mood;

    setThemeByCondition(cond);
    wLocation.textContent = weather.location || city;
    wTemp.textContent     = `${Math.round(temp)}°C`;
    wMood.textContent     = mood[0].toUpperCase()+mood.slice(1);

    // 2) Songs
    const lang = languageSel.value || "english";
    const data = await postJSON("/api/get-songs", {
      token: spotifyToken,
      language: lang,
      mood
    });

    lastTracks = data.tracks || [];
    if (!lastTracks.length) {
      playlistGrid.innerHTML = `<div class="tile"><div class="meta"><div class="name">No songs found</div><div class="artist">Try nearby city or different language.</div></div></div>`;
      createBtn.classList.add("hidden");
      playlistLink.classList.add("hidden");
      return;
    }

    renderTracks(lastTracks);
    createBtn.classList.remove("hidden");
    playlistLink.classList.add("hidden");
    showToast(`Found ${lastTracks.length} tracks`);
  } catch (err) {
    showToast(err.message);
  }
};

// ---------- Create playlist ----------
createBtn.onclick = async () => {
  try {
    if (!spotifyToken || !spotifyUser) { showToast("Login first"); return; }
    if (!lastTracks.length) { showToast("No tracks"); return; }

    createBtn.disabled = true; createBtn.textContent = "Creating…";
    const res = await postJSON("/api/create-playlist", {
      token: spotifyToken,
      userId: spotifyUser.id,
      name: `WeatherTunes – ${lastMood}`,
      description: `Auto-generated ${languageSel.value} mix for ${lastWeather?.condition || "your"} weather mood`,
      uris: lastTracks.slice(0, 50).map(t=>t.uri)
    });

    if (res.url) {
      playlistLink.href = res.url;
      playlistLink.classList.remove("hidden");
      showToast("Playlist ready!");
    }
  } catch (e) {
    showToast(e.message);
  } finally {
    createBtn.disabled = false; createBtn.textContent = "Create Playlist on Spotify";
  }
};

// ---------- Init ----------
updateUI();
