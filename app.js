// ---------------------------
// Minimal state
// ---------------------------
let spotifyToken = localStorage.getItem("spotifyToken") || null;
let spotifyUser  = JSON.parse(localStorage.getItem("spotifyUser") || "null");

const loginBtn    = document.getElementById("loginBtn");
const logoutBtn   = document.getElementById("logoutBtn");
const userName    = document.getElementById("userName");

const locationInput = document.getElementById("location");
const languageSelect= document.getElementById("language");
const searchBtn     = document.getElementById("searchBtn");

const wLocation = document.getElementById("wLocation");
const wTemp     = document.getElementById("wTemp");
const wMood     = document.getElementById("wMood");

const playlistGrid = document.getElementById("playlistGrid");
const createBtn    = document.getElementById("createBtn");
const playlistLink = document.getElementById("playlistLink");
const shareBtn     = document.getElementById("shareBtn");
const toast        = document.getElementById("toast");

// Share modal
const shareModal   = document.getElementById("shareModal");
const shareClose   = document.getElementById("shareClose");
const shareCardEl  = document.getElementById("shareCard");
const shareCover   = document.getElementById("shareCover");
const shareWeather = document.getElementById("shareWeather");
const shareTemp    = document.getElementById("shareTemp");
const shareTitle   = document.getElementById("shareTitle");
const shareSubtitle= document.getElementById("shareSubtitle");
const shareCount   = document.getElementById("shareCount");
const shareVibe    = document.getElementById("shareVibe");
const btnSaveImage = document.getElementById("btnSaveImage");
const btnCopyLink  = document.getElementById("btnCopyLink");
const btnNativeShare= document.getElementById("btnNativeShare");

let lastWeather = null;   // {city, tempC, condition, mood, icon}
let lastTracks  = [];     // [{name, artist, image, url, uri}, ...]
let createdPlaylist = null;

// ---------------------------
// Utilities
// ---------------------------
function showToast(msg, ms=2200){
  toast.textContent = msg;
  toast.classList.remove("hidden");
  setTimeout(()=>toast.classList.add("hidden"), ms);
}
function updateAuthUI(){
  if (spotifyToken && spotifyUser){
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    userName.textContent = spotifyUser.display_name || "Logged in";
  }else{
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    userName.textContent = "";
  }
}
async function postJSON(url, body){
  const r = await fetch(url, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(body || {})
  });
  const text = await r.text();
  let data;
  try{ data = JSON.parse(text); }catch(e){ throw new Error(`Bad JSON ${text}`); }
  if (!r.ok) throw new Error(data.error || "Request failed");
  return data;
}

// ---------------------------
// Login flow (popup → /api/login → /api/callback)
// ---------------------------
loginBtn.onclick = async () => {
  try{
    const res = await fetch("/api/login");
    const { authUrl } = await res.json();

    const popup = window.open(authUrl, "spotifyLogin", "width=600,height=700");
    if (!popup){ showToast("Please allow popups to login."); return; }

    const handleMsg = (evt)=>{
      const d = evt.data || {};
      if (d.type === "SPOTIFY_AUTH_SUCCESS"){
        spotifyToken = d.token;
        spotifyUser  = d.user;
        localStorage.setItem("spotifyToken", spotifyToken);
        localStorage.setItem("spotifyUser", JSON.stringify(spotifyUser));
        updateAuthUI();
        popup.close();
        window.removeEventListener("message", handleMsg);
        showToast("Logged in!");
      }
      if (d.error){
        showToast("Login failed");
        popup.close();
        window.removeEventListener("message", handleMsg);
      }
    };
    window.addEventListener("message", handleMsg);
  }catch(e){
    console.error(e);
    showToast("Login failed");
  }
};
logoutBtn.onclick = () => {
  spotifyToken = null; spotifyUser = null;
  localStorage.clear(); updateAuthUI();
};

// ---------------------------
/** Weather + mood */
function mapWeatherToMood(w){
  const c = (w.condition || "").toLowerCase();
  if (c.includes("rain")) return "lofi";
  if (c.includes("snow")) return "peaceful";
  if (c.includes("storm") || c.includes("thunder")) return "intense";
  if (c.includes("haze") || c.includes("fog")) return "mellow";
  if (w.tempC >= 32) return "summer";
  if (w.tempC <= 12) return "cozy";
  return "chill";
}
async function getWeather(city){
  return postJSON("/api/get-weather", {city});
}

// ---------------------------
// Songs
// ---------------------------
async function getSongs(language, mood){
  if (!spotifyToken) throw new Error("Login required");
  return postJSON("/api/get-songs", { token: spotifyToken, language, mood });
}

// Render simple tiles (uses track image if present)
function renderTracks(tracks){
  playlistGrid.innerHTML = "";
  tracks.forEach(t => {
    const div = document.createElement("div");
    div.className = "tile";
    div.innerHTML = `
      <div class="cover" style="background-image:url('${(t.image || "").replace(/'/g,"%27")}')"></div>
      <div class="meta">
        <div class="name">${t.name}</div>
        <div class="artist">${t.artist || ""}</div>
        <span class="chip">Open</span>
      </div>
    `;
    div.onclick = () => { if (t.url) window.open(t.url, "_blank"); };
    playlistGrid.appendChild(div);
  });
}

