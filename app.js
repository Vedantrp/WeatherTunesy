// ===============================
// ELEMENT REFERENCES
// ===============================
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userBox = document.getElementById("userBox");
const userAvatar = document.getElementById("userAvatar");
const userName = document.getElementById("userName");
const languageSelect = document.getElementById("language");

const locationInput = document.getElementById("location");
const searchBtn = document.getElementById("searchBtn");

const wLocation = document.getElementById("wLocation");
const wMood = document.getElementById("wMood");
const wTemp = document.getElementById("wTemp");

const playlistGrid = document.getElementById("playlistGrid");


// ===============================
// TEMP USER SESSION (UI ONLY)
// ===============================
let loggedInUser = null;

function updateUI() {
    if (loggedInUser) {
        loginBtn.classList.add("hidden");
        logoutBtn.classList.remove("hidden");
        userBox.classList.remove("hidden");

        userAvatar.src = loggedInUser.avatar;
        userName.textContent = loggedInUser.name;
    } else {
        loginBtn.classList.remove("hidden");
        logoutBtn.classList.add("hidden");
        userBox.classList.add("hidden");
        userName.textContent = "";
    }
}


// ===============================
// LOGIN BUTTON (DEMO MODE)
// ===============================
loginBtn.onclick = () => {
    // Fake login user
    loggedInUser = {
        name: "Vedant",
        avatar: "https://i.pravatar.cc/40"
    };
    updateUI();
};

logoutBtn.onclick = () => {
    loggedInUser = null;
    updateUI();
};


// ===============================
// SEARCH WEATHER (DEMO DATA)
// ===============================
searchBtn.onclick = () => {
    let city = locationInput.value.trim();
    if (!city) city = "New York";

    // Fake weather conditions
    const weatherExamples = {
        "New York": { temp: 15, mood: "Overcast" },
        "London": { temp: 10, mood: "Cloudy" },
        "Mumbai": { temp: 31, mood: "Sunny" },
        "Tokyo": { temp: 19, mood: "Rainy" },
        "Los Angeles": { temp: 26, mood: "Clear Sky" }
    };

    const data = weatherExamples[city] || {
        temp: 20,
        mood: "Clear"
    };

    // Update weather card UI
    wLocation.textContent = city;
    wMood.textContent = data.mood;
    wTemp.textContent = data.temp + "°";

    // Render recommended playlists
    renderPlaylists(city, data.mood);
};


// ===============================
// RENDER PLAYLISTS (DEMO DATA)
// ===============================
function renderPlaylists(city, mood) {
    const demoPlaylists = [
        {
            title: "Chill Vibes",
            desc: "Relaxed beats for cloudy days",
            tracks: 46,
            image: "https://images.unsplash.com/photo-1507878866276-a947ef722fee"
        },
        {
            title: "Lo-fi Study",
            desc: "Focus music for gray weather",
            tracks: 52,
            image: "https://images.unsplash.com/photo-1507878866276-a947ef722fee"
        },
        {
            title: "Ambient Clouds",
            desc: "Atmospheric soundscapes",
            tracks: 41,
            image: "https://images.unsplash.com/photo-1507878866276-a947ef722fee"
        },
        {
            title: "Indie Chill",
            desc: "Laid-back indie tracks",
            tracks: 38,
            image: "https://images.unsplash.com/photo-1507878866276-a947ef722fee"
        }
    ];

    playlistGrid.innerHTML = demoPlaylists
        .map(
            (p) => `
        <div class="playlist-card">
            <img src="${p.image}">
            <div class="card-content">
                <div class="card-title">${p.title}</div>
                <div class="card-desc">${p.desc}</div>
                <div class="track-count">🎵 ${p.tracks} tracks</div>
            </div>
        </div>
    `
        )
        .join("");
}


// ===============================
// INITIAL UI
// ===============================
updateUI();
