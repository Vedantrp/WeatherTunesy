/* --------------------------------------------------
   GLOBAL STATE
-------------------------------------------------- */
let spotifyToken = localStorage.getItem("spotifyToken") || null;
let spotifyUser = JSON.parse(localStorage.getItem("spotifyUser") || "null");
let lastTracks = [];
let lastWeather = null;

/* --------------------------------------------------
   DOM
-------------------------------------------------- */
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userName = document.getElementById("userName");
const searchBtn = document.getElementById("searchBtn");
const playlistGrid = document.getElementById("playlistGrid");
const playlistLink = document.getElementById("playlistLink");
const createBtn = document.getElementById("createBtn");
const shareBtn = document.getElementById("shareBtn");

const wLocation = document.getElementById("wLocation");
const wTemp = document.getElementById("wTemp");
const wMood = document.getElementById("wMood");

/* Share modal */
const shareModal = document.getElementById("shareModal");
const closeShare = document.getElementById("closeShare");
const shareCanvas = document.getElementById("shareCanvas");
const downloadShare = document.getElementById("downloadShare");

/* --------------------------------------------------
   UI UPDATE
-------------------------------------------------- */
function updateUI() {
  if (spotifyToken && spotifyUser) {
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    userName.textContent = `Hi, ${spotifyUser.display_name || "Listener"}`;
  } else {
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    userName.textContent = "";
  }
}

/* --------------------------------------------------
   LOGIN
-------------------------------------------------- */
loginBtn.onclick = async () => {
  const r = await fetch("/api/login");
  const data = await r.json();
  const popup = window.open(data.authUrl, "spotify", "width=500,height=600");

  window.addEventListener("message", (e) => {
    if (e.data.type === "SPOTIFY_AUTH_SUCCESS") {
      spotifyToken = e.data.token;
      spotifyUser = e.data.user;
      localStorage.setItem("spotifyToken", spotifyToken);
      localStorage.setItem("spotifyUser", JSON.stringify(spotifyUser));
      popup?.close();
      updateUI();
    }
  });
};

logoutBtn.onclick = () => {
  spotifyToken = null;
  spotifyUser = null;
  localStorage.clear();
  updateUI();
};

/* --------------------------------------------------
   POST Helper
-------------------------------------------------- */
async function postJSON(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const text = await r.text();
  let d;
  try { d = JSON.parse(text); } catch {
    throw new Error("Bad JSON " + text);
  }
  if (!r.ok) throw new Error(d.error || "Request failed");
  return d;
}

/* --------------------------------------------------
   WEATHER
-------------------------------------------------- */
async function fetchWeather(city) {
  return await postJSON("/api/get-weather", { city });
}

function applyTheme(cond) {
  const b = document.body.classList;
  b.remove(...["theme-sunny","theme-cloudy","theme-rainy","theme-snowy","theme-stormy","theme-foggy"]);
  if (!cond) return;
  if (cond.includes("Clear")) b.add("theme-sunny");
  else if (cond.includes("Cloud")) b.add("theme-cloudy");
  else if (cond.includes("Rain")) b.add("theme-rainy");
  else if (cond.includes("Snow")) b.add("theme-snowy");
  else if (cond.includes("Thunder")) b.add("theme-stormy");
  else b.add("theme-foggy");
}

/* --------------------------------------------------
   SONGS
-------------------------------------------------- */
async function fetchSongs(language, mood) {
  return await postJSON("/api/get-songs", {
    token: spotifyToken,
    language,
    mood
  });
}

function renderTracks(tracks) {
  const grid = document.getElementById("playlistGrid");
  grid.innerHTML = "";

  tracks.forEach(t => {
    const card = document.createElement("div");
    card.className = "song-card";

    card.innerHTML = `
      <div class="song-img" style="background-image:url('${t.image}')">
        <button class="fab share"><ion-icon name="share-social"></ion-icon></button>
        <button class="fab play"><ion-icon name="play"></ion-icon></button>
      </div>

      <div class="song-meta">
        <div class="song-icon">♪</div>

        <div class="song-info">
          <div class="song-title">${t.name}</div>
          <div class="song-artist">${t.artist}</div>
          <div class="song-count"><span>•</span> 50 tracks</div>
        </div>
      </div>
    `;

    card.querySelector(".play").onclick = () => window.open(t.url, "_blank");
    card.querySelector(".share").onclick = () => showShareModal(t);

    grid.appendChild(card);
  });
}


/* --------------------------------------------------
   MAIN SEARCH ACTION
-------------------------------------------------- */
searchBtn.onclick = async () => {
  const city = document.getElementById("location").value.trim();
  const language = document.getElementById("language").value;

  if (!spotifyToken) return alert("Login with Spotify first");
  if (!city) return alert("Enter a city");

  try {
    // 1️⃣ Weather
    const w = await fetchWeather(city);
    lastWeather = w;
    wLocation.textContent = w.city;
    wTemp.textContent = `${w.temp}°C (Feels ${w.feels}°C)`;
    wMood.textContent = w.condition;
    applyTheme(w.condition);

    // mood map
    let mood = "chill";
    if (w.temp > 30) mood = "energetic";
    if (["Rain","Thunderstorm"].includes(w.condition)) mood = "lofi";
    if (["Haze","Fog","Smoke","Mist"].includes(w.condition)) mood = "sad";

    // 2️⃣ Songs
    const songData = await fetchSongs(language, mood);
    lastTracks = songData.tracks || [];

    if (!lastTracks.length) {
      playlistGrid.innerHTML = "<p>No songs found. Try a nearby city or different language.</p>";
      createBtn.classList.add("hidden");
      playlistLink.classList.add("hidden");
      shareBtn.classList.add("hidden");
      return;
    }

    renderTracks(lastTracks);
    createBtn.classList.remove("hidden");
    playlistLink.classList.add("hidden");
    shareBtn.classList.remove("hidden");

  } catch (err) {
    console.error(err);
    alert("Failed. Try again.");
  }
};

