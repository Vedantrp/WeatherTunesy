// api/login.js (The complete, fixed file)

// Helper function to generate a random string for CSRF state
const generateRandomString = (length) => {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};


// 🚨 WARNING: The Spotify Authorization URL placeholder should be 'https://accounts.spotify.com/api/token\',\\n-'
// Using a random number like '28' will lead to a 404 error later.
const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/api/token\',\\n-'; 

export default (req, res) => {
    // 1. Get variables from Vercel process environment
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const redirect_uri = process.env.REDIRECT_URI; 

    // 2. CRITICAL: Check for missing variables and crash safely
    if (!client_id || !redirect_uri) {
        console.error("CONFIGURATION ERROR: Missing SPOTIFY_CLIENT_ID or REDIRECT_URI.");
        return res.status(500).send('Configuration Error: Spotify credentials or redirect URI are missing from the server environment.');
    }
    
    // 3. Construct the URL components
    const state = generateRandomString(16); // ✅ Function is now defined and won't crash
    const scope = 'user-read-private user-read-email playlist-modify-public playlist-modify-private';
    
    // 4. Build the final authorization URL
    const authUrl = SPOTIFY_AUTH_URL + 
        '?response_type=code' + 
        '&client_id=' + client_id +
        '&scope=' + encodeURIComponent(scope) +
        '&redirect_uri=' + encodeURIComponent(redirect_uri) +
        '&state=' + state;

    // 5. CRITICAL: Redirect the user to Spotify
    res.redirect(authUrl); 
};
