// public/app.js

const CLIENT_STORAGE_KEY = 'spotify_access_token';
const controlsDiv = document.getElementById('controls');
const loginButton = document.getElementById('loginButton');
const getPlaylistButton = document.getElementById('getPlaylistButton');
const statusMessage = document.getElementById('statusMessage');
const playlistLinkDiv = document.getElementById('playlistLink');
const playlistLinkAnchor = document.getElementById('playlistLinkAnchor');


// --- TOKEN HANDLER ---

/**
 * Checks the URL hash for tokens (redirect from /api/callback)
 * and stores the access token in localStorage.
 */
const parseTokensFromHash = () => {
    const hash = window.location.hash.substring(1);
    if (!hash) return null;

    // Use URLSearchParams for safe, modern parsing (avoids CSP issues)
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    
    if (accessToken) {
        localStorage.setItem(CLIENT_STORAGE_KEY, accessToken);
        // Clean the URL hash after storing the token
        // Use history.replaceState to prevent re-parsing tokens on refresh
        history.replaceState(null, '', window.location.pathname); 
        return accessToken;
    }
    return null;
};

/**
 * Initializes the app state (logged in or logged out).
 */
const initializeApp = () => {
    let accessToken = parseTokensFromHash() || localStorage.getItem(CLIENT_STORAGE_KEY);
    
    if (accessToken) {
        loginButton.style.display = 'none';
        controlsDiv.style.display = 'block';
        statusMessage.textContent = 'Ready to generate your WeatherTune Mix!';
    } else {
        loginButton.style.display = 'block';
        controlsDiv.style.display = 'none';
        statusMessage.textContent = 'Please log in with Spotify to begin.';
    }
};


// --- API/WEATHER LOGIC ---

/**
 * Fetches user location and calls Vercel API to determine music mood from weather.
 * @returns {Promise<string>} The derived mood (e.g., 'sunny', 'rainy').
 */
const determineWeatherMood = async () => {
    statusMessage.textContent = 'Getting your current location and weather...';
    
    try {
        // 1. Get location via Geolocation API
        const position = await new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                return reject(new Error('Geolocation is not supported by your browser.'));
            }
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        // 2. Call the secure Vercel endpoint (/api/get-weather)
        const weatherResponse = await fetch(`/api/get-weather?lat=${lat}&lon=${lon}`);
        const weatherData = await weatherResponse.json();

        if (weatherData.mood) {
            statusMessage.textContent = `Weather detected as ${weatherData.condition}. Generating mix...`;
            return weatherData.mood;
        }
        
        // Fallback to manual selection if API call fails but location works
        console.warn("Weather API lookup failed, falling back to manual mood.");
        return document.getElementById('weatherSelect').value;

    } catch (e) {
        // Fallback to manual selection if geolocation or network fails
        console.warn("Geolocation or Weather network failed, falling back to manual mood:", e.message);
        statusMessage.textContent = `Could not auto-detect weather. Using manually selected mood.`;
        return document.getElementById('weatherSelect').value;
    }
};


// --- EVENT LISTENERS ---

// 1. Login Button Click
loginButton.addEventListener('click', () => {
    // CRITICAL: Navigate the browser directly to the API endpoint to initiate the redirect chain
    window.location = '/api/login'; 
});


// 2. Get Playlist Button Click
getPlaylistButton.addEventListener('click', async () => {
    const accessToken = localStorage.getItem(CLIENT_STORAGE_KEY);
    if (!accessToken) {
        alert("Session expired. Please log in again.");
        initializeApp();
        return;
    }
    
    getPlaylistButton.disabled = true;
    playlistLinkDiv.style.display = 'none';

    // 1. Get Mood (automatically via weather API) and Language
    const mood = await determineWeatherMood();
    const language = document.getElementById('languageSelect').value;
    
    statusMessage.textContent = `Generating a ${mood} mix of ${language} music...`;

    // 2. Call the Vercel API to fetch tracks and create the playlist
    try {
        const response = await fetch('/api/get-tracks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken, mood, language })
        });

        const data = await response.json();

        if (response.ok && data.playlistUrl) {
            // Success! Update UI with the playlist link
            statusMessage.textContent = '✅ Playlist created successfully!';
            
            playlistLinkAnchor.href = data.playlistUrl;
            playlistLinkAnchor.textContent = `Open Your ${mood} Mix (${data.tracks.length} Songs) on Spotify 🎧`;
            playlistLinkDiv.style.display = 'block';

        } else {
            // Handle API errors (e.g., zero tracks, expired token)
            statusMessage.textContent = `❌ Error: ${data.error || 'Failed to generate playlist. Check Vercel logs.'}`;
            // If token is clearly bad, force re-login
            if (data.error && data.error.includes('token')) {
                 localStorage.removeItem(CLIENT_STORAGE_KEY);
            }
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        statusMessage.textContent = '❌ Network or server error occurred.';
    } finally {
        getPlaylistButton.disabled = false;
    }
});


// Start the application when the script loads
initializeApp();
