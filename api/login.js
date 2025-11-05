// api/login.js - FINAL STABLE CODE WITH CORRECT URL

// Helper function must be defined first
const generateRandomString = (length) => {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};


// 🚨 CRITICAL FIX: Use the correct Authorization endpoint
const SPOTIFY_AUTH_BASE_URL = 'https://accounts.spotify.com/authorize'; 

export default (req, res) => {
    try {
        // Define variables INSIDE the function handler
        const client_id = process.env.SPOTIFY_CLIENT_ID;
        const redirect_uri = process.env.REDIRECT_URI; 
        
        // Configuration Check (Prevents 500 crashes if ENV vars are missing)
        if (!client_id || !redirect_uri) {
            console.error("CONFIGURATION ERROR: Missing SPOTIFY_CLIENT_ID or REDIRECT_URI.");
            return res.status(500).send('Configuration Error: Spotify credentials or redirect URI are missing.');
        }
        
        // Construct URL Components
        const state = generateRandomString(16);
        // Ensure all required scopes are included
        const scope = 'user-read-private user-read-email playlist-modify-public playlist-modify-private';
        
        // Build the final authorization URL
        const authUrl = SPOTIFY_AUTH_BASE_URL + 
            '?response_type=code' +  // REQUIRED by Spotify for this flow
            '&client_id=' + client_id +
            '&scope=' + encodeURIComponent(scope) +
            '&redirect_uri=' + encodeURIComponent(redirect_uri) +
            '&state=' + state;

        // Redirect the user to Spotify
        res.redirect(authUrl); 

    } catch (error) {
        console.error('CRASH IN /api/login.js:', error);
        return res.status(500).send(`Critical Server Crash: ${error.message}.`);
    }
};
