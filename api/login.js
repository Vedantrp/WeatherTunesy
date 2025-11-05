// api/login.js

// Must be defined here to prevent "ReferenceError: generateRandomString is not defined"
const generateRandomString = (length) => {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

// CRITICAL FIX: Use the correct Authorization endpoint
const SPOTIFY_AUTH_BASE_URL = 'https://accounts.spotify.com/authorize'; 

export default (req, res) => {
    try {
        const client_id = process.env.SPOTIFY_CLIENT_ID;
        const redirect_uri = process.env.REDIRECT_URI;
        
        if (!client_id || !redirect_uri) {
            console.error("CONFIGURATION ERROR: Missing credentials.");
            return res.status(500).send('Configuration Error: Spotify Client ID or Redirect URI are missing.');
        }
        
        const state = generateRandomString(16);
        const scope = 'user-read-private user-read-email playlist-modify-public playlist-modify-private';
        
        // Build the final authorization URL
        const authUrl = SPOTIFY_AUTH_BASE_URL + 
            '?response_type=code' + 
            '&client_id=' + client_id +
            '&scope=' + encodeURIComponent(scope) +
            '&redirect_uri=' + encodeURIComponent(redirect_uri) +
            '&state=' + state;

        res.redirect(authUrl); 

    } catch (error) {
        console.error('CRASH IN /api/login.js:', error);
        // This catch block prevents the generic Vercel 500 HTML
        return res.status(500).send(`Critical Server Crash: ${error.message}.`);
    }
};
