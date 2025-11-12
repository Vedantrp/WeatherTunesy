// ========= GLOBAL =========
let spotifyToken = localStorage.getItem("spotifyToken") || null;
let spotifyUser = JSON.parse(localStorage.getItem("spotifyUser") || "null");

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

// Share elements
const genCardBtn = document.getElementById("genCardBtn");
const downloadCardBtn = document.getElementById("downloadCardBtn");
const nativeShareBtn = document.getElementById("nativeShareBtn");
const shareCanvas = document.getElementById("shareCanvas");

// keep latest context
let lastWeather = null;
let lastMood = null;
let lastLanguage = "english";
let lastCity = null;
let lastTracks = [];

// ========= UI HELPERS =========
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  setTimeout(()=>toast.classList.add("hidden"), 3000);
}
function setThemeFromCondition(desc) {
  const body = document.body;
  body.className = "theme-default";
  const d = (desc || "").toLowerCase();
  if (d.includes("rain") || d.includes("drizzle")) body.className = "theme-rainy";
  else if (d.includes("storm") || d.includes("thunder")) body.className = "theme-stormy";
  else if (d.includes("snow")) body.className = "theme-snowy";
  else if (d.includes("fog") || d.includes("haze") || d.includes("mist")) body.className = "theme-foggy";
  else if (d.includes("cloud")) body.className = "theme-cloudy";
  else body.className = "theme-sunny";
}
function updateAuthUI() {
  if (spotifyToken && spotifyUser) {
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    userName.textContent = `Hi, ${spotifyUser.display_name || "Friend"}`;
  } else {
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    userName.textContent = "";
  }
}

// ========= BACKEND HELPERS =========
async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Request failed");
  return r.json();
}
async function postJSON(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(body || {})
  });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch {
    throw new Error("Bad JSON " + text);
  }
  if (!r.ok) throw new Error(data.error || "Request failed");
  return data;
}

// ========= WEATHER + MOOD =========
function moodFromWeather(tempC, condition) {
  const c = (condition||"").toLowerCase();
  if (c.includes("rain") || c.includes("drizzle")) return "cozy";
  if (c.includes("storm") || c.includes("thunder")) return "intense";
  if (c.includes("snow")) return "calm";
  if (c.includes("fog") || c.includes("haze") || c.includes("mist")) return "mysterious";
  if (tempC >= 32) return "energetic";
  if (tempC >= 26) return "upbeat";
  if (tempC <= 16) return "warm";
  return "relaxed";
}

function renderTracks(tracks){
  playlistGrid.innerHTML = "";
  lastTracks = tracks || [];
  if (!lastTracks.length) {
    playlistGrid.innerHTML = `<div class="meta">No songs found. Try a nearby city or different language.</div>`;
    createBtn.classList.add("hidden");
    playlistLink.classList.add("hidden");
    return;
  }
  const nodes = lastTracks.slice(0, 35).map(t => `
    <div class="tile">
      <div class="cover" style="background-image:url('${(t.image||"").replace("'", "%27")}'); background-size:cover;"></div>
      <div class="meta">
        <div class="name">${t.name}</div>
        <div class="artist">${t.artist}</div>
        <span class="chip">${lastLanguage}</span>
      </div>
    </div>
  `);
  playlistGrid.innerHTML = nodes.join("");

  // enable create (you already have /api/create-playlist)
  createBtn.classList.remove("hidden");
  playlistLink.classList.add("hidden");
}

// ========= LOGIN =========
loginBtn.onclick = async () => {
  try {
    const { authUrl } = await getJSON("/api/login");
    const popup = window.open(authUrl, "spotifyLogin", "width=600,height=700");
    if (!popup) {
      showToast("Please enable popups for Spotify login.");
      return;
    }
    const handler = (e) => {
      if (e.data?.type === "SPOTIFY_AUTH_SUCCESS") {
        spotifyToken = e.data.token;
        spotifyUser = e.data.user;
        localStorage.setItem("spotifyToken", spotifyToken);
        localStorage.setItem("spotifyUser", JSON.stringify(spotifyUser));
        updateAuthUI();
        window.removeEventListener("message", handler);
        popup.close();
        showToast("Logged in to Spotify ✅");
      }
    };
    window.addEventListener("message", handler);
  } catch (e) {
    showToast("Login failed");
  }
};
logoutBtn.onclick = () => {
  spotifyToken = null;
  spotifyUser = null;
  localStorage.clear();
  updateAuthUI();
  showToast("Logged out");
};

