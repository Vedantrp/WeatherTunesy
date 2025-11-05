// api/callback.js (FIXED: Exchanges code via Basic Auth and redirects with tokens in hash)
import fetch from 'node-fetch';
import { URLSearchParams } from 'url';

const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';

export default async (req, res) => {
    const code = req.query.code || null;
    
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirect_uri = process.env.REDIRECT_URI;
    const frontendUrl = process.env.FRONTEND_URL || '/'; 

    if (code === null) {
        const error = req.query.error || 'unknown_error';
        return res.redirect(`${frontendUrl}?error=${error}`);
    }

    // Basic Auth preparation
    const authHeader = 'Basic ' + Buffer.from(`${client_id}:${client_secret}`).toString('base64');
    
    // Request body preparation
    const bodyParams = new URLSearchParams();
    bodyParams.append('code', code);
    bodyParams.append('redirect_uri', redirect_uri);
    bodyParams.append('grant_type', 'authorization_code');

    try {
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
            // Redirect to frontend with tokens in the URL hash
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
        return res.redirect(`${frontendUrl}?error=network_error`);
    }
};
