// api/callback.js (Ensure variables are defined at the top of the handler)
// ... imports and TOKEN_ENDPOINT remain ...

export default async (req, res) => {
    // 1. Get code and state from Spotify's redirect query parameters
    const code = req.query.code || null;
    const state = req.query.state || null;

    // 2. Load and define all variables FIRST. 
    // This definition MUST happen inside the handler.
    const client_id = process.env.SPOTIFY_CLIENT_ID; // This must be line 1 or 2 of variable declarations
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirect_uri = process.env.REDIRECT_URI;
    const frontendUrl = process.env.FRONTEND_URL || '/'; 

    // 3. Perform necessary checks/logic before use
    if (!client_id || !client_secret || !redirect_uri) {
        return res.status(500).send('Configuration Error: Spotify Client/Secret or Redirect URI missing.');
    }
    
    // ... the rest of the token exchange logic follows ...
    
    // Basic Auth preparation (uses client_id and client_secret defined above)
    const authHeader = 'Basic ' + Buffer.from(`${client_id}:${client_secret}`).toString('base64');
    
    // ...
};
