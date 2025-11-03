const API_BASE_URL = window.location.origin;

// Elements
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const searchBtn = document.getElementById("searchBtn");
const createPlaylistBtn = document.getElementById("createPlaylistBtn");
const loadingEl = document.getElementById("loading");
const errorEl = document.getElementById("error");
const playlistSection = document.getElementById("aiPlaylistSection");
const aiSongList = document.getElementById("aiSongList");
const userNameEl = document.getElementById("userName");
const userInfoEl = document.getElementById("userInfo");
const authStatusEl = document.getElementById("authStatus");

let spotifyAccessToken = null;
let currentUser = null;

// =======================
// AUTHENTICATION
// =======================
loginBtn.addEventListener("click", async () => {
  const SPOTIFY_CLIENT_ID = "YOUR_SPOTIFY_CLIENT_ID";
  const REDIRECT_URI = `${API_BASE_URL}/api/callback`;
  const scope = "playlist-modify-public playlist-modify-private user-read-email";

  const authUrl = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=${encodeURIComponent(scope)}`;

  const popup = window.open(authUrl, "spotifyLogin", "width=500,height=600");

  window.addEventListener("message", (event) => {
    if (event.data.type === "SPOTIFY_AUTH_SUCCESS") {
      spotifyAccessToken = event.data.token;
      currentUser = event.data.user;
      userNameEl.textContent = `👋 ${currentUser.display_name}`;
      userInfoEl.classList.remove("hidden");
      loginBtn.classList.add("hidden");
      console.log("✅ Spotify connected!");
    }
  });
});

logoutBtn.addEventListener("click", () => {
  spotifyAccessToken = null;
  currentUser = null;
  userInfoEl.classList.add("hidden");
  loginBtn.classList.remove("hidden");
  console.log("🚪 Logged out");
});

// =======================
// HELPERS
// =======================
function showLoading(state) {
  loadingEl.classList.toggle("hidden", !state);
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
  setTimeout(() => errorEl.classList.add("hidden"), 5000);
}

// =======================
// FETCH AI PLAYLIST
// =======================
async function fetchAiPlaylist(mood, language) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/ai-playlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood, language }),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("Invalid JSON returned from AI API:", text);
      throw new Error("AI playlist generation failed");
    }

    if (!res.ok) {
      throw new Error(data?.error || "AI playlist generation failed");
    }

    return data.playlist || [];
  } catch (e) {
    console.error("AI Playlist Error:", e);
    showError(e.message || "AI playlist could not be created.");
    return [];
  }
}

// =======================
// DISPLAY RESULTS
// =======================
function displayPlaylistSuggestion(data, aiSongs) {
  playlistSection.classList.remove("hidden");
  aiSongList.innerHTML = "";

  aiSongs.forEach((song) => {
    const li = document.createElement("li");
    li.textContent = `${song.title} — ${song.artist}`;
    aiSongList.appendChild(li);
  });

  document.getElementById("createPlaylistBtn").disabled = aiSongs.length === 0;
}

// =======================
// HANDLE SEARCH
// =======================
async function handleSearch() {
  const location = document.getElementById("locationInput").value.trim();
  const language = document.getElementById("languageSelect").value;
  const activity = document.getElementById("activitySelect").value;

  if (!location) {
    showError("Please enter a location.");
    return;
  }

  showLoading(true);

  try {
    // Get weather + mood
    const res = await fetch(`${API_BASE_URL}/api/weather-playlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location, language, activity }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Weather fetch failed");

    const mood = data?.mood || "relaxed";
    console.log("Detected mood:", mood);

    // Get AI playlist
    const aiSongs = await fetchAiPlaylist(mood, language);
    console.log("AI Songs:", aiSongs);

    if (aiSongs.length === 0) {
      showError("No songs generated for this mood/language.");
      return;
    }

    displayPlaylistSuggestion(data, aiSongs);
  } catch (error) {
    console.error("Search failed:", error);
    showError(error.message || "Something went wrong fetching playlist.");
  } finally {
    showLoading(false);
  }
}

searchBtn.addEventListener("click", handleSearch);

// =======================
// CREATE PLAYLIST
// =======================
createPlaylistBtn.addEventListener("click", async () => {
  try {
    const aiSongs = Array.from(aiSongList.children).map((li) => li.textContent);
    if (!spotifyAccessToken || aiSongs.length === 0) {
      showError("You must log in and generate songs first!");
      return;
    }

    const res = await fetch(`${API_BASE_URL}/api/create-playlist`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${spotifyAccessToken}`,
      },
      body: JSON.stringify({
        userId: currentUser?.id,
        songs: aiSongs,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Playlist creation failed");

    document.getElementById("createdPlaylist").classList.remove("hidden");
    document.getElementById("playlistLink").href = data.url;
  } catch (error) {
    console.error("Playlist creation error:", error);
    showError("Could not create playlist on Spotify.");
  }
});
