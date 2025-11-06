// app.js

// Wait for the DOM to be fully loaded before running any script
document.addEventListener("DOMContentLoaded", () => {
  console.log("WeatherTunes Loaded ✅");

  const loginBtn = document.getElementById("loginBtn");
  const goBtn = document.getElementById("goBtn");
  const userBox = document.getElementById("user");
  const playlistLink = document.getElementById("playlistLink");
  const statusBox = document.getElementById("status");

  let token = localStorage.getItem("spotify_token");

  if (token) {
    userBox.innerText = "Logged in ✅";
  }

  // --- Login Button ---
  loginBtn.onclick = async () => {
    try {
      const res = await fetch("/api/login");
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        alert("Login endpoint failed to return a URL.");
      }
    } catch (e) {
      alert("Login request failed. Check console.");
      console.error(e);
    }
  };

  // --- CRITICAL FIX: Secure Weather Function ---
  // This function now calls YOUR Vercel backend, not OpenWeather directly.
  async function getWeatherMood(city) {
    // We don't have lat/lon, so we must pass the city to the backend.
    // NOTE: Your /api/get-weather.js currently only accepts lat/lon.
    // We will use a different OpenWeather endpoint that accepts a city query (q).
    
    // For this to work, you MUST update /api/get-weather.js to handle a 'city' query.
    // I will provide that file next. For now, this is the frontend call.
    
    // We will assume /api/get-weather.js is updated to accept ?city=...
    const r = await fetch(`/api/get-weather?city=${encodeURIComponent(city)}`);
    const j = await r.json();

    if (!r.ok) {
      throw new Error(j.error || "Weather API failed");
    }

    const weather = j.condition.toLowerCase();

    if (weather.includes("rain")) return "chill";
    if (weather.includes("clear")) return "happy";
    if (weather.includes("cloud")) return "lofi";
    return "mood";
  }

  // --- Go Button ---
  goBtn.onclick = async () => {
    if (!token) {
      // Re-check token in case it expired
      token = localStorage.getItem("spotify_token");
      if (!token) return alert("Login first");
    }

    const city = document.getElementById("cityInput").value;
    if (!city) return alert("Enter city");

    try {
      statusBox.textContent = "Getting weather...";
      const mood = await getWeatherMood(city);

      statusBox.textContent = "Fetching songs...";
      const res = await fetch("/api/get-songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, mood }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get songs");

      statusBox.textContent = "Creating playlist...";
      const res2 = await fetch("/api/create-playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, tracks: data.tracks }),
      });

      const out = await res2.json();
      if (!res2.ok) throw new Error(out.error || "Failed to create playlist");

      playlistLink.href = out.url;
      playlistLink.textContent = "Open Playlist 🎧";
      statusBox.textContent = "Done ✅";

    } catch (error) {
      console.error(error);
      statusBox.textContent = `Error: ${error.message}`;
    }
  };

  // --- Handle Spotify Callback ---
  // This runs when Spotify redirects back to your page with a code
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');

  if (code) {
    statusBox.textContent = "Logging in...";
    // Call the /api/callback endpoint to exchange the code for a token
    fetch("/api/callback" + window.location.search) // sends ?code=...
      .then((res) => {
        if (!res.ok) throw new Error("Callback request failed");
        return res.json();
      })
      .then((data) => {
        if (data.accessToken) {
          localStorage.setItem("spotify_token", data.accessToken);
          // Redirect to the home page to clean the URL
          window.location.href = "/";
        } else {
          throw new Error("Access token not received");
        }
      })
      .catch((err) => {
        console.error(err);
        statusBox.textContent = `Login failed: ${err.message}`;
      });
  }
});
