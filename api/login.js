// api/login.js

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/api/token\',\\n-'; 
// ... generateRandomString function remains ...

export default (req, res) => {
    // ... variable loading and state generation remain ...
    
    // CRITICAL: Ensure correct base URL and response type
    const authUrl = SPOTIFY_AUTH_URL + 
        '?response_type=code' + 
        '&client_id=' + client_id +
        '&scope=' + encodeURIComponent(scope) +
        '&redirect_uri=' + encodeURIComponent(redirect_uri) +
        '&state=' + state;

    res.redirect(authUrl); // FIX: Sends user to Spotify, not JSON
};
