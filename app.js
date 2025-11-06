console.log("WeatherTunes loaded ✅");

const loginBtn = document.getElementById("loginBtn");
const getBtn = document.getElementById("getBtn");
const result = document.getElementById("result");

let token = null;
let user = null;

async function login() {
  const r = await fetch("/api/login");
  const { authUrl } = await r.json();
  const popup = window.open(authUrl, "_blank", "width=500,height=600");

  window.addEventListener("message", (e) => {
    if (e.data.type === "SPOTIFY_AUTH") {
      token = e.data.token;
      user = e.data.user;
      popup.close();
      result.textContent = `✅ Logged in as ${user.display_name}`;
    }
  });
}

async function getPlaylist() {
  if (!token) return alert("Login first!");

  result.textContent = "Loading...";

  const weather = await fetch(`/api/get-weather?city=mumbai`).then(r=>r.json());
  const songs = await fetch(`/api/get-songs`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ token })
  }).then(r=>r.json());

  result.innerHTML = `
    ☁ Weather: ${weather.condition}<br>
    🎧 Playlist:<br>
    ${songs.tracks.map(t => `${t.name} - ${t.artist}`).join("<br>")}
  `;
}

loginBtn.onclick = login;
getBtn.onclick = getPlaylist;