// ---------------------------
// Share Modal
// ---------------------------
function openShare(){
  if (!lastTracks.length || !lastWeather){ showToast("Generate a playlist first."); return; }
  const cover = lastTracks[0]?.image ||
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop";

  shareCover.src = cover;
  shareWeather.textContent = lastWeather.condition || "—";
  shareTemp.textContent    = `${Math.round(lastWeather.tempC)}°C`;
  shareTitle.textContent   = `${lastWeather.city || "Your city"} • ${languageSelect.options[languageSelect.selectedIndex].text}`;
  shareSubtitle.textContent= "Feel-good hits for your weather";
  shareCount.textContent   = `• ${lastTracks.length} tracks`;
  shareVibe.textContent    = `• ${mapWeatherToMood(lastWeather)}`;
  shareModal.classList.remove("hidden");
}
function closeShare(){ shareModal.classList.add("hidden"); }

async function saveShareImage(){
  try{
    const canvas = await html2canvas(shareCardEl, {backgroundColor:null, scale:2});
    const dataURL = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataURL; a.download = "weathertunes-vibe.png"; a.click();
  }catch(e){ console.error(e); showToast("Could not save image"); }
}
function copyShareLink(){
  const url = new URL(window.location.href);
  url.searchParams.set("city", lastWeather.city || "");
  url.searchParams.set("lang", languageSelect.value);
  navigator.clipboard.writeText(url.toString()).then(()=>showToast("Link copied!"));
}
function nativeShare(){
  const text = `WeatherTunes – ${lastWeather.city}: ${lastWeather.condition}, ${Math.round(lastWeather.tempC)}°C — ${lastTracks.length} tracks`;
  const url  = window.location.href;
  if (navigator.share){
    navigator.share({title:"WeatherTunes", text, url}).catch(()=>{});
  }else copyShareLink();
}

shareBtn.onclick = openShare;
shareClose.onclick = closeShare;
btnSaveImage.onclick = saveShareImage;
btnCopyLink.onclick = copyShareLink;
btnNativeShare.onclick = nativeShare;
document.querySelectorAll(".social-btn").forEach(btn=>{
  btn.onclick = ()=>{
    const network = btn.dataset.network;
    const url = encodeURIComponent(window.location.href);
    const text= encodeURIComponent("My WeatherTunes vibe");
    let shareUrl = "";
    if (network === "twitter")  shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
    if (network === "facebook") shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    if (network === "instagram") return showToast("Open the saved image and share on Instagram 📸");
    window.open(shareUrl, "_blank");
  };
});

// ---------------------------
// Create playlist (server already handles tokens)
// ---------------------------
createBtn.onclick = async () => {
  try{
    if (!spotifyToken){ showToast("Login first"); return; }
    if (!lastTracks.length){ showToast("No tracks"); return; }

    const uris = lastTracks.map(t=>t.uri).filter(Boolean).slice(0, 100);
    const data = await postJSON("/api/create-playlist", {
      token: spotifyToken,
      name: `WeatherTunes – ${lastWeather.city || "Vibes"}`,
      description: `Auto-generated ${languageSelect.value} mix for ${lastWeather.condition}`,
      uris
    });
    createdPlaylist = data;
    playlistLink.href = data.external_urls.spotify;
    playlistLink.classList.remove("hidden");
    showToast("Playlist created!");
  }catch(e){ console.error(e); showToast("Create failed"); }
};

// ---------------------------
// Main flow – button
// ---------------------------
searchBtn.onclick = async ()=>{
  try{
    if (!spotifyToken){ showToast("Login with Spotify first"); return; }
    const city = locationInput.value.trim();
    if (!city){ showToast("Enter a city"); return; }

    // 1) Weather
    const w = await getWeather(city);
    lastWeather = {
      city: w.name || city,
      tempC: Math.round((w.main?.temp || 0) - 273.15),
      condition: (w.weather?.[0]?.main || "Clear")
    };
    wLocation.textContent = lastWeather.city;
    wTemp.textContent     = `${lastWeather.tempC}°C`;
    const mood = mapWeatherToMood(lastWeather);
    wMood.textContent     = mood;

    // switch background theme
    const body = document.body;
    body.classList.remove("theme-sunny","theme-cloudy","theme-rainy","theme-snowy","theme-stormy","theme-foggy");
    const c = lastWeather.condition.toLowerCase();
    if (c.includes("rain")) body.classList.add("theme-rainy");
    else if (c.includes("snow")) body.classList.add("theme-snowy");
    else if (c.includes("storm")||c.includes("thunder")) body.classList.add("theme-stormy");
    else if (c.includes("cloud")) body.classList.add("theme-cloudy");
    else if (c.includes("fog")||c.includes("haze")||c.includes("mist")) body.classList.add("theme-foggy");
    else body.classList.add("theme-sunny");

    // 2) Songs
    const s = await getSongs(languageSelect.value, mood);
    lastTracks = s.tracks || [];
    if (!lastTracks.length){ playlistGrid.innerHTML = ""; showToast("No songs found"); shareBtn.classList.add("hidden"); createBtn.classList.add("hidden"); return; }

    renderTracks(lastTracks);
    shareBtn.classList.remove("hidden");
    createBtn.classList.remove("hidden");
  }catch(e){
    console.error(e);
    showToast(e.message || "Something went wrong");
  }
};

// ---------------------------
updateAuthUI();
