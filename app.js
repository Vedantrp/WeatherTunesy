const CLIENT_STORAGE_KEY = 'spotify_access_token';

// Variable declarations (will be assigned in DOMContentLoaded)
let controlsDiv;
let loginButton;
let getPlaylistButton;
let statusMessage;
let playlistLinkDiv;
let playlistLinkAnchor;


// --- CORE HANDLERS ---

const getAccessToken = () => localStorage.getItem(CLIENT_STORAGE_KEY);

/**
 * Checks the URL hash for tokens (redirect from /api/callback) and stores them.
 * Uses history.replaceState to prevent repeated token parsing on refresh.
 */
const parseTokensFromHash = () => {
    const hash = window.location.hash.substring(1);
    if (!hash) return null;

    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    
    if (accessToken) {
        localStorage.setItem(CLIENT_STORAGE_KEY, accessToken);
        // Clean the URL hash after storing the token (prevents CSP issues and re-login loop)
        history.replaceState(null, '', window.location.pathname); 
        return accessToken;
    }
    return null;
};

/**
 * Initializes the app state based on whether a token is present.
 */
const initializeApp = () => {
    let accessToken = parseTokensFromHash() || getAccessToken();
    
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


/**
 * Fetches user location and calls Vercel API to determine music mood from weather.
 * @returns {Promise<string>} The derived mood (e.g., 'sunny', 'rainy').
 */
const determineWeatherMood = async () => {
    statusMessage.textContent = 'Getting your current location and weather...';
    
    // Default/Fallback mood is what the user has manually selected
    let fallbackMood = document.getElementById('weatherSelect').value; 
    
    try {
        // 1. Get location
        const position = await new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                return reject(new Error('Geolocation not supported.'));
            }
            // Use getCurrentPosition with a timeout for reliability
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
        
        // If weather API fails, use manual fallback
        console.warn("Weather API lookup failed, falling back to manual mood.");
        return fallbackMood;

    } catch (e) {
        // If Geolocation/network fails, use manual fallback
        console.warn("Geolocation or network failed, falling back to manual mood:", e.message);
        statusMessage.textContent = `Could not auto-detect weather. Using manually selected mood (${fallbackMood}).`;
        return fallbackMood;
    }
};


// --- EVENT LISTENERS ---

const handleLoginClick = () => {
    // CRITICAL FIX: Direct browser navigation to the Vercel endpoint
    window.location = '/api/login'; 
};

const handlePlaylistClick = async () => {
    const accessToken = getAccessToken();
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
            statusMessage.textContent = `❌ Error: ${data.error || 'Failed to generate playlist. Try relogging.'}`;
            if (data.error && data.error.includes('token')) {
                 localStorage.removeItem(CLIENT_STORAGE_KEY);
                 initializeApp();
            }
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        statusMessage.textContent = '❌ Network or server error occurred.';
    } finally {
        getPlaylistButton.disabled = false;
    }
};


// --- Initialization Wrapper ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Assign global variables (CRITICAL for resolving ReferenceErrors)
    controlsDiv = document.getElementById('controls');
    loginButton = document.getElementById('loginButton');
    getPlaylistButton = document.getElementById('getPlaylistButton');
    statusMessage = document.getElementById('statusMessage');
    playlistLinkDiv = document.getElementById('playlistLink');
    playlistLinkAnchor = document.getElementById('playlistLinkAnchor');
    
    // 2. Attach listeners only if elements are found
    if (loginButton && getPlaylistButton) {
        // Attach event handlers using the defined functions
        loginButton.addEventListener('click', handleLoginClick);
        getPlaylistButton.addEventListener('click', handlePlaylistClick);

        // 3. Start the application logic
        initializeApp();
    } else {
        console.error("Initialization Failed: Required HTML elements (loginButton or getPlaylistButton) not found.");
        if (statusMessage) {
            statusMessage.textContent = "Initialization Error. Check console.";
        }
    }
});
