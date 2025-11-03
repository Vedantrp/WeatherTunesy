// WeatherTunes - Frontend Application

// =======================================================================================
// === ENVIRONMENT / API CONFIGURATION (Vercel Fix Applied) ==============================
// =======================================================================================

// Detect API base URL: Dynamically use the current domain (Vercel) and append /api.
const getApiBaseUrl = () => {
    // 💡 FIX: Using window.location.origin dynamically captures the current domain.
    // In production, this resolves to "https://weather-tunes-kappa.vercel.app/api"
    return `${window.location.origin}/api`;
};

const API_BASE_URL = getApiBaseUrl();

// =======================================================================================
// === STATE & DOM ELEMENTS (Unchanged) =================================================
// =======================================================================================

// State
let spotifyAccessToken = null;
let spotifyRefreshToken = null;
let currentUser = null;
let currentWeatherData = null;
let currentMoodData = null;
let currentLanguage = 'english';
let cachedAiSongs = null; // New global variable to store AI songs before creation

// DOM Elements
const locationInput = document.getElementById('locationInput');
const languageSelect = document.getElementById('languageSelect');
const searchBtn = document.getElementById('searchBtn');
const loading = document.getElementById('loading');
const weatherCard = document.getElementById('weatherCard');
const playlistCard = document.getElementById('playlistCard');
const error = document.getElementById('error');
// Local server status elements have been removed for the remote deployment context

// Auth elements
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authStatus = document.getElementById('authStatus');
const userInfo = document.getElementById('userInfo');
const userName = document.getElementById('userName');

// Weather data elements
const cityName = document.getElementById('cityName');
const dateTime = document.getElementById('dateTime');
const temperature = document.getElementById('temperature');
const weatherDescription = document.getElementById('weatherDescription');
const weatherIcon = document.getElementById('weatherIcon');
const feelsLike = document.getElementById('feelsLike');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('windSpeed');

// Playlist elements
const moodType = document.getElementById('moodType');
const playlistSuggestion = document.getElementById('playlistSuggestion');
const genreTags = document.getElementById('genreTags');
const createPlaylistBtn = document.getElementById('createPlaylistBtn');
const createPlaylistText = document.getElementById('createPlaylistText');
const openSpotifyBtn = document.getElementById('openSpotifyBtn');
const createdPlaylist = document.getElementById('createdPlaylist');
const playlistLink = document.getElementById('playlistLink');

// IMPORTANT: Ensure these elements exist in index.html for song display
const aiPlaylistSection = document.getElementById('aiPlaylistSection');
const aiSongList = document.getElementById('aiSongList');


// =======================================================================================
// === HELPER FUNCTIONS (Unchanged) ======================================================
// =======================================================================================

// Helper function to get emoji
function getMoodEmoji(mood) {
    const emojiMap = {
        'upbeat': '☀️', 'cozy': '🌧️', 'relaxed': '☁️', 'balanced': '⛅',
        'calm': '❄️', 'mysterious': '🌫️', 'energetic': '💨', 'intense': '⛈️',
        'tropical': '🌡️', 'warm': '🧊'
    };
    return emojiMap[mood.toLowerCase()] || '🎶';
}


// Format date and time
function formatDateTime(dateString) {
    const date = new Date(dateString);
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
}

// Display weather information
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
    cachedAiSongs = null; // Clear cached songs on logout
}

// Restore auth from localStorage
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


// Refresh access token if needed
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

// Show error message (modified for remote API)
function showError(message) {
    error.textContent = message;
    error.classList.remove('hidden');
    
    setTimeout(() => {
        error.classList.add('hidden');
    }, 10000); // Show for 10 seconds
}

function hideError() {
    error.classList.add('hidden');
}

// Hide all cards
function hideAll() {
    weatherCard.classList.add('hidden');
    playlistCard.classList.add('hidden');
    error.classList.add('hidden');
}


