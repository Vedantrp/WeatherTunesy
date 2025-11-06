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

// ===============================
// UI HELPERS
// ===============================
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

    // Listen for token from popup
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
// FETCH WEATHER
// ===============================
async function getWeather(city) {
    const res = await fetch("/api/get-weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city })
    });

    return res.json();
}

// ===============================
// FETCH SONGS
// ===============================
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

// ===============================
// MAIN SEARCH HANDLER
// ===============================
searchBtn.onclick = async () => {
    if (!spotifyToken) {
        alert("Login with Spotify first ⚠️");
        return;
    }

    const city = locationInput.value.trim();
    if (!city) return alert("Enter a city");

    playlistDiv.innerHTML = "⏳ Loading...";
    weatherBox.innerHTML = "⏳ Fetching weather...";

    // 1️⃣ Get weather
    const weather = await getWeather(city);
    weatherBox.innerHTML = `
        🌍 ${city}<br>
        🌡 ${weather.temp}°C (Feels ${weather.feels_like}°C)<br>
        🌦 Condition: ${weather.condition}
    `;

    // apply simple mood rule
    let mood = "chill";
    if (weather.temp > 30) mood = "summer";
    if (weather.condition.includes("Rain")) mood = "lofi";
    if (weather.condition.includes("Haze")) mood = "gloomy";

    // 2️⃣ Get Spotify tracks
    const tracks = await getSongs(languageSelect.value, mood);
    if (!tracks.tracks?.length) {
        playlistDiv.innerHTML = "No songs found 😐 Try another location/language.";
        return;
    }

    playlistDiv.innerHTML = `<h3>🎧 Recommended Songs</h3>`;
    tracks.tracks.forEach(t => {
        playlistDiv.innerHTML += `
        <div>
           ${t.name} — <b>${t.artist}</b>
        </div>`;
    });
};

// ===============================
updateUI();