// ========= SEARCH FLOW =========
searchBtn.onclick = async () => {
  try {
    if (!spotifyToken) {
      showToast("Login with Spotify first");
      return;
    }
    const city = locationInput.value.trim();
    if (!city) { showToast("Enter a city"); return; }

    // Weather
    const w = await postJSON("/api/get-weather", { city });
    lastWeather = w;
    lastCity = city;
    lastLanguage = languageSelect.value;

    const tempC = Math.round(w.temp);
    const condition = w.condition || "Clear";

    wLocation.textContent = `${city}`;
    wTemp.textContent = `${tempC}°C`;
    lastMood = moodFromWeather(tempC, condition);
    wMood.textContent = lastMood;

    setThemeFromCondition(condition);

    // Songs
    const out = await postJSON("/api/get-songs", {
      token: spotifyToken,
      language: lastLanguage,
      mood: lastMood
    });

    renderTracks(out.tracks);

  } catch (err) {
    console.error(err);
    showToast(err.message || "Something went wrong");
  }
};

// ========= CREATE PLAYLIST =========
createBtn.onclick = async () => {
  try {
    if (!spotifyToken || !spotifyUser) return showToast("Login first");
    if (!lastTracks.length) return showToast("No tracks to add");

    createBtn.disabled = true; createBtn.textContent = "Creating…";
    const name = buildPlaylistTitle();
    const resp = await postJSON("/api/create-playlist", {
      token: spotifyToken,
      tracks: lastTracks.map(t=>t.uri),
      name
    });

    if (resp.url) {
      playlistLink.href = resp.url;
      playlistLink.classList.remove("hidden");
      showToast("Playlist created!");
    } else {
      showToast("Playlist created (no URL returned).");
    }
  } catch (e) {
    showToast(e.message || "Create failed");
  } finally {
    createBtn.disabled = false; createBtn.textContent = "Create Playlist on Spotify";
  }
};

