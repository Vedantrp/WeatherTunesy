// api/callback.js
// ... imports and endpoints remain ...

export default async (req, res) => {
    // ... variable loading and code/state checks remain ...
    
    // CRITICAL FIX: Ensure Basic Auth encoding is correct
    const authHeader = 'Basic ' + Buffer.from(`${client_id}:${client_secret}`).toString('base64');
    
    // ... bodyParams construction remains ...
    
    try {
        // ... fetch request to TOKEN_ENDPOINT remains ...
        
        if (tokenResponse.ok) {
            // CRITICAL FIX: Tokens passed in hash to prevent XSS/storage errors
            const redirectParams = new URLSearchParams({ /* ... tokens ... */ });
            return res.redirect(`${frontendUrl}#${redirectParams.toString()}`);

        } else {
            // Detailed error handling for zero token returns
            console.error('Spotify Token Exchange Error:', data);
            const error = data.error_description || data.error || 'token_exchange_failed';
            return res.redirect(`${frontendUrl}?error=${encodeURIComponent(error)}`);
        }

    } catch (error) {
        // ... network error handling remains ...
    }
};
