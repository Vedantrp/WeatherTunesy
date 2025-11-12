// app.js
let spotifyToken = localStorage.getItem("spotifyToken") || null;
let spotifyUser = JSON.parse(localStorage.getItem("spotifyUser") || "null");

const el = (id) => document.getElementById(id);

const loginBtn = el("loginBtn");
const logoutBtn = el("logoutBtn");
const userName = el("userName");
const locationInput = el("location");
const languageSelect = el("language");
const searchBtn = el("searchBtn");

const wLocation = el("wLocation");
const wTemp = el("wTemp");
const wMood = el("wMood");

const playlistGrid = el("playlistGrid");
const createBtn = el("createBtn");
const playlistLink = el("playlistLink");

function updateUI() {
  if (spotifyToken && spotifyUser) {
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    userName.textContent = spotifyUser.display_name || "User";
  } else {
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    userName.textContent = "";
  }
}

loginBtn.onclick = async () => {
  const r = await fetch("/api/login");
  const { authUrl } = await r.json();
  const popup = window.open(authUrl, "spotifyLogin", "width=520,height=700");

  window.addEventListener("message", (e) => {
    if (e.data?.type === "SPOTIFY_AUTH_SUCCESS") {
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
  localStorage.clear();
  spotifyToken = null;
  spotifyUser = null;
  updateUI();
};

async function postJSON(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const txt = await r.text();
  let data;
  try { data = JSON.parse(txt); } catch { throw new Error("Bad JSON " + txt); }
  if (!r.ok) throw new Error(data.error || "Request failed");
  return data;
}

function currentHourLocal() {
  try {
    return new Date().getHours();
  } catch (_) {
    return 12;
  }
}

searchBtn.onclick = async () => {
  try {
    const city = locationInput.value.trim();
    if (!city) return alert("Enter a city");
    if (!spotifyToken) return alert("Login with Spotify first");

    // 1) Weather
    const weather = await postJSON("/api/get-weather", { city });
    wLocation.textContent = weather.city;
    wTemp.textContent = `${Math.round(weather.temp)}°C`;
    wMood.textContent = weather.condition;

    // 2) (Optional) fetch user taste (for AI)
    let taste = null;
    if (spotifyUser?.id) {
      const t = await fetch(`/api/taste?userId=${encodeURIComponent(spotifyUser.id)}`).then(r=>r.json()).catch(()=>null);
      taste = t?.taste || null;
    }

    // 3) AI mood (Gemini if available, else fallback)
    const aiMood = await postJSON("/api/ai-mood", {
      condition: weather.condition,
      temp: weather.temp,
      language: languageSelect.value,
      hour: currentHourLocal(),
      userId: spotifyUser?.id || null,
      taste
    });

    // 4) Get songs with recommendations API
    const songs = await postJSON("/api/get-songs", {
      token: spotifyToken,
      language: languageSelect.value,
      aiMood,
      city,
      userId: spotifyUser?.id || null
    });

    // 5) Render
    playlistGrid.innerHTML = "";
    if (!songs.tracks?.length) {
      playlistGrid.innerHTML = `<div class="tile glass"><div class="meta"><div class="name">No songs found</div><div class="artist">Try another language or nearby city</div></div></div>`;
      createBtn.classList.add("hidden");
      playlistLink.classList.add("hidden");
      return;
    }

    for (const t of songs.tracks) {
      playlistGrid.innerHTML += `
        <div class="tile glass">
          <div class="meta">
            <div class="name">${t.name}</div>
            <div class="artist">${t.artist || ""}</div>
            <a class="chip" href="${t.url}" target="_blank" rel="noopener">Play ▶</a>
          </div>
        </div>`;
    }

    createBtn.classList.remove("hidden");
    playlistLink.classList.add("hidden");
  } catch (e) {
    alert(e.message || "Something went wrong");
  }
};

// Create playlist (simple version – add currently rendered tracks)
createBtn.onclick = async () => {
  try {
    const tiles = [...playlistGrid.querySelectorAll(".tile .name")];
    if (!tiles.length) return alert("No tracks to add");

    // We don’t have URIs here; better approach is to rebuild from last fetch on server.
    // Simpler: ask server to run the same rec call and create directly.
    const city = wLocation.textContent || "";
    const language = languageSelect.value;

    const result = await postJSON("/api/create-playlist", {
      token: spotifyToken,
      city,
      language
    });

    if (result?.url) {
      playlistLink.href = result.url;
      playlistLink.textContent = "Open Playlist";
      playlistLink.classList.remove("hidden");
    } else {
      alert("Playlist created, but missing link.");
    }
  } catch (e) {
    alert(e.message || "Playlist failed");
  }
};

updateUI();