// ========= SHARE CARD (5+2 style) =========
function buildPlaylistTitle() {
  const city = lastCity || "Your City";
  const mood = (lastMood || "Vibes");
  const langNice = (lastLanguage || "english").replace(/\b\w/g, c=>c.toUpperCase());
  // simple title variants
  const bank = [
    `${city} ${mood} ${langNice}`,
    `${mood} ${langNice} Mix – ${city}`,
    `WeatherTunes • ${city} • ${langNice} • ${mood}`,
    `${city} ${langNice} – ${mood}`
  ];
  return bank[Math.floor(Math.random()*bank.length)];
}
function buildTagline() {
  const mood = lastMood || "chill";
  const city = lastCity || "your city";
  const vibes = {
    cozy: `Chai vibes & warm blankets.`,
    intense: `Bass for brooding skies.`,
    calm: `Snow-quiet and heart-soft.`,
    mysterious: `Fog, neon, and slow synths.`,
    energetic: `Blue skies and bright beats.`,
    upbeat: `Sunlit streets, happy feet.`,
    relaxed: `Easy breeze, open windows.`,
    warm: `Cold air, warm hearts.`,
  };
  return `${vibes[lastMood] || "Vibe-mode engaged."} ${city}`;
}
// neon + gradient palette per mood
function paletteForMood(){
  switch (lastMood){
    case "cozy": return { g1:"#1e293b", g2:"#0f172a", neon:"#f59e0b" };
    case "intense": return { g1:"#0b0b1a", g2:"#111827", neon:"#8b5cf6" };
    case "calm": return { g1:"#0a192f", g2:"#0b253d", neon:"#7dd3fc" };
    case "mysterious": return { g1:"#0b1220", g2:"#0f1626", neon:"#22d3ee" };
    case "energetic": return { g1:"#0c1a1a", g2:"#001f2f", neon:"#22d3ee" };
    case "upbeat": return { g1:"#1a1230", g2:"#0f0a1e", neon:"#60a5fa" };
    case "warm": return { g1:"#0a0f1e", g2:"#111827", neon:"#f472b6" };
    default: return { g1:"#0e1220", g2:"#121a2e", neon:"#7dd3fc" };
  }
}
// draw share card to canvas (1080x1350 for stories)
function drawShareCard(){
  if (!shareCanvas) return;
  const ctx = shareCanvas.getContext("2d");
  const W = shareCanvas.width, H = shareCanvas.height;

  // bg gradient
  const { g1, g2, neon } = paletteForMood();
  const grad = ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0, g1);
  grad.addColorStop(1, g2);
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,W,H);

  // soft radial blobs
  function blob(cx, cy, r, color, alpha=0.35){
    const grd = ctx.createRadialGradient(cx,cy,10, cx,cy,r);
    grd.addColorStop(0, color);
    grd.addColorStop(1, "transparent");
    ctx.globalAlpha = alpha;
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  blob(W*0.2, H*0.1, 280, neon, .35);
  blob(W*0.9, H*0.15, 300, "#00e5ff", .18);

  // glass panel
  const panelX = 70, panelY = 160, panelW = W-140, panelH = H-360, radius = 40;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 3;
  roundRect(ctx, panelX, panelY, panelW, panelH, radius, true, true);

  // title & meta
  const title = buildPlaylistTitle();
  const tagline = buildTagline();
  const city = lastCity || "—";
  const mood = (lastMood||"Vibes").toUpperCase();
  const lang = (lastLanguage||"english").toUpperCase();
  const tracksCount = Math.min(lastTracks.length, 35);

  ctx.fillStyle = "#eaf2ff";
  ctx.font = "800 64px Inter, sans-serif";
  wrapText(ctx, title, panelX+48, panelY+110, panelW-96, 68);

  ctx.fillStyle = "#c9d6ff";
  ctx.font = "600 34px Inter, sans-serif";
  wrapText(ctx, tagline, panelX+48, panelY+210, panelW-96, 44);

  // chips
  chip(ctx, panelX+48, panelY+panelH-120, mood, neon);
  chip(ctx, panelX+48+220, panelY+panelH-120, lang, "#60a5fa");
  chip(ctx, panelX+48+420, panelY+panelH-120, `${tracksCount} TRACKS`, "#22d3ee");

  // footer
  ctx.fillStyle = "#93a4c8";
  ctx.font = "600 30px Inter, sans-serif";
  ctx.fillText(`WeatherTunes • ${city}`, panelX+48, panelY+panelH-40);
}
function roundRect(ctx, x, y, w, h, r, fill, stroke){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}
function chip(ctx, x, y, text, color="#7dd3fc"){
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  const padX = 22, padY = 14;
  ctx.font = "700 28px Inter, sans-serif";
  const tw = ctx.measureText(text).width;
  roundRect(ctx, x, y-34, tw+padX*2, 52, 16, true, true);
  ctx.fillStyle = color;
  ctx.fillText(text, x+padX, y+6);
  ctx.restore();
}
function wrapText(ctx, text, x, y, maxWidth, lineHeight){
  const words = String(text).split(/\s+/);
  let line = "", yy = y;
  for (let n = 0; n < words.length; n++) {
    const test = line + words[n] + " ";
    const w = ctx.measureText(test).width;
    if (w > maxWidth && n > 0) {
      ctx.fillText(line, x, yy);
      line = words[n] + " ";
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, yy);
}

// Share handlers
genCardBtn.onclick = () => {
  if (!lastWeather || !lastTracks.length) {
    showToast("Search first to generate a share card.");
    return;
  }
  shareCanvas.classList.remove("hidden");
  drawShareCard();
  downloadCardBtn.classList.remove("hidden");
  if (navigator.share) nativeShareBtn.classList.remove("hidden");
};
downloadCardBtn.onclick = () => {
  const url = shareCanvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = (buildPlaylistTitle().replace(/\s+/g,'_')) + ".png";
  a.click();
};
nativeShareBtn.onclick = async () => {
  try {
    const blob = await new Promise(res => shareCanvas.toBlob(res, "image/png"));
    const file = new File([blob], "weathertunes.png", { type: "image/png" });
    await navigator.share({
      files: [file],
      title: "WeatherTunes",
      text: "My vibe right now 🎵"
    });
  } catch(e){ showToast("Sharing canceled"); }
};

// ========= INIT =========
updateAuthUI();
