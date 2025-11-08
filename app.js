// STATE
let token = localStorage.getItem("token");
let user  = JSON.parse(localStorage.getItem("user") || "null");
let currentTracks = [];
let currentAudio = null;

// DOM
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userName = document.getElementById("userName");
const searchBtn = document.getElementById("searchBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const downloadBtn = document.getElementById("downloadBtn");
const playlistGrid = document.getElementById("playlistGrid");
const createBtn = document.getElementById("createBtn");
const playlistLink = document.getElementById("playlistLink");
const donateBtn = document.getElementById("donateBtn");
const donatePopup = document.getElementById("donatePopup");
const closeDonate = document.getElementById("closeDonate");
const djIntro = document.getElementById("djIntro");
const djText = document.getElementById("djText");
const toastEl = document.getElementById("toast");
const historySection = document.getElementById("historySection");
const historyList = document.getElementById("historyList");

// helpers
function toast(msg){ toastEl.textContent=msg; toastEl.classList.remove("hidden"); setTimeout(()=>toastEl.classList.add("hidden"),2200); }
function ui(){
  if(token && user){
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    userName.textContent=user.display_name||"";
  }else{
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    userName.textContent="";
  }
}
ui();

function post(url, data){
  return fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)}).then(r=>r.json());
}

// UPI popup
donateBtn.onclick = ()=>donatePopup.classList.remove("hidden");
closeDonate.onclick = ()=>donatePopup.classList.add("hidden");

// Login
loginBtn.onclick = async ()=>{
  const {authUrl} = await fetch("/api/login").then(r=>r.json());
  window.open(authUrl,"_self");
};
window.addEventListener("message",e=>{
  if(e.data.type==="SPOTIFY_SUCCESS"){
    token=e.data.token; user=e.data.user;
    localStorage.setItem("token",token);
    localStorage.setItem("user",JSON.stringify(user));
    ui(); toast("Logged in!");
  }
});
logoutBtn.onclick=()=>{ localStorage.clear(); location.reload(); };

// API
async function getWeather(city){ return post("/api/get-weather",{city}); }
async function getSongs(language,mood){ return post("/api/get-songs",{token,language,mood}); }
async function createPlaylist(uris){ return post("/api/create-playlist",{token,tracks:uris}); }

// Render tracks
function renderTracks(list){
  playlistGrid.innerHTML = list.map((t,i)=>`
    <div class="tile glass">
      <div class="cover" style="background-image:url('${t.image||""}')"></div>
      <div class="meta">
        <div class="name">${t.name}</div>
        <div class="artist">${t.artist}</div>
        <div class="row">
          <button class="play" data-idx="${i}">▶ Preview</button>
          <a class="play" href="${t.url||'#'}" target="_blank">♫ Open</a>
        </div>
      </div>
    </div>
  `).join("");

  // bind preview buttons
  document.querySelectorAll(".play[data-idx]").forEach(btn=>{
    btn.onclick=()=>{
      const idx = Number(btn.dataset.idx);
      const tr = list[idx];
      if(!tr.preview){ toast("No preview for this track"); return; }
      if(currentAudio){ currentAudio.pause(); currentAudio=null; }
      currentAudio = new Audio(tr.preview);
      currentAudio.play().catch(()=>toast("Autoplay blocked"));
    };
  });

  createBtn.classList.remove("hidden");
}

// DJ intro text (free)
function setDJIntro(city, mood, lang){
  const map = {
    english: `City ${city} feels ${mood} — dropping a smooth ${lang} blend. Plug in, vibe out.`,
    hindi:   `${city} ka vibe ${mood}! ${lang} mood ke sath ek dum mast mix — chill karo aur enjoy!`,
    punjabi: `${city} vibe ${mood} — punjabi bangers on the way!`,
    marathi: `${city} mood ${mood} — ek number tracks tayar aahet!`,
    tamil:   `${city} vibe ${mood} — Tamil chill mix ready!`,
  };
  const key = (map[lang] ? lang : "english");
  djText.textContent = map[key];
  djIntro.classList.remove("hidden");
}

// history
function pushHistory(city, lang, mood){
  const hist = JSON.parse(localStorage.getItem("history")||"[]");
  hist.unshift({city,lang,mood,ts:Date.now()});
  while(hist.length>8) hist.pop();
  localStorage.setItem("history",JSON.stringify(hist));
  renderHistory();
}
function renderHistory(){
  const hist = JSON.parse(localStorage.getItem("history")||"[]");
  historyList.innerHTML = hist.map(h=>`<span class="hist-item">${h.city} • ${h.lang} • ${h.mood}</span>`).join("");
  historySection.classList.toggle("hidden", hist.length===0);
}
renderHistory();

// Shuffle and Download
function shuffle(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
shuffleBtn.onclick=()=>{ if(!currentTracks.length) return toast("Search first"); currentTracks=shuffle(currentTracks); renderTracks(currentTracks); };
downloadBtn.onclick=()=>{
  if(!currentTracks.length) return toast("Search first");
  const text = currentTracks.map((t,i)=>`${i+1}. ${t.name} — ${t.artist}`).join("\n");
  const blob = new Blob([text],{type:"text/plain"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download="weathertunes.txt"; a.click(); URL.revokeObjectURL(url);
};

// Search flow
searchBtn.onclick = async ()=>{
  if(!token) return toast("Login with Spotify first");
  const city = document.getElementById("location").value.trim();
  const lang = document.getElementById("language").value;
  if(!city) return toast("Enter city");

  // weather
  const w = await getWeather(city);
  document.getElementById("wLocation").textContent = city;
  document.getElementById("wTemp").textContent = Math.round(w.temp)+"°C";

  // mood rules
  let mood="chill";
  const cond = (w.condition||"").toLowerCase();
  if(w.temp>32) mood="summer";
  if(cond.includes("rain")) mood="lofi";
  if(cond.includes("haze")||cond.includes("mist")||cond.includes("fog")) mood="gloomy";
  document.getElementById("wMood").textContent = mood;

  // DJ text
  setDJIntro(city,mood,lang);

  // tracks
  const data = await getSongs(lang,mood);
  currentTracks = (data.tracks||[]).slice(0,35);
  if(!currentTracks.length){ toast("No songs found — try another city/language"); return; }
  renderTracks(currentTracks);
  pushHistory(city,lang,mood);
};

// Create playlist
createBtn.onclick = async ()=>{
  if(!currentTracks.length) return toast("Search first");
  const uris = currentTracks.map(t=>t.uri).filter(Boolean);
  if(!uris.length) return toast("No playable tracks");
  const out = await createPlaylist(uris);
  if(out.url){
    playlistLink.href = out.url;
    playlistLink.textContent = "Open Playlist →";
    playlistLink.classList.remove("hidden");
    toast("Playlist created ✅");
  }else{
    toast("Create failed");
  }
};
