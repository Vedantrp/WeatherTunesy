// public/app.js

const parseTokensFromHash = () => {
    const hash = window.location.hash.substring(1);
    if (!hash) return null;

    // FIX: Using URLSearchParams is the safe, modern way to parse tokens, 
    // avoiding the CSP violation
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    
    if (accessToken) {
        localStorage.setItem(CLIENT_STORAGE_KEY, accessToken);
        // Clear hash, essential for subsequent page loads
        history.replaceState(null, '', window.location.pathname); 
        return accessToken;
    }
    return null;
};

// CRITICAL FIX: Ensure all event listeners use .addEventListener, 
// NOT inline HTML attributes like onclick="..."
loginButton.addEventListener('click', () => {
    window.location = '/api/login'; 
});
// getPlaylistButton.addEventListener('click', ...) // also uses addEventListener
// ...
