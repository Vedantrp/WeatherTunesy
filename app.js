// WeatherTunes - Frontend Application

// Dynamically detect backend API base URL for local and production use
const getApiBaseUrl = () => {
    // When running locally (`npm run dev`), use local backend if available
    if (typeof window !== "undefined" && window.location.hostname === "localhost") {
        const backendUrl = `http://localhost:3000`;
        return `${backendUrl}/api`;
    }

    // Otherwise, use deployed Vercel backend (HTTPS required for Spotify OAuth)
    const backendUrl = `https://weather-tunes-kappa.vercel.app`;
    return `${backendUrl}/api`;
};

const API_BASE_URL = getApiBaseUrl();

// =======================================================================================
// === GLOBAL STATE =====================================================================
// =======================================================================================

let spotifyAccessToken = null;
let spotifyRefreshToken = null;
let currentUser = null;
let currentWeatherData = null;
let currentMoodData = null;
let currentLanguage = 'english';
let cachedAiSongs = null;

// =======================================================================================
// === DOM ELEMENTS =====================================================================
// =======================================================================================

const locationInput = document.getElementById('locationInput');
const languageSelect = document.getElementById('languageSelect');
const searchBtn = document.getElementById('searchBtn');
const loading = document.getElementById('loading');
const weatherCard = document.getElementById('weatherCard');
const playlistCard = document.getElementById('playlistCard');
const error = document.getElementById('error');
const serverStatus = document.getElementById('serverStatus');
const serverHelpLink = document.getElementById('serverHelpLink');
const serverHelp = document.getElementById('serverHelp');

const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authStatus = document.getElementById('authStatus');
const userInfo = document.getElementById('userInfo');
const userName = document.getElementById('userName');

const cityName = document.getElementById('cityName');
const dateTime = document.getElementById('dateTime');
const temperature = document.getElementById('temperature');
const weatherDescription = document.getElementById('weatherDescription');
const weatherIcon = document.getElementById('weatherIcon');
const feelsLike = document.getElementById('feelsLike');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('windSpeed');

const moodType = document.getElementById('moodType');
const playlistSuggestion = document.getElementById('playlistSuggestion');
const genreTags = document.getElementById('genreTags');
const createPlaylistBtn = document.getElementById('createPlaylistBtn');
const createPlaylistText = document.getElementById('createPlaylistText');
const openSpotifyBtn = document.getElementById('openSpotifyBtn');
const createdPlaylist = document.getElementById('createdPlaylist');
const playlistLink = document.getElementById('playlistLink');
const aiPlaylistSection = document.getElementById('aiPlaylistSection');
const aiSongList = document.getElementById('aiSongList');

// =======================================================================================
// === HELPER FUNCTIONS ================================================================
// =======================================================================================

function getMoodEmoji(mood) {
    const emojiMap = {
        'upbeat': '☀️', 'cozy': '🌧️', 'relaxed': '☁️', 'balanced': '⛅',
        'calm': '❄️', 'mysterious': '🌫️', 'energetic': '💨', 'intense': '⛈️',
        'tropical': '🌡️', 'warm': '🧊'
    };
    return emojiMap[mood.toLowerCase()] || '🎶';
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long',
        day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}

// =======================================================================================
// === WEATHER & DISPLAY ===============================================================
// =======================================================================================

function displayWeather(data) {
    const weather = data.current;
    const location = data.location;

    cityName.textContent = `${location.location}, ${location.country}`;
    dateTime.textContent = formatDateTime(location.localtime);
    temperature.textContent = Math.round(weather.temp_c);
    weatherDescription.textContent = weather.condition.text;
    weatherIcon.src = weather.condition.icon;
    weatherIcon.alt = weather.condition.text;
    feelsLike.textContent = `${Math.round(weather.feelslike_c)}°C`;
    humidity.textContent = `${weather.humidity}%`;
    windSpeed.textContent = `${weather.wind_kph} km/h`;

    weatherCard.classList.remove('hidden');
}

// =======================================================================================
// === AUTHENTICATION ===================================================================
// =======================================================================================

function updateAuthUI() {
    if (spotifyAccessToken && currentUser) {
        loginBtn.classList.add('hidden');
        userInfo.classList.remove('hidden');
        userName.textContent = `Logged in as ${currentUser.display_name || currentUser.id}`;
    } else {
        loginBtn.classList.remove('hidden');
        userInfo.classList.add('hidden');
    }
}

function logout() {
    spotifyAccessToken = null;
    spotifyRefreshToken = null;
    currentUser = null;

    localStorage.removeItem('spotifyAccessToken');
    localStorage.removeItem('spotifyRefreshToken');
    localStorage.removeItem('spotifyUser');

    updateAuthUI();
    createPlaylistBtn.disabled = true;
    createdPlaylist.classList.add('hidden');
    cachedAiSongs = null;
}

