// public/app.js

const CLIENT_STORAGE_KEY = 'spotify_access_token';
const controlsDiv = document.getElementById('controls');
const loginButton = document.getElementById('loginButton');
const getPlaylistButton = document.getElementById('getPlaylistButton');
const statusMessage = document.getElementById('statusMessage');
const playlistLinkDiv = document.getElementById('playlistLink');
const playlistLinkAnchor = document.getElementById('playlistLinkAnchor');


// --- TOKEN HANDLER ---
const getAccessToken = () => localStorage.getItem(CLIENT_STORAGE_KEY);

const parseTokensFromHash = () => {
    // Check if the URL hash contains tokens (redirect from /api/callback)
    const hash = window.location.hash.substring(1);
    if (!hash) return null;

    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    
    if (accessToken) {
        localStorage.setItem(CLIENT_STORAGE_KEY, accessToken);
        // Clean the URL hash after storing the token
        window.location.hash = ''; 
        return accessToken;
    }
    return null;
};

const initializeApp = () => {
    let accessToken = parseTokensFromHash() || getAccessToken();
    
    if (accessToken) {
        // User is logged in
        loginButton.style.display = 'none';
        controlsDiv.style.display = 'block';
        statusMessage.textContent = 'Ready to generate your WeatherTune Mix!';
    } else {
        // User needs to log in
        loginButton.style.display = 'block';
        controlsDiv.style.display = 'none';
    }
};


// --- EVENT LISTENERS ---

// 1. Login Button
loginButton.addEventListener('click', () => {
    // CRITICAL: Navigate the browser directly to the API endpoint to initiate the redirect chain
    window.location = '/api/login'; 
});

// 2. Get Playlist Button
getPlaylistButton.addEventListener('click', async () => {
    const accessToken = getAccessToken();
    if (!accessToken) {
        alert("Please log in again.");
        initializeApp();
        return;
    }
    
    const mood = document.getElementById('weatherSelect').value;
    const language = document.getElementById('languageSelect').value;

    statusMessage.textContent = `Generating a ${mood} mix of ${language} music... please wait.`;
    getPlaylistButton.disabled = true;
    playlistLinkDiv.style.display = 'none';


    try {
        const response = await fetch('/api/get-tracks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken, mood, language })
        });

        const data = await response.json();

        if (response.ok && data.playlistUrl) {
            // Success! Update UI with the playlist link
            statusMessage.textContent = 'Playlist generated successfully!';
            
            playlistLinkAnchor.href = data.playlistUrl;
            playlistLinkAnchor.textContent = `Open Your ${mood} Mix (${data.tracks.length} Songs) on Spotify 🎧`;
            playlistLinkDiv.style.display = 'block';

        } else {
            // Handle API errors (e.g., if Spotify token is expired or search failed)
            statusMessage.textContent = `Error: ${data.error || 'Failed to generate playlist. Try logging in again.'}`;
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        statusMessage.textContent = 'Network or server error occurred.';
    } finally {
        getPlaylistButton.disabled = false;
    }
});


// Start the app logic when the page loads
initializeApp();
