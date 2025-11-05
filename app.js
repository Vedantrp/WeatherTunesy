console.log("WeatherTunes loaded ✅");

document.addEventListener('DOMContentLoaded', () => {
  
  // DOM Elements - Now guaranteed to be found if present in HTML
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const userInfo = document.getElementById("userInfo");
  const userName = document.getElementById("userName");
  const locationInput = document.getElementById("locationInput");
  const languageSelect = document.getElementById("languageSelect");
  const searchBtn = document.getElementById("searchBtn");
  const weatherCard = document.getElementById("weatherCard");
  const wText = document.getElementById("wText");
  const wTemp = document.getElementById("wTemp");
  const playlistCard = document.getElementById("playlistCard");
  const aiSongList = document.getElementById("aiSongList");
  const createPlaylistBtn = document.getElementById("createPlaylistBtn");
  const createdPlaylist = document.getElementById("createdPlaylist");
  const playlistLink = document.getElementById("playlistLink");
  const errorBox = document.getElementById("error");

  // State
  let accessToken = null;
  let refreshTok = null;
  let user = null;
  let tracks = [];
  let currentMood = "relaxed";

  // Utils
  function show(el){ 
    if (el) el.classList.remove("hidden"); 
  }
  function hide(el){ 
    if (el) el.classList.add("hidden"); 
  }
  function setErr(msg){ 
    if (errorBox) {
      errorBox.textContent = msg; 
      show(errorBox); 
      setTimeout(()=>hide(errorBox), 5000); 
    } else {
        console.error("Application Error:", msg);
    }
  }

  // Auth - Restores tokens and user info from localStorage
  (function restore(){
    accessToken = localStorage.getItem("spotifyAccessToken");
    refreshTok = localStorage.getItem("spotifyRefreshToken");
    const u = localStorage.getItem("spotifyUser");
    if (u) user = JSON.parse(u);
    updateAuthUI();
  })();

  function updateAuthUI(){
    if (accessToken && user){
      hide(loginBtn);
      show(userInfo);
      if (userName) userName.textContent = user.display_name || user.id || "Spotify user";
    } else {
      show(loginBtn);
      hide(userInfo);
    }
  }

  // Login (popup redirect)
  if (loginBtn) {
    loginBtn.onclick = () => {
      const popup = window.open("/api/login", "Spotify Login", "width=520,height=720");
      const listener = (e) => {
        if (e.data?.type === "SPOTIFY_AUTH_SUCCESS") {
          accessToken = e.data.accessToken;
          refreshTok = e.data.refreshToken || "";
          user = e.data.user;
          localStorage.setItem("spotifyAccessToken", accessToken);
          localStorage.setItem("spotifyRefreshToken", refreshTok);
          localStorage.setItem("spotifyUser", JSON.stringify(user));
          updateAuthUI();
          window.removeEventListener("message", listener);
          try { popup?.close(); } catch {}
        } else if (e.data?.type === "SPOTIFY_AUTH_ERROR") {
          setErr("Spotify login failed");
          window.removeEventListener("message", listener);
          try { popup?.close(); } catch {}
        }
      };
      window.addEventListener("message", listener);
    };
  }

  if (logoutBtn) {
    logoutBtn.onclick = () => {
      localStorage.clear();
      accessToken = null; refreshTok = null; user = null;
      updateAuthUI();
    };
  }

  // Weather
  async function callWeather(city){
    const r = await fetch("/api/weather", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ location: city })
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error || "Weather failed");
    return j;
  }

  function moodFromWeather(temp_c, condition){
    const c = (condition || "").toLowerCase();
    if (c.includes("storm") || c.includes("thunder")) return "intense";
    if (c.includes("rain") || c.includes("drizzle")) return "cozy";
    if (c.includes("sunny") || c.includes("clear")) return "upbeat";
    if (c.includes("snow")) return "calm";
    if (c.includes("fog") || c.includes("mist")) return "mysterious";
    if (c.includes("cloud")) return "relaxed";
    if (temp_c >= 33) return "energetic";
    if (temp_c <= 12) return "calm";
    return "balanced";
  }

  // Tracks
  async function callTracks(language, mood){
    const r = await fetch("/api/get-tracks", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ language, mood, token: accessToken })
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error || "Track fetch failed");
    return j.tracks || [];
  }

  function renderTracks(list){
    if (aiSongList) {
      aiSongList.innerHTML = "";
      list.forEach((t, i) => {
        const li = document.createElement("li");
        li.textContent = `${i+1}. ${t.name} — ${t.artist}`;
        aiSongList.appendChild(li);
      });
    }
    show(playlistCard);
    show(createPlaylistBtn);
  }

  // Create Playlist
  if (createPlaylistBtn) {
    createPlaylistBtn.onclick = async () => {
      try{
        if (!accessToken || !user) return setErr("Login first");
        if (!tracks.length) return setErr("No tracks to add");

        const uris = tracks.map(t => t.uri).filter(Boolean);
        const r = await fetch("/api/create-playlist", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ token: accessToken, tracks: uris, mood: currentMood })
        });
        const j = await r.json();
        if (!r.ok || !j?.url) throw new Error(j?.error || "Failed to create playlist");
        
        if (playlistLink) playlistLink.href = j.url;
        show(createdPlaylist);
      } catch(e){
        setErr(e.message || "Playlist failed");
      }
    };
  }

  // Search flow
  if (searchBtn) {
    searchBtn.onclick = async () => {
      try{
        hide(weatherCard); hide(playlistCard); hide(createdPlaylist);
        if (!accessToken || !user) return setErr("Please login with Spotify first.");

        const city = locationInput.value.trim();
        const language = (languageSelect.value || "english").toLowerCase();
        if (!city) return setErr("Enter a city");

        const w = await callWeather(city);
        if (wText) wText.textContent = w.condition;
        if (wTemp) wTemp.textContent = Math.round(w.temp_c);
        show(weatherCard);

        currentMood = moodFromWeather(w.temp_c, w.condition);

        tracks = await callTracks(language, currentMood);
        if (!tracks.length) {
          setErr("No songs found. Try English or a different city.");
          return;
        }

        renderTracks(tracks);
      } catch(e){
        setErr(e.message || "Something went wrong");
      }
    };
  }
});
