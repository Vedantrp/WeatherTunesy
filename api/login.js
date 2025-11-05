// api/login.js (Ensure the full code is present and in order)

// ... generateRandomString function must be here ...

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/api/token\',\\n-'; 

export default (req, res) => {
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const redirect_uri = process.env.REDIRECT_URI; 
    
    // ... CRITICAL configuration check remains ...

    const state = generateRandomString(16); 
    const scope = 'user-read-private user-read-email playlist-modify-public playlist-modify-private';
    
    // 1. DEFINE authUrl within the function
    const authUrl = SPOTIFY_AUTH_URL + 
        '?response_type=code' + 
        '&client_id=' + client_id +
        '&scope=' + encodeURIComponent(scope) +
        '&redirect_uri=' + encodeURIComponent(redirect_uri) +
        '&state=' + state;

    // 2. Use authUrl immediately after definition
    res.redirect(authUrl); // FIX: This line MUST be inside the export default function
};
