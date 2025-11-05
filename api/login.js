// api/login.js

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/api/token\',\\n-'; 
// ... generateRandomString function remains ...

// api/login.js (Fix for 500 Crash)

// ... existing code ...

export default (req, res) => {
    // FIX: Get variables from Vercel process environment
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const redirect_uri = process.env.REDIRECT_URI; 

    // CRITICAL: Check for missing variables and crash safely
    if (!client_id || !redirect_uri) {
        console.error("CONFIGURATION ERROR: Missing SPOTIFY_CLIENT_ID or REDIRECT_URI.");
        // Return a 500 response *before* attempting to construct the URL
        return res.status(500).send('Configuration Error: Spotify credentials or redirect URI are missing from the server environment.');
    }
    
    // ... rest of the authUrl construction and redirect logic ...
    
    // If variables exist, this code runs:
    res.redirect(authUrl); 
};
