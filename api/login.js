// /api/login.js (The fix)

export default (req, res) => {
    // 1. Define your client ID, scopes, and redirect URI (ensure these are loaded from env vars)
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const redirect_uri = process.env.REDIRECT_URI; // Make sure this is set

    const state = generateRandomString(16); // A function you should have for CSRF protection
    const scope = 'user-read-private user-read-email playlist-modify-public playlist-modify-private';
    
    // 2. Construct the full Spotify auth URL
    // CORRECT SPOTIFY BASE URL
const SPOTIFY_AUTH_URL = 'http://googleusercontent.com/spotify.com/6'; 

const authUrl = SPOTIFY_AUTH_URL + 
    '?response_type=code' + // Spotify requires this
    '&client_id=' + client_id + 
    // ... rest of the parameters
        (scope ? '&scope=' + encodeURIComponent(scope) : '') +
        '&redirect_uri=' + encodeURIComponent(redirect_uri) +
        '&state=' + state;

    // 3. CRITICAL FIX: Use res.redirect() to send the user to Spotify
    res.redirect(authUrl); // <-- This sends a 302 Found response to the browser

    // NOTE: Do not return anything after res.redirect() unless it's a guard clause.
};

// You'll still need your helper function for state generation
const generateRandomString = (length) => {
    // ... (Your existing implementation for random string generation)
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};
