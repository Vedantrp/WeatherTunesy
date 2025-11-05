// api/callback.js
// /api/callback.js
import fetch from 'node-fetch'; // CRITICAL: Required for making the POST request to Spotify
import { URLSearchParams } from 'url'; // Required for building the request body

const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';

export default async (req, res) => {
    try {
        const code = req.query.code || null;
        const client_id = process.env.SPOTIFY_CLIENT_ID;
        const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
        const redirect_uri = process.env.REDIRECT_URI;
        const frontendUrl = process.env.FRONTEND_URL || '/'; 

        if (code === null || !client_id || !client_secret || !redirect_uri) {
            const error = req.query.error || 'token_exchange_failed';
            return res.redirect(`${frontendUrl}?error=${encodeURIComponent(error)}`);
        }

        // CRITICAL: Basic Auth header encoding
      // api/callback.js (Inside the export default async handler)

// ... variable loading (client_id, client_secret, etc.) must be defined here ...

// CRITICAL FIX: Ensure Buffer is used correctly for Basic Auth
const authHeader = 'Basic ' + Buffer.from(`${client_id}:${client_secret}`).toString('base64');
        
        const bodyParams = new URLSearchParams();
        bodyParams.append('code', code);
        bodyParams.append('redirect_uri', redirect_uri);
        bodyParams.append('grant_type', 'authorization_code');

        const tokenResponse = await fetch(TOKEN_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: bodyParams.toString()
        });

        const data = await tokenResponse.json();

        if (tokenResponse.ok) {
            // Success: Redirect to frontend with tokens in the URL hash
            const redirectParams = new URLSearchParams({
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                expires_in: data.expires_in
            });

            return res.redirect(`${frontendUrl}#${redirectParams.toString()}`);

        } else {
            console.error('Spotify Token Exchange Error:', data);
            const error = data.error_description || data.error || 'token_exchange_failed';
            return res.redirect(`${frontendUrl}?error=${encodeURIComponent(error)}`);
        }

    } catch (error) {
        console.error('Callback network error:', error);
        return res.status(500).send(`Callback Crash: ${error.message}.`);
    }
};
