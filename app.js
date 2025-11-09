// ====== State ======
let token = localStorage.getItem("spotifyToken");
let user  = JSON.parse(localStorage.getItem("spotifyUser") || "null");
let lastTracks = [];

const loginBtn      = document.getElementById("loginBtn");
const logoutBtn     = document.getElementById("logoutBtn");
const userName      = document.getElementById("userName");
const searchBtn     = document.getElementById("searchBtn");
const playlistGrid  = document.getElementById("playlistGrid");
const createBtn     = document.getElementById("createBtn");
const playlistLink  = document.getElementById("playlistLink");
const toast         = document.getElementById("toast");

function showToast(msg, type="info") {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  setTimeout(()=>toast.classList.add("hidden"), 3000);
}

// ====== UI ======
function ui() {
  if (token && user) {
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    userName.classList.remove("hidden");
    userName.textContent = `👋 Hi, ${user.display_name || "User"}`;
  } else {
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    userName.classList.add("hidden");
    userName.textContent = "";
  }
}
ui();

// ====== Weather theme ======
function applyThemeByCondition(cond="") {
  const b = document.body;
  b.className = ""; // reset
  const c = cond.toLowerCase();

  if (c.includes("rain") || c.includes("drizzle")) b.classList.add("theme-rainy");
  else if (c.includes("snow")) b.classList.add("theme-snowy");
  else if (c.includes("thunder") || c.includes("storm")) b.classList.add("theme-stormy");
  else if (c.includes("mist") || c.includes("fog") || c.includes("haze")) b.classList.add("theme-foggy");
  else if (c.includes("cloud")) b.classList.add("theme-cloudy");
  else b.classList.add("theme-sunny");
}

// ====== Auth ======
loginBtn.onclick = async () => {
  try {
    const r = await fetch("/api/login");
    const { authUrl } = await r.json();

    const win = window.open(authUrl, "_blank", "width=500,height=700");

    window.addEventListener("message", (e) => {
      if (e.data?.type === "SPOTIFY_AUTH_SUCCESS") {
        spotifyToken = e.data.token;
        spotifyUser = e.data.user;

        localStorage.setItem("spotifyToken", spotifyToken);
        localStorage.setItem("spotifyUser", JSON.stringify(spotifyUser));

        if (win) win.close();
        updateUI();
      }
    });
  } catch {
    alert("Please enable popup permissions to login with Spotify ✅");

  }
};
  }
};


logoutBtn.onclick = () => {
  localStorage.clear();
  token = null;
  user  = null;
  ui();
  showToast("Logged out");
};

// ====== Helpers ======
async function postJSON(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {})
  });
  const text = await r.text();
  try {
    const data = JSON.parse(text);
    if (!r.ok) throw new Error(data.error || "Request failed");
    return data;
  } catch (e) {
    throw new Error(`Bad JSON ${text}`);
  }
}

// ====== Search Flow ======
searchBtn.onclick = async () => {
  try {
    if (!token) { showToast("Please login first 🎧", "error"); return; }

    const city = document.getElementById("location").value.trim();
    if (!city) { showToast("Enter a city", "error"); return; }

    const lang = document.getElementById("language").value;

    playlistGrid.innerHTML = "⏳ Loading…";

    // 1) Weather
    const w = await postJSON("/api/get-weather", { city });
    document.getElementById("wLocation").textContent = city;
    document.getElementById("wTemp").textContent     = `${w.temp}°C (feels ${w.feels_like}°C)`;
    document.getElementById("wMood").textContent     = w.condition;
    applyThemeByCondition(w.condition);

    // 2) Tracks
    const s = await postJSON("/api/get-songs", {
      token,
      language: lang,
      mood: w.condition
    });

    if (!s.tracks?.length) {
      playlistGrid.innerHTML = "No tracks found 😔 Try another city/language.";
      createBtn.classList.add("hidden");
      playlistLink.classList.add("hidden");
      return;
    }

    lastTracks = s.tracks;

    playlistGrid.innerHTML = s.tracks.map(t => `
      <div class="tile">
        <div class="cover" style="background-image:url('${t.image || ""}')"></div>
        <div class="meta">
          <p class="name">${t.name}</p>
          <p class="artist">${t.artist}</p>
        </div>
      </div>
    `).join("");

    createBtn.classList.remove("hidden");
    playlistLink.classList.add("hidden");
  } catch (err) {
    playlistGrid.innerHTML = "";
    showToast(err.message || "Failed", "error");
  }
};

// ====== Create Playlist ======
createBtn.onclick = async () => {
  try {
    if (!token || !user) { showToast("Login first", "error"); return; }
    if (!lastTracks.length) { showToast("No tracks to save", "error"); return; }

    createBtn.textContent = "Creating…";
    createBtn.disabled = true;

    const res = await postJSON("/api/create-playlist", {
      token,
      userId: user.id,
      tracks: lastTracks
    });

    if (res.link) {
      playlistLink.href = res.link;
      playlistLink.classList.remove("hidden");
      showToast("Playlist created ✅");
    } else {
      showToast("Create failed", "error");
    }
  } catch (e) {
    showToast(e.message || "Create failed", "error");
  } finally {
    createBtn.textContent = "Create Playlist on Spotify";
    createBtn.disabled = false;
  }
};

// ====== Support UPI ======
document.getElementById("upiBtn").onclick = () => {
  // UPI: 7040135660@fam
  // Deep links differ per app; simplest: show prompt to copy UPI id.
  navigator.clipboard.writeText("7040135660@fam");
  showToast("UPI ID copied: 7040135660@fam");
};



