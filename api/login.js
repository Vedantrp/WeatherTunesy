// api/login.js (FIXED: Redirects instead of returning JSON)
const generateRandomString = (length) => {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/api/token\',\\n-'; 

export default (req, res) => {
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const redirect_uri = process.env.REDIRECT_URI; 

    if (!client_id || !redirect_uri) {
        return res.status(500).send('Configuration Error: Credentials missing.');
    }
    
    const state = generateRandomString(16);
    const scope = 'user-read-private user-read-email playlist-modify-public playlist-modify-private';
    
    const authUrl = SPOTIFY_AUTH_URL + 
        '?response_type=code' + 
        '&client_id=' + client_id +
        '&scope=' + encodeURIComponent(scope) +
        '&redirect_uri=' + encodeURIComponent(redirect_uri) +
        '&state=' + state;

    res.redirect(authUrl); // CRITICAL: Redirect the user
};