// Function to display the AI Song List and enable the button
function displayAiSongsAndEnableCreation(songs) {
    // NOTE: aiPlaylistSection and aiSongList are defined globally at the top
    if (!aiPlaylistSection || !aiSongList) return; 
    
    cachedAiSongs = songs; // Cache the songs globally
    aiSongList.innerHTML = songs.map(song => 
        // Display songs in white text inside the black box
        `<li style="color: white;">${song.artist} — ${song.title}</li>`
    ).join('');

    // Ensure the main mood/genre text and tags are visible
    displayPlaylistSuggestion({mood: currentMoodData, spotifySearchUrl: `https://open.spotify.com/search/`});

    // CRITICAL FIX: Remove 'hidden' class to show the song list
    aiPlaylistSection.style.display = 'block'; // Use style property for consistency
    
    playlistCard.classList.remove('hidden');
    
    // The button should only be disabled if not logged in
    if (spotifyAccessToken && currentUser) {
        createPlaylistBtn.disabled = false;
        createPlaylistText.textContent = 'Create Playlist';
    } else {
        createPlaylistBtn.disabled = true;
        createPlaylistText.textContent = 'Login to Create';
    }
    createdPlaylist.classList.add('hidden');
}


// Display playlist suggestion - now uses data from backend's combined response
function displayPlaylistSuggestion(combinedData) {
    const moodData = combinedData.mood;
    const spotifySearchUrl = combinedData.spotifySearchUrl;
    
    // Set global data from the backend
    currentMoodData = moodData; 
    
    moodType.textContent = moodData.type;
    
    // FIX 1: Use backend suggestion text and local emoji helper
    playlistSuggestion.textContent = `${getMoodEmoji(moodData.type)} ${moodData.suggestion}`;
    
    // Display selected language
    const selectedLanguage = languageSelect.options[languageSelect.selectedIndex].text;
    const selectedLanguageText = document.getElementById('selectedLanguageText');
    if (selectedLanguageText) {
        if (currentLanguage !== 'english') {
            selectedLanguageText.textContent = `Language: ${selectedLanguage}`;
            selectedLanguageText.style.display = 'block';
        } else {
            selectedLanguageText.textContent = '';
            selectedLanguageText.style.display = 'none';
        }
    }
    
    // Display genre tags
    genreTags.innerHTML = '';
    moodData.genres.forEach(genre => {
        const tag = document.createElement('span');
        tag.className = 'genre-tag';
        tag.textContent = genre;
        genreTags.appendChild(tag);
    });
    
    // FIX 2: Correct placeholder URL to actual Spotify search URL
    openSpotifyBtn.onclick = () => {
        // Correct placeholder URL: https://open.spotify.com/search/$ -> https://open.spotify.com/search/
        window.open(spotifySearchUrl.replace('https://open.spotify.com/search/$', 'https://open.spotify.com/search/'), '_blank');
    };
    
    // Enable/disable create playlist button based on auth
    if (spotifyAccessToken && currentUser) {
        createPlaylistBtn.disabled = false;
    } else {
        createPlaylistBtn.disabled = true;
    }
    
    createdPlaylist.classList.add('hidden');
    playlistCard.classList.remove('hidden');
}


// =======================================================================================
// === CORE LOGIC FUNCTIONS (Using Dynamic Vercel API_BASE_URL) ==========================
// =======================================================================================

