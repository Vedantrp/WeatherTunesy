console.log("WeatherTunes Loaded ✅");

const loginBtn = document.getElementById("loginBtn");
const goBtn = document.getElementById("goBtn");
const userBox = document.getElementById("user");
const playlistLink = document.getElementById("playlistLink");
const statusBox = document.getElementById("status");

let token = localStorage.getItem("spotify_token");

if (token) userBox.innerText = "Logged in ✅";

loginBtn.onclick = async () => {
  const res = await fetch("/api/login");
  const data = await res.json();
  window.location.href = data.authUrl;
};

async function getWeatherMood(city) {
  const key = "YOUR_OPENWEATHER_API_KEY";
  const r = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${key}`);
  const j = await r.json();
  const weather = j.weather[0].main.toLowerCase();

  if (weather.includes("rain")) return "chill";
  if (weather.includes("clear")) return "happy";
  if (weather.includes("cloud")) return "lofi";
  return "mood";
}

goBtn.onclick = async () => {
  if (!token) return alert("Login first");

  const city = document.getElementById("cityInput").value;
  if (!city) return alert("Enter city");

  statusBox.textContent = "Getting weather...";
  const mood = await getWeatherMood(city);

  statusBox.textContent = "Fetching songs...";

  const res = await fetch("/api/get-songs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, mood })
  });
  const data = await res.json();

  statusBox.textContent = "Creating playlist...";

  const res2 = await fetch("/api/create-playlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, tracks: data.tracks })
  });

  const out = await res2.json();
  playlistLink.href = out.url;
  playlistLink.textContent = "Open Playlist 🎧";
  statusBox.textContent = "Done ✅";
};

// Handle Spotify callback
if (window.location.search.includes("code=")) {
  fetch("/api/callback" + window.location.search)
    .then(res => res.json())
    .then(data => {
      localStorage.setItem("spotify_token", data.accessToken);
      window.location.href = "/";
    });
}
