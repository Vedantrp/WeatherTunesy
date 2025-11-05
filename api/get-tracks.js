// api/get-tracks.js (FIXED: Robust search, minimum track count, playlist creation, URL return)
import fetch from 'node-fetch';

// Helper function for mapping mood/language to Spotify parameters
const getSearchParams = (mood, language) => {
    let q = '';
    let market = 'US';
    let seed_genres = '';

    // Language Mapping and Market
    switch (language.toLowerCase()) {
        case 'hindi': q = 'Bollywood top'; market = 'IN'; break;
        case 'punjabi': q = 'Punjabi Pop'; market = 'IN'; break;
        case 'japanese': q = 'J-Pop'; market = 'JP'; break;
        case 'korean': q = 'K-Pop'; market = 'KR'; break;
        case 'spanish': q = 'Latin Pop'; market = 'ES'; break;
        // Add more languages here...
        default: q = 'Global hits'; market = 'US'; break; // English, French, German, Italian, Chinese fallback
    }

    // Mood Mapping and Genre/Attribute Adjustment
    switch (mood.toLowerCase()) {
        case 'sunny':
        case 'clear':
            q += ' happy upbeat';
            seed_genres = 'pop,dance';
            break;
        case 'rainy':
        case 'gloomy':
            q += ' chill relaxing';
            seed_genres = 'jazz,lo-fi,indie';
            break;
        case 'stormy':
        case 'snow':
            q += ' dramatic intense';
            seed_genres = 'rock,metal,soundtracks';
            break;
    }

    return { q, market, seed_genres };
};


export default async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const { accessToken, mood, language } = req.body;
        if (!accessToken || !mood || !language) {
            return res.status(400).json({ error: 'Missing required parameters.' });
        }

        const { q, market, seed_genres } = getSearchParams(mood, language);
        const min_tracks_target = 35;


        // --- 1. Fetch Tracks using Search + Recommendations ---
        let tracks = [];

        // Try Search first (up to 50 results)
        const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=50&market=${market}`;
        const searchResponse = await fetch(searchUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        const searchData = await searchResponse.json();
        
        if (searchData.tracks && searchData.tracks.items) {
             tracks = searchData.tracks.items;
        }

        // If not enough tracks, use Recommendations API to fill the gap
        if (tracks.length < min_tracks_target && seed_genres) {
            const recommendationsUrl = `https://developer.spotify.com/documentation/web-api/tutorials/code-flow?seed_genres=${seed_genres}&limit=${min_tracks_target - tracks.length}&market=${market}`;
            const recResponse = await fetch(recommendationsUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
            const recData = await recResponse.json();
            
            if (recData.tracks) {
                tracks = tracks.concat(recData.tracks);
            }
        }
        
        // Remove duplicates and limit to 50
        const uniqueTracks = Array.from(new Map(tracks.map(item => [item.id, item])).values()).slice(0, 50);

        if (uniqueTracks.length < 10) { 
             return res.status(200).json({ error: 'Could not find sufficient tracks for this query.', tracks: [] });
        }
        
        const formattedTracks = uniqueTracks.map(track => ({
            id: track.id,
            uri: track.uri,
            name: track.name,
            artist: track.artists.map(a => a.name).join(', ')
        }));


        // --- 2. Get User ID ---
        const profileResponse = await fetch('https://api.spotify.com/v1/me', { headers: { 'Authorization': `Bearer ${accessToken}` } });
        const profileData = await profileResponse.json();
        const userId = profileData.id;


        // --- 3. Create Playlist ---
        const playlistName = `🎵 ${mood} Mix: ${language} Hits`;
        const description = `A custom playlist generated for your ${mood} weather in ${language}.`;

        const createPlaylistResponse = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: playlistName, description: description, public: false })
        });

        const playlistData = await createPlaylistResponse.json();
        const playlistId = playlistData.id;
        const playlistUrl = playlistData.external_urls.spotify;
        const trackUris = formattedTracks.map(t => t.uri);
        
        
        // --- 4. Add Tracks to Playlist ---
        await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ uris: trackUris })
        });
        
        
        // --- 5. Final Response ---
        return res.status(200).json({
            message: 'Playlist created successfully!',
            playlistUrl: playlistUrl, 
            tracks: formattedTracks
        });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Internal Server Error during playlist creation.' });
    }
};