function restoreAuth() {
    const token = localStorage.getItem('spotifyAccessToken');
    const refreshToken = localStorage.getItem('spotifyRefreshToken');
    const userStr = localStorage.getItem('spotifyUser');

    if (token && refreshToken && userStr) {
        spotifyAccessToken = token;
        spotifyRefreshToken = refreshToken;
        currentUser = JSON.parse(userStr);
        updateAuthUI();
    }
}

async function refreshAccessToken() {
    if (!spotifyRefreshToken) return false;

    try {
        const response = await fetch(`${API_BASE_URL}/refresh-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: spotifyRefreshToken })
        });

        const data = await response.json();
        if (data.accessToken) {
            spotifyAccessToken = data.accessToken;
            localStorage.setItem('spotifyAccessToken', spotifyAccessToken);
            return true;
        }
    } catch (error) {
        console.error('Token refresh failed:', error);
    }

    return false;
}

// =======================================================================================
// === SPOTIFY LOGIN ====================================================================
// =======================================================================================

async function loginWithSpotify() {
    try {
        const authUrlResponse = await fetch(`${API_BASE_URL}/login`);
        if (!authUrlResponse.ok) throw new Error("Could not retrieve authorization URL.");

        const data = await authUrlResponse.json();
        const authUrl = data.authUrl;

        const popup = window.open(authUrl, 'Spotify Login', `width=500,height=700`);

        if (!popup) {
            showError('Browser blocked the popup window. Please allow popups for this site.');
            return;
        }

        const messageListener = (event) => {
            if (event.data.type === 'SPOTIFY_AUTH_SUCCESS') {
                spotifyAccessToken = event.data.token;
                spotifyRefreshToken = event.data.refreshToken;
                currentUser = event.data.user;

                localStorage.setItem('spotifyAccessToken', spotifyAccessToken);
                localStorage.setItem('spotifyRefreshToken', spotifyRefreshToken);
                localStorage.setItem('spotifyUser', JSON.stringify(currentUser));

                updateAuthUI();
                popup.close();
                window.removeEventListener('message', messageListener);

                if (currentWeatherData && currentMoodData) {
                    createPlaylistBtn.disabled = false;
                }
            } else if (event.data.error) {
                showError('Spotify authentication failed: ' + event.data.error);
                popup.close();
                window.removeEventListener('message', messageListener);
            }
        };

        window.addEventListener('message', messageListener);
    } catch (error) {
        showError('Failed to initiate Spotify login: ' + error.message);
    }
}
async function fetchAiPlaylist(mood, language) {
    try {
        const response = await fetch(`${API_BASE_URL}/ai-playlist`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mood, language }),
        });

        if (!response.ok) throw new Error("AI Playlist API failed");
        const data = await response.json();
        return data.playlist || [];
    } catch (error) {
        console.error("AI Playlist Error:", error);
        return [];
    }
}

// =======================================================================================
// === WEATHER + AI PLAYLIST ============================================================
// =======================================================================================

async function handleSearch() {
    const location = locationInput.value.trim();
    currentLanguage = languageSelect.value || 'english';
    if (!location) return showError('Please enter a location');

    hideAll();
    loading.classList.remove('hidden');

    try {
        const response = await fetch(`${API_BASE_URL}/weather-playlist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ location, language: currentLanguage })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch data.');
        }

        const data = await response.json();
        currentWeatherData = {
            current: {
                condition: { text: data.weather.condition, icon: data.weather.icon },
                temp_c: data.weather.temperature,
                feelslike_c: data.weather.feelsLike,
                humidity: data.weather.humidity,
                wind_kph: data.weather.windSpeed
            },
            location: data.weather
        };
        currentMoodData = data.mood;

        displayWeather(currentWeatherData);

        // AI playlist
        playlistCard.classList.add('hidden');
        playlistSuggestion.textContent = 'Curating playlist using AI...';
       const aiSongs = await fetchAiPlaylist(data.mood, currentLanguage);


        if (aiSongs && aiSongs.length > 0) {
            displayPlaylistSuggestion(data);
            displayAiSongsAndEnableCreation(aiSongs);
        } else {
            displayPlaylistSuggestion(data);
        }
    } catch (err) {
        showError(`Error: ${err.message}`);
    } finally {
        loading.classList.add('hidden');
    }
}

// =======================================================================================
// === ERROR + UI HELPERS ==============================================================
// =======================================================================================

function showError(message) {
    error.textContent = message;
    error.classList.remove('hidden');
    setTimeout(() => error.classList.add('hidden'), 8000);
}

function hideAll() {
    weatherCard.classList.add('hidden');
    playlistCard.classList.add('hidden');
    error.classList.add('hidden');
}

// =======================================================================================
// === EVENT LISTENERS ================================================================
// =======================================================================================

searchBtn.addEventListener('click', handleSearch);
loginBtn.addEventListener('click', loginWithSpotify);
logoutBtn.addEventListener('click', logout);

locationInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});

// =======================================================================================
// === INIT ============================================================================
// =======================================================================================

restoreAuth();


