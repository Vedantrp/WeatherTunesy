async function loginWithSpotify() {
  try {
    const r = await fetch(`${API_BASE_URL}/api/login`);
    if (!r.ok) throw new Error("Failed to request login URL");
    const { authUrl } = await r.json();
    const popup = window.open(authUrl, "SpotifyLogin", "width=500,height=700");

    // listen for popup messages
    function onMessage(e) {
      if (!e.data) return;
      if (e.data.type === "SPOTIFY_AUTH_SUCCESS") {
        spotifyAccessToken = e.data.token;
        // optionally set refreshToken = e.data.refreshToken
        currentUser = e.data.user;
        // persist locally
        localStorage.setItem("spotifyAccessToken", spotifyAccessToken);
        localStorage.setItem("spotifyUser", JSON.stringify(currentUser));
        updateAuthUI();
        window.removeEventListener("message", onMessage);
        popup?.close();
      } else if (e.data.type === "SPOTIFY_AUTH_ERROR") {
        showError("Spotify auth failed");
        window.removeEventListener("message", onMessage);
        popup?.close();
      }
    }
    window.addEventListener("message", onMessage);
  } catch (err) {
    console.error("loginWithSpotify error:", err);
    showError("Login failed: " + (err.message || err));
  }
}
