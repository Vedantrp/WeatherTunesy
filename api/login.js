// /api/login.js

const SPOTIFY_AUTH_URL = 'http://googleusercontent.com/spotify.com/6'; 

// Helper function (ensure this is present)
const generateRandomString = (length) => {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};


export default (req, res) => {
    // Load environment variables
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const redirect_uri = process.env.REDIRECT_URI; 

    // Guard clauses for missing environment variables
    if (!client_id || !redirect_uri) {
        return res.status(500).send('Server Error: SPOTIFY_CLIENT_ID or REDIRECT_URI is missing from environment configuration.');
    }
    
    const state = generateRandomString(16);
    // Add response_type=code as required by Spotify
    const scope = 'user-read-private user-read-email playlist-modify-public playlist-modify-private';
    
    const authUrl = SPOTIFY_AUTH_URL + 
        '?response_type=code' + 
        '&client_id=' + client_id +
        '&scope=' + encodeURIComponent(scope) +
        '&redirect_uri=' + encodeURIComponent(redirect_uri) +
        '&state=' + state;

    // CRITICAL FIX: The redirect itself
    res.redirect(authUrl); 
};
