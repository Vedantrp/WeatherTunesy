let token = localStorage.getItem("spotifyToken");
let user = JSON.parse(localStorage.getItem("spotifyUser") || "null");

const els = {
  login: document.getElementById("loginBtn"),
  logout: document.getElementById("logoutBtn"),
  userName: document.getElementById("userName"),
  city: document.getElementById("location"),
  lang: document.getElementById("language"),
  search: document.getElementById("searchBtn"),
  wLoc: document.getElementById("wLocation"),
  wTemp: document.getElementById("wTemp"),
  wMood: document.getElementById("wMood"),
  grid: document.getElementById("playlistGrid"),
  toast: document.getElementById("toast")
};

function toast(t) {
  els.toast.innerText = t;
  els.toast.classList.remove("hidden");
  setTimeout(() => els.toast.classList.add("hidden"), 2200);
}

function updateUI() {
  if (token && user) {
    els.login.classList.add("hidden");
    els.logout.classList.remove("hidden");
    els.userName.textContent = user.display_name;
  } else {
    els.login.classList.remove("hidden");
    els.logout.classList.add("hidden");
    els.userName.textContent = "";
  }
}

els.login.onclick = async () => {
  const r = await fetch("/api/login");
  const j = await r.json();
  const popup = window.open(j.authUrl, "_blank");

  window.addEventListener("message", (e) => {
    if (e.data.type === "SPOTIFY_AUTH_SUCCESS") {
      token = e.data.token;
      user = e.data.user;
      localStorage.setItem("spotifyToken", token);
      localStorage.setItem("spotifyUser", JSON.stringify(user));
      popup.close();
      updateUI();
    }
  });
};

els.logout.onclick = () => {
  token = null;
  user = null;
  localStorage.clear();
  updateUI();
};

function getMood(weather) {
  const { temp, condition } = weather;
  const c = condition.toLowerCase();

  if (temp >= 32) return "energetic";
  if (temp <= 18) return "sad";
  if (c.includes("rain")) return "lofi";
  if (c.includes("fog") || c.includes("haze")) return "gloomy";
  if (c.includes("cloud")) return "chill";
  if (c.includes("clear") || c.includes("sun")) return "happy";

  return "chill";
}

async function post(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(body)
  });
  return r.json();
}

// Auto-location on load
// Accurate auto-location using reverse geocode
window.onload = () => {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(async(pos) => {
      try {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        // Reverse geocoding (accurate city)
        const geoRes = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
        );
        const geo = await geoRes.json();

        if (geo.city) {
          els.city.value = geo.city; // ✅ sets Kolhapur correctly
        }

      } catch (err) {
        console.log("Location error", err);
      }
    });
  }

  updateUI();
};


els.search.onclick = async () => {
  if (!token) return toast("Login required");

  const city = els.city.value.trim();
  if (!city) return toast("Enter city");

  const weather = await post("/api/get-weather", { city });
  if (!weather.city) return toast("Weather not found");

  els.wLoc.textContent = weather.city;
  els.wTemp.textContent = weather.temp + "°C";

  const mood = getMood(weather);
  els.wMood.textContent = mood;

  const songs = await post("/api/get-songs", {
    token, language: els.lang.value, mood
  });

  els.grid.innerHTML = "";
  if (!songs.tracks?.length) return toast("No songs");

  songs.tracks.forEach(t => {
    const el = document.createElement("div");
    el.className = "tile";
    el.innerHTML = `
      <div class="cover" style="background-image:url('${t.image}')"></div>
      <div class="meta">
        <div class="name">${t.name}</div>
        <div class="artist">${t.artist}</div>
      </div>`;
    els.grid.appendChild(el);
  });
};

