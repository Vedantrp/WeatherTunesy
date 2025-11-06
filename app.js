// app.js

// Wait for the DOM to be fully loaded before running any script
document.addEventListener("DOMContentLoaded", () => {
  console.log("WeatherTunes Loaded ✅");

  // Get elements after DOM is loaded
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
      statusBox.textContent = "Redirecting to Spotify...";
      const res = await fetch("/api/login");
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl; // Redirect to Spotify
      } else {
        alert("Login endpoint failed to return a URL.");
      }
    } catch (e) {
      alert("Login request failed. Check console.");
      console.error(e);
    }
  };

  // --- CRITICAL FIX: Secure Weather Function ---
  // This function now calls YOUR Vercel backend, not OpenWeather.
  async function getWeatherMood(city) {
    // This now correctly calls your new /api/get-weather.js
    const r = await fetch(`/api/get-weather?city=${encodeURIComponent(city)}`);
    const j = await r.json();

    if (!r.ok) {
      throw new Error(j.error || "Weather API failed");
    }

    const weather = j.condition.toLowerCase();

    if (weather.includes("rain")) return "chill";
    if (weather.includes("clear")) return "happy";
    if (weather.includes("cloud")) return "lofi";
    return "mood"; // Default fallback
  }

  // --- Go Button ---
  goBtn.onclick = async () => {
    // Re-check token every time button is clicked
    token = localStorage.getItem("spotify_token");
    if (!token) {
      return alert("Please log in with Spotify first.");
    }

    const city = document.getElementById("cityInput").value;
    if (!city) return alert("Please enter a city name.");

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

  // --- CRITICAL FIX: Handle Spotify Callback ---
  // This logic was missing from your file.
  // It runs when Spotify redirects back to your page with a code.
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');

  if (code) {
    statusBox.textContent = "Logging in, please wait...";
    // Call the /api/callback endpoint to exchange the code for a token
    fetch(`/api/callback?code=${code}`) // Send code as query param
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
          throw new Error("Access token not received from callback");
        }
      })
      .catch((err) => {
        console.error(err);
        statusBox.textContent = `Login failed: ${err.message}`;
      });
  }
});