// Handle search (REFACTORED to use backend's combined API)
async function handleSearch() {
    const location = locationInput.value.trim();
    currentLanguage = languageSelect.value || 'english';
    
    if (!location) {
        showError('Please enter a location');
        return;
    }
    
    hideAll();
    loading.classList.remove('hidden');
    
    try {
        // Call the backend's combined API endpoint
        const response = await fetch(`${API_BASE_URL}/weather-playlist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                location: location,
                language: currentLanguage // Pass language to the backend
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch combined weather and playlist data.');
        }
        
        const data = await response.json();
        
        // Adapt the backend's data structure to fit existing display functions
        currentWeatherData = {
            current: { 
                condition: { 
                    text: data.weather.condition, 
                    icon: data.weather.icon
                }, 
                temp_c: data.weather.temperature, 
                feelslike_c: data.weather.feelsLike,
                humidity: data.weather.humidity,
                wind_kph: data.weather.windSpeed
            },
            location: data.weather
        };
        currentMoodData = data.mood;

        // Display weather uses the adapted currentWeatherData structure
        displayWeather(currentWeatherData);
        // --- AI-powered playlist integration (default experience if API key is present) ---
        let aiSongs = null;
        try {
            playlistCard.classList.add('hidden'); // Hide regular suggestion initially
            playlistSuggestion.textContent = 'Curating playlist using AI...';
            aiSongs = await generateAIPlaylist();
            // Display AI playlist if found
            if (aiSongs && aiSongs.length > 0) {
                // Display Mood Text and Genres
                displayPlaylistSuggestion(data); 
                
                // CRITICAL: Display the list of songs and enable the button
                displayAiSongsAndEnableCreation(aiSongs);
                
                return; // AI playlist is shown; skip regular suggestion
            } else {
                // Hide AI section if present and no result
                const aiSection = document.getElementById('aiPlaylistSection');
                if (aiSection) aiSection.style.display = 'none';
            }
        } catch (err) {
            console.warn('AI playlist generation failed (falling back to standard):', err);
        }
        // If no AI playlist or error, fall back to regular playlist suggestion
        displayPlaylistSuggestion(data);
        
    } catch (err) {
        // Generic error handling for a remote fetch failure
        if (err.message.includes('Failed to fetch')) {
            showError('❌ Could not connect to the API server. Please check the network connection.');
        } else {
            showError(`Error: ${err.message}`);
        }
    } finally {
        loading.classList.add('hidden');
    }
}

// Spotify Authentication Functions
async function loginWithSpotify() {
    try {
        // 1. Asynchronously fetch the actual Spotify redirect URL from the backend
        const authUrlResponse = await fetch(`${API_BASE_URL}/login`); 
        
        if (!authUrlResponse.ok) {
             throw new Error("Could not retrieve authorization URL. Check the backend function logs.");
        }
        
        const data = await authUrlResponse.json();
        const authUrl = data.authUrl; // This contains the final Spotify redirect URL
        
        // 2. Open the popup directly with the fetched URL
        const width = 500;
        const height = 700;
        const left = (window.innerWidth - width) / 2;
        const top = (window.innerHeight - height) / 2;
        
        const popup = window.open(
            authUrl, // Open pop-up with the destination URL immediately
            'Spotify Login',
            `width=${width},height=${height},left=${left},top=${top}`
        );
        
        if (!popup) {
             showError('Browser blocked the popup window. Please allow popups for this site.');
             return;
        }
        
        // 3. Start listening for the response message
        const messageListener = (event) => {
            if (event.data.type === 'SPOTIFY_AUTH_SUCCESS') {
                spotifyAccessToken = event.data.token;
                spotifyRefreshToken = event.data.refreshToken;
                currentUser = event.data.user;
                
                // Save to localStorage
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
        
        // Clean up if popup is closed
        const checkClosed = setInterval(() => {
            if (popup.closed) {
                clearInterval(checkClosed);
                window.removeEventListener('message', messageListener);
            }
        }, 1000);
    } catch (error) {
        showError('Failed to initiate Spotify login: ' + error.message);
    }
}

// Generate AI playlist suggestions
async function generateAIPlaylist() {
    try {
        const weather = currentWeatherData.current.condition.text;
        const mood = currentMoodData.type;
        const genres = currentMoodData.genres;
        const language = languageSelect.options[languageSelect.selectedIndex].text;
        
        const response = await fetch(`${API_BASE_URL}/ai-playlist`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                weather: weather,
                mood: mood,
                genres: genres,
                language: language
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            // If API key is missing, fail silently and let the app fall back to standard search
            if (errorData.error.includes('OpenAI API key not configured')) {
                return null;
            }
            throw new Error(errorData.error || 'Failed to generate AI playlist');
        }

        const data = await response.json();
        return data.songs; // Returns array of {artist, title}
    } catch (error) {
        console.error('AI playlist error:', error);
        return null; // Return null if AI fails, fall back to regular search
    }
}

// Create playlist function with AI enhancement
async function createPlaylist() {
    if (!spotifyAccessToken || !currentUser || !currentWeatherData || !currentMoodData) {
        showError('Please login with Spotify first');
        return;
    }
    
    createPlaylistBtn.disabled = true;
    createPlaylistText.textContent = 'Curating songs...';
    hideError();
    
    try {
        // Try to get AI-generated song suggestions
        let aiSongs = null;
        let allTracks = [];
        
        try {
            createPlaylistText.textContent = 'AI curating playlist...';
            aiSongs = cachedAiSongs || await generateAIPlaylist(); // Use cached songs if available
            
            // If we have AI suggestions, search for those specific songs first
            if (aiSongs && aiSongs.length > 0) {
                createPlaylistText.textContent = 'Finding AI-curated songs...';
                
                // Search for AI-suggested songs specifically (max 30)
                for (const song of aiSongs.slice(0, 30)) {
                    try {
                        const searchQuery = `${song.artist} ${song.title}`;
                        const searchResponse = await fetch(`${API_BASE_URL}/search-tracks`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                accessToken: spotifyAccessToken,
                                query: searchQuery,
                                limit: 1 // Get best match for each song
                            })
                        });
                        
                        if (searchResponse.ok) {
                            const searchData = await searchResponse.json();
                            if (searchData.tracks && searchData.tracks.length > 0) {
                                allTracks.push(searchData.tracks[0]); // Add best match
                            }
                        }
                    } catch (err) {
                        console.error('Error searching for AI song:', song, err);
                    }
                }
            }
        } catch (aiError) {
            console.log('AI generation failed, using standard search:', aiError);
            // Continue with regular search if AI fails
        }
        
        // Build search queries for tracks with language
        const languageMap = {
            'english': '',
            'hindi': 'hindi',
            'spanish': 'spanish',
            'french': 'french',
            'japanese': 'japanese',
            'korean': 'korean',
            'portuguese': 'portuguese',
            'german': 'german',
            'italian': 'italian',
            'chinese': 'chinese',
            'tamil': 'tamil',
            'telugu': 'telugu',
            'punjabi': 'punjabi'
        };
        
        const languageTerm = languageMap[currentLanguage] || '';
        
        // If we still need tracks, supplement with genre searches
        const tracksNeeded = 30 - allTracks.length;
        
        if (tracksNeeded > 0) {
            // Build search queries - focus on actual songs, hits, and popular tracks
            const searchQueries = [];
            
            // Helper function to build song-focused queries
            const buildSongQueries = (genre, mood, lang = '') => {
                const queries = [];
                const langTerm = lang ? `${lang} ` : '';
                
                // Focus on actual songs and popular tracks
                queries.push(`${langTerm}${genre} ${mood} song`);
                queries.push(`${langTerm}${genre} ${mood} hit`);
                queries.push(`${langTerm}${genre} ${mood} popular`);
                
                return queries;
            };
            
            // Add initial genre searches
            currentMoodData.genres.slice(0, 3).forEach(genre => {
                searchQueries.push(...buildSongQueries(genre, currentMoodData.type, languageTerm));
            });
            
            // Add general popular mood songs if language is not set (i.e. English/mixed)
            if (!languageTerm) {
                searchQueries.push(`${currentMoodData.type} songs`);
            } else {
                searchQueries.push(`popular ${languageTerm} ${currentMoodData.type}`);
            }
            
            // Search for additional tracks
            createPlaylistText.textContent = 'Finding more great songs...';
            // Only use a few queries to fill the gap
            for (const query of searchQueries.slice(0, Math.ceil(tracksNeeded / 5))) {
            try {
                const searchResponse = await fetch(`${API_BASE_URL}/search-tracks`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        accessToken: spotifyAccessToken,
                        query: query,
                        limit: Math.min(20, tracksNeeded) // Limit based on what we need
                    })
                });
                
                if (searchResponse.ok) {
                    const searchData = await searchResponse.json();
                    allTracks.push(...searchData.tracks);
                } else if (searchResponse.status === 401) {
                    // Token expired, try to refresh
                    const refreshed = await refreshAccessToken();
                    if (refreshed) {
                        // Retry the search
                        const retryResponse = await fetch(`${API_BASE_URL}/search-tracks`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                accessToken: spotifyAccessToken,
                                query: query,
                                limit: Math.min(20, tracksNeeded)
                            })
                        });
                        
                        if (retryResponse.ok) {
                            const retryData = await retryResponse.json();
                            allTracks.push(...retryData.tracks);
                        }
                    } else {
                        showError('Session expired. Please login again.');
                        logout();
                        return;
                    }
                }
            } catch (err) {
                console.error('Search error:', err);
            }
            }
        }
        
        if (allTracks.length === 0) {
            throw new Error('No tracks found. Please try again.');
        }
        
        // Remove duplicates and prepare final list
        const uniqueTracks = Array.from(
            new Map(allTracks.map(track => [track.uri, track])).values()
        );
        
        // Prioritize tracks by popularity (higher is better)
        uniqueTracks.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        
        // Mix: 70% popular tracks (>20 pop), 30% variety (<=20 pop)
        let finalTracks = [];
        const popularTracks = uniqueTracks.filter(t => (t.popularity || 0) > 20);
        const otherTracks = uniqueTracks.filter(t => (t.popularity || 0) <= 20);
        
        const popularCount = Math.min(Math.floor(30 * 0.7), popularTracks.length);
        const varietyCount = Math.min(30 - popularCount, otherTracks.length);
        
        finalTracks = [
            ...popularTracks.slice(0, popularCount),
            ...otherTracks.slice(0, varietyCount)
        ];
        
        // If still under 30, fill the rest from the top of the unique list
        if (finalTracks.length < 30) {
            const remaining = uniqueTracks.filter(t => 
                !finalTracks.some(ft => ft.uri === t.uri)
            );
            finalTracks.push(...remaining.slice(0, 30 - finalTracks.length));
        }
        
        // Final limit to 30 tracks
        const finalLimitedTracks = finalTracks.slice(0, 30);
        const trackUris = finalLimitedTracks.map(track => track.uri);
        
        if (trackUris.length === 0) {
            throw new Error(`No ${languageTerm ? languageTerm : 'English'} tracks found. Please try a different language or search again.`);
        }
        
        // Create playlist with language info
        createPlaylistText.textContent = `Creating playlist with ${trackUris.length} songs...`;
        const locationName = currentWeatherData.location.name;
        const condition = currentWeatherData.current.condition.text;
        const languageName = languageSelect.options[languageSelect.selectedIndex].text;
        const playlistName = `WeatherTunes: ${condition} in ${locationName} (${languageName})`;
        const description = `${getMoodEmoji(currentMoodData.type)} ${currentMoodData.suggestion} | ${languageName} playlist | Created by WeatherTunes`;
        
        const createResponse = await fetch(`${API_BASE_URL}/create-playlist`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                accessToken: spotifyAccessToken,
                playlistName: playlistName,
                description: description,
                trackUris: trackUris
            })
        });
        
        if (createResponse.status === 401) {
            // Token expired, try to refresh
            const refreshed = await refreshAccessToken();
            if (refreshed) {
                // Retry creation
                const retryResponse = await fetch(`${API_BASE_URL}/create-playlist`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        accessToken: spotifyAccessToken,
                        playlistName: playlistName,
                        description: description,
                        trackUris: trackUris
                    })
                });
                
                if (!retryResponse.ok) {
                    throw new Error('Failed to create playlist');
                }
                
                const playlistData = await retryResponse.json();
                displayCreatedPlaylist(playlistData.playlist);
                return;
            } else {
                showError('Session expired. Please login again.');
                logout();
                return;
            }
        }
        
        if (!createResponse.ok) {
            const errorData = await createResponse.json();
            throw new Error(errorData.error || 'Failed to create playlist');
        }
        
        const playlistData = await createResponse.json();
        displayCreatedPlaylist(playlistData.playlist);
        
    } catch (error) {
        showError(error.message);
        createPlaylistBtn.disabled = false;
        createPlaylistText.textContent = 'Create Playlist';
    }
}

function displayCreatedPlaylist(playlist) {
    playlistLink.href = playlist.url;
    playlistLink.textContent = `Open "${playlist.name}" on Spotify →`;
    createdPlaylist.classList.remove('hidden');
    createPlaylistText.textContent = 'Create Playlist';
    createPlaylistBtn.disabled = true; // Disable after creation to prevent duplicates
}


// =======================================================================================
// === INITIALIZATION & EVENT LISTENERS ==================================================
// =======================================================================================

// Event Listeners
searchBtn.addEventListener('click', handleSearch);
loginBtn.addEventListener('click', loginWithSpotify);
logoutBtn.addEventListener('click', logout);
createPlaylistBtn.addEventListener('click', createPlaylist);

locationInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSearch();
    }
});

// Initialize
restoreAuth();

// Initialize: Get weather for default location (if geolocation available)
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            try {
                // Call the backend endpoint instead of direct weather API
                const response = await fetch(`${API_BASE_URL}/weather-playlist`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ location: `${position.coords.latitude},${position.coords.longitude}` })
                });

                if (!response.ok) {
                    throw new Error('Backend error on geolocation lookup');
                }
                
                const data = await response.json();
                
                // Adapt the backend's data structure to fit existing display functions
                currentWeatherData = {
                    current: { 
                        condition: { 
                            text: data.weather.condition, 
                            icon: data.weather.icon
                        }, 
                        temp_c: data.weather.temperature, 
                        feelslike_c: data.weather.feelsLike,
                        humidity: data.weather.humidity,
                        wind_kph: data.weather.windSpeed
                    },
                    location: data.weather
                };
                currentMoodData = data.mood;
                
                displayWeather(currentWeatherData);
                // --- AI-powered playlist integration (default experience if API key is present) ---
                let aiSongs = null;
                try {
                    playlistCard.classList.add('hidden'); // Hide regular suggestion initially
                    playlistSuggestion.textContent = 'Curating playlist using AI...';
                    aiSongs = await generateAIPlaylist();
                    // Display AI playlist if found
                    if (aiSongs && aiSongs.length > 0) {
                        // Build a visible AI playlist section (add to DOM if not present)
                        let aiSection = document.getElementById('aiPlaylistSection');
                        if (!aiSection) {
                            aiSection = document.createElement('div');
                            aiSection.id = 'aiPlaylistSection';
                            aiSection.className = 'ai-playlist-section';
                            playlistCard.parentNode.insertBefore(aiSection, playlistCard.nextSibling);
                        }
                        aiSection.innerHTML = `<h3>Curated by AI 🎶</h3><ul>${aiSongs.map(song => `<li>${song.artist} — ${song.title}</li>`).join('')}</ul>`;
                        aiSection.style.display = 'block';
                        playlistCard.classList.remove('hidden'); // still show playlist card/moods for fallback
                        return; // AI playlist is shown; skip regular suggestion
                    } else {
                        // Hide AI section if present and no result
                        const aiSection = document.getElementById('aiPlaylistSection');
                        if (aiSection) aiSection.style.display = 'none';
                    }
                } catch (err) {
                    console.warn('AI playlist generation failed (falling back to standard):', err);
                }
                // If no AI playlist or error, fall back to regular playlist suggestion
                displayPlaylistSuggestion(data);
            } catch (err) {
                // Silently fail - user can still search manually
                console.error('Geolocation lookup failed:', err);
            }
        },
        () => {
            // User denied geolocation or it failed
        }
    );
}
