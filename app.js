let token = localStorage.getItem("token") || null;
let user = JSON.parse(localStorage.getItem("user") || "null");
let refresh = localStorage.getItem("refresh") || null;

function updateUI() {
  document.getElementById("loginBtn").style.display = token ? "none" : "block";
  document.getElementById("logoutBtn").style.display = token ? "block" : "none";
  document.getElementById("userName").innerText = user ? user.display_name : "";
}

document.getElementById("loginBtn").onclick = async () => {
  const r = await fetch("/api/login");
  const { authUrl } = await r.json();
  const pop = window.open(authUrl, "_blank", "width=600,height=600");

  window.addEventListener("message", e => {
    if (e.data.type === "SPOTIFY_AUTH_SUCCESS") {
      token = e.data.token;
      user = e.data.user;
      refresh = e.data.refreshToken;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("refresh", refresh);

      pop.close();
      updateUI();
    }
  });
};

document.getElementById("logoutBtn").onclick = () => {
  localStorage.clear();
  token = null;
  user = null;
  refresh = null;
  updateUI();
};

async function refreshToken() {
  const r = await fetch("/api/refresh-token", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ refreshToken: refresh })
  });

  const d = await r.json();
  token = d.accessToken;
  localStorage.setItem("token", token);
}

async function getWeather(city) {
  return fetch("/api/get-weather", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({city})
  }).then(r => r.json());
}

async function getSongs(lang) {
  let r = await fetch("/api/get-songs", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ token, language:lang })
  });

  if (r.status === 401) {
    await refreshToken();
    r = await fetch("/api/get-songs", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ token, language:lang })
    });
  }

  return r.json();
}

document.getElementById("searchBtn").onclick = async () => {
  const city = document.getElementById("location").value;
  const lang = document.getElementById("language").value;

  const weather = await getWeather(city);
  document.getElementById("weather").innerHTML =
    `${weather.temp}°C, ${weather.condition}`;

  const songs = await getSongs(lang);
  document.getElementById("playlist").innerHTML =
    songs.tracks.map(t => `${t.name} — <b>${t.artist}</b>`).join("<br>");
};

updateUI();