/* --------------------------------------------------
   CREATE PLAYLIST
-------------------------------------------------- */
createBtn.onclick = async () => {
  try {
    const r = await postJSON("/api/create-playlist", {
      token: spotifyToken,
      tracks: lastTracks.map(t => t.uri)
    });

    playlistLink.href = r.url;
    playlistLink.classList.remove("hidden");
    toast("Playlist created 🎧");
  } catch (err) {
    console.error(err);
    alert("Playlist failed");
  }
};

/* --------------------------------------------------
   SHARE CARD (Canvas)
-------------------------------------------------- */
function lerp(a,b,t){ return a+(b-a)*t; }

function drawGradient(ctx, w, h, c1, c2){
  const g = ctx.createLinearGradient(0,0,w,h);
  g.addColorStop(0,c1);
  g.addColorStop(1,c2);
  ctx.fillStyle = g;
  ctx.fillRect(0,0,w,h);
}

function themeColorsFromCondition(cond){
  if (!cond) return ["#141b2a","#0c111a"];
  if (cond.includes("Clear")) return ["#ffcc70","#4158d0"];
  if (cond.includes("Cloud")) return ["#6b7a8f","#232c39"];
  if (cond.includes("Rain")) return ["#4b82d8","#0a1630"];
  if (cond.includes("Snow")) return ["#cfe9ff","#334a60"];
  if (cond.includes("Thunder")) return ["#8b5cf6","#0a0a16"];
  return ["#bfc6cf","#161b20"];
}

async function generateShareCard(){
  const canvas = shareCanvas;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;

  // BG gradient
  const [c1,c2] = themeColorsFromCondition(lastWeather?.condition);
  drawGradient(ctx, W, H, c1, c2);

  // Glass frame
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 4;
  const pad = 40;
  ctx.roundRect = function(x,y,w,h,r=28){
    this.beginPath();
    this.moveTo(x+r,y);
    this.arcTo(x+w,y,x+w,y+h,r);
    this.arcTo(x+w,y+h,x,y+h,r);
    this.arcTo(x,y+h,x,y,r);
    this.arcTo(x,y,x+w,y,r);
    this.closePath();
  };
  ctx.roundRect(pad,pad,W-2*pad,H-2*pad,36);
  ctx.fill();
  ctx.stroke();

  // Title
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 64px Inter, sans-serif";
  ctx.fillText("WeatherTunes", pad+40, pad+110);

  // Sub
  ctx.font = "400 28px Inter, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  const city = lastWeather?.city || "—";
  const stats = `${lastWeather?.temp ?? "—"}°C • ${lastWeather?.condition || "—"}`;
  ctx.fillText(`${city} • ${stats}`, pad+40, pad+160);

  // Divider
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad+40, pad+190);
  ctx.lineTo(W-pad-40, pad+190);
  ctx.stroke();

  // Track list (top 6)
  const tracks = lastTracks.slice(0,6);
  let y = pad+250;
  ctx.font = "600 34px Inter, sans-serif";
  tracks.forEach((t,i)=>{
    ctx.fillStyle = "#ffffff";
    const name = t.name.length>38 ? t.name.slice(0,35)+"…" : t.name;
    ctx.fillText(`${i+1}. ${name}`, pad+60, y);
    ctx.font = "400 24px Inter, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    const artist = t.artist.length>40 ? t.artist.slice(0,37)+"…" : t.artist;
    ctx.fillText(artist, pad+60, y+32);
    y += 96;
    ctx.font = "600 34px Inter, sans-serif";
  });

  // Footer chip
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2;
  const chipW = 520, chipH = 64, cx = pad+40, cy = H - pad - chipH - 20;
  ctx.roundRect(cx, cy, chipW, chipH, 18);
  ctx.fill(); ctx.stroke();

  ctx.fillStyle = "#b8c1d9";
  ctx.font = "600 26px Inter, sans-serif";
  ctx.fillText("Made with WeatherTunes • weathertunesy.vercel.app", cx+20, cy+42);
}

shareBtn.onclick = async () => {
  try{
    if (!lastTracks.length || !lastWeather) return alert("Search first to generate a card.");
    await generateShareCard();
    shareModal.classList.remove("hidden");
  }catch(e){
    console.error(e);
    alert("Share card failed");
  }
};

closeShare.onclick = ()=> shareModal.classList.add("hidden");

downloadShare.onclick = ()=>{
  const link = document.createElement("a");
  link.download = `WeatherTunes-${(lastWeather?.city || "card")}.png`;
  link.href = shareCanvas.toDataURL("image/png");
  link.click();
};

/* --------------------------------------------------
   Toast helper
-------------------------------------------------- */
function toast(msg){
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  setTimeout(()=>el.classList.add("hidden"), 2400);
}

/* --------------------------------------------------
 Init
-------------------------------------------------- */
updateUI();

