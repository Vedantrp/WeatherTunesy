// /api/login.js - FINAL STABLE CODE

// Helper function MUST be defined first to prevent ReferenceError
const generateRandomString = (length) => {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};


// 🚨 CRITICAL: Use the correct Spotify Auth URL placeholder
const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/api/token\',\\n-'; 

export default (req, res) => {
    // 1. **CRITICAL TROUBLESHOOTING WRAPPER**
    try {
        // 2. Define variables INSIDE the function handler
        const client_id = process.env.SPOTIFY_CLIENT_ID;
        const redirect_uri = process.env.REDIRECT_URI; 
        
        // 3. Configuration Check (Handles missing ENV vars gracefully)
        if (!client_id) {
            console.error("CONFIGURATION ERROR: SPOTIFY_CLIENT_ID is missing.");
            return res.status(500).send('Configuration Error: SPOTIFY_CLIENT_ID not found in environment.');
        }
        if (!redirect_uri) {
            console.error("CONFIGURATION ERROR: REDIRECT_URI is missing.");
            return res.status(500).send('Configuration Error: REDIRECT_URI not found in environment.');
        }
        
        // 4. Construct URL Components
        const state = generateRandomString(16); // Will not crash now
        const scope = 'user-read-private user-read-email playlist-modify-public playlist-modify-private';
        
        // 5. Build the final authorization URL (authUrl)
        const authUrl = SPOTIFY_AUTH_URL + 
            '?response_type=code' + 
            '&client_id=' + client_id +
            '&scope=' + encodeURIComponent(scope) +
            '&redirect_uri=' + encodeURIComponent(redirect_uri) +
            '&state=' + state;

        // 6. Redirect the user to Spotify
        res.redirect(authUrl); 

    } catch (error) {
        // 7. General Catch-all for unexpected crashes
        console.error('CRASH IN /api/login.js:', error);
        return res.status(500).send(`Critical Server Crash: ${error.message}. Check Vercel logs.`);
    }
};
