// ===============================
// GLOBAL STATE
// ===============================
let spotifyToken = localStorage.getItem("spotifyToken") || null;
let spotifyUser = JSON.parse(localStorage.getItem("spotifyUser") || "null");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userName = document.getElementById("userName");

const locationInput = document.getElementById("location");
const languageSelect = document.getElementById("language");
const searchBtn = document.getElementById("searchBtn");
const playlistDiv = document.getElementById("playlist");
const weatherBox = document.getElementById("weather");

// Store songs for playlist creation
let lastTracks = [];

function updateUI() {
    if (spotifyToken && spotifyUser) {
        loginBtn.style.display = "none";
        logoutBtn.style.display = "block";
        userName.innerText = `Logged in as: ${spotifyUser.display_name}`;
    } else {
        loginBtn.style.display = "block";
        logoutBtn.style.display = "none";
        userName.innerText = "";
    }
}

// ===============================
// LOGIN FLOW
// ===============================
loginBtn.onclick = async () => {
    const res = await fetch("/api/login");
    const { authUrl } = await res.json();

    const popup = window.open(authUrl, "spotifyLogin", "width=600,height=700");

    window.addEventListener("message", (event) => {
        if (event.data.type === "SPOTIFY_AUTH_SUCCESS") {
            spotifyToken = event.data.token;
            spotifyUser = event.data.user;

            localStorage.setItem("spotifyToken", spotifyToken);
            localStorage.setItem("spotifyUser", JSON.stringify(spotifyUser));

            popup.close();
            updateUI();
        }
    });
};

logoutBtn.onclick = () => {
    spotifyToken = null;
    spotifyUser = null;
    localStorage.clear();
    updateUI();
};

// ===============================
// API CALLS
// ===============================
async function getWeather(city) {
    const res = await fetch("/api/get-weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city })
    });
    return res.json();
}

async function getSongs(language, mood) {
    const res = await fetch("/api/get-songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            token: spotifyToken,
            language,
            mood
        })
    });
    return res.json();
}

async function createPlaylist() {
    const uris = lastTracks.map(t => t.uri);

    const res = await fetch("/api/create-playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            token: spotifyToken,
            userId: spotifyUser.id,
            tracks: uris
        })
    });

    return res.json();
}

// ===============================
// MAIN SEARCH
// ===============================
searchBtn.onclick = async () => {
    if (!spotifyToken) return alert("Login with Spotify first");

    const city = locationInput.value.trim();
    if (!city) return alert("Enter a city");

    playlistDiv.innerHTML = "⏳ Loading playlist...";
    weatherBox.innerHTML = "⏳ Loading weather...";

    // Weather
    const weather = await getWeather(city);
    weatherBox.innerHTML = `
        🌍 ${city}<br>
        🌡 ${weather.temp}°C (Feels ${weather.feels_like}°C)<br>
        🌦 ${weather.condition}
    `;

    // Mood rules
    let mood = "chill";
    if (weather.temp > 30) mood = "summer";
    if (weather.condition.includes("Rain")) mood = "lofi";
    if (weather.condition.includes("Haze")) mood = "gloomy";

    // Songs
    const data = await getSongs(languageSelect.value, mood);
    lastTracks = data.tracks || [];

    if (!lastTracks.length) {
        playlistDiv.innerHTML = "No songs found 😐 Try another location/language.";
        return;
    }

    playlistDiv.innerHTML = `<h3>🎧 Songs</h3>`;
    lastTracks.forEach(t => {
        playlistDiv.innerHTML += `${t.name} — <b>${t.artist}</b><br>`;
    });

    // Add create playlist button
    const btn = document.createElement("button");
    btn.innerHTML = "🎵 Create Spotify Playlist";
    btn.style.marginTop = "10px";
    playlistDiv.appendChild(btn);

    btn.onclick = async () => {
        btn.disabled = true;
        btn.innerText = "Creating...";

        const result = await createPlaylist();
        if (result.playlistUrl) {
            playlistDiv.innerHTML += `<br><a href="${result.playlistUrl}" target="_blank">✅ Open Playlist</a>`;
        } else {
            alert("Error creating playlist");
        }
    };
};

// ===============================
updateUI();
