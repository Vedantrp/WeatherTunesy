console.log("App loaded");

let spotifyToken = null;
let spotifyUser = null;

document.getElementById("loginBtn").onclick = async () => {
  const res = await fetch("/api/login");
  const { authUrl } = await res.json();
  const popup = window.open(authUrl, "Login with Spotify", "width=500,height=600");

  window.addEventListener("message", (e) => {
    if (e.data.type === "SPOTIFY_AUTH") {
      spotifyToken = e.data.accessToken;
      spotifyUser = e.data.user;
      document.getElementById("loginBtn").innerText = "Logged in";
      document.getElementById("userDisplay").innerText =
        `Welcome, ${spotifyUser.display_name}`;
      document.getElementById("getSongsBtn").disabled = false;
    }
  });
};
