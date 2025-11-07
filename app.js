let spotifyToken = localStorage.getItem("spotifyToken") || null;
let spotifyUser = JSON.parse(localStorage.getItem("spotifyUser") || "null");
let refreshTokenLS = localStorage.getItem("spotifyRefreshToken") || null;

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userName = document.getElementById("userName");
const locationInput = document.getElementById("location");
const languageSelect = document.getElementById("language");
const searchBtn = document.getElementById("searchBtn");
const playlistDiv = document.getElementById("playlist");
const weatherBox = document.getElementById("weather");

function updateUI(){
  if(spotifyToken && spotifyUser){
    loginBtn.style.display="none";
    logoutBtn.style.display="block";
    userName.innerText=`Logged in as ${spotifyUser.display_name}`;
  } else {
    loginBtn.style.display="block";
    logoutBtn.style.display="none";
    userName.innerText="";
  }
}

loginBtn.onclick = async () => {
  const r = await fetch("/api/login");
  const { authUrl } = await r.json();

  const popup = window.open(authUrl, "spotify", "width=600,height=700");

  window.addEventListener("message",(e)=>{
    if(e.data.type==="SPOTIFY_AUTH_SUCCESS"){
      spotifyToken = e.data.token;
      spotifyUser = e.data.user;
      refreshTokenLS = e.data.refreshToken;

      localStorage.setItem("spotifyToken",spotifyToken);
      localStorage.setItem("spotifyUser",JSON.stringify(spotifyUser));
      localStorage.setItem("spotifyRefreshToken",refreshTokenLS);

      popup.close();
      updateUI();
    }
  });
};

logoutBtn.onclick = () => {
  localStorage.clear();
  spotifyToken = null;
  spotifyUser = null;
  refreshTokenLS = null;
  updateUI();
};

async function refreshSpotifyToken(){
  if(!refreshTokenLS) return null;
  
  const r = await fetch("/api/refresh-token",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ refreshToken: refreshTokenLS })
  });

  const data = await r.json();
  if(data.accessToken){
    spotifyToken = data.accessToken;
    localStorage.setItem("spotifyToken",spotifyToken);
    return spotifyToken;
  }
  return null;
}

async function getWeather(city){
  const r = await fetch("/api/get-weather",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ city })
  });
  return r.json();
}

async function getSongs(language, mood){
  let r = await fetch("/api/get-songs",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ token:spotifyToken, language, mood })
  });

  // If token expired, refresh & retry only ONCE
  if(r.status === 401){
    const newT = await refreshSpotifyToken();
    if(newT){
      r = await fetch("/api/get-songs",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ token:newT, language, mood })
      });
    }
  }

  return r.json();
}

searchBtn.onclick = async () => {
  if (!spotifyToken) return alert("Login first!");

  const city = locationInput.value.trim();
  if(!city) return alert("Enter city");

  playlistDiv.innerHTML="Fetching...";
  weatherBox.innerHTML="Fetching...";

  const weather = await getWeather(city);
  weatherBox.innerHTML = `
    🌍 ${city}<br>
    🌡 ${weather.temp}°C (Feels ${weather.feels_like}°C)<br>
    ☁ ${weather.condition}
  `;

  let mood = "chill";
  if(weather.temp > 30) mood = "energetic";
  if(weather.condition.includes("Rain")) mood = "lofi";
  if(weather.condition.includes("Haze")) mood = "sad";

  const songs = await getSongs(languageSelect.value,mood);

  if(!songs.tracks?.length){
    playlistDiv.innerHTML="No songs, try another mood/language.";
    return;
  }

  playlistDiv.innerHTML = songs.tracks.map(
    t => `<div>${t.name} — <b>${t.artist}</b></div>`
  ).join("");
};

updateUI();
