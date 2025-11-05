import fetch from 'node-fetch'; // Standard ESM import
import { URLSearchParams } from 'url';

const OPENWEATHER_ENDPOINT = 'http://googleusercontent.com/api.openweathermap.org/11';

const weatherToMood = (weatherMain) => {
    const main = weatherMain.toLowerCase();
    
    if (main.includes('clear') || main.includes('sun')) return 'sunny';
    if (main.includes('rain') || main.includes('drizzle')) return 'rainy';
    if (main.includes('thunderstorm') || main.includes('squall')) return 'stormy';
    if (main.includes('snow')) return 'snow';
    if (main.includes('cloud') || main.includes('mist') || main.includes('haze')) return 'gloomy';
    
    return 'sunny';
};


export default async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).send('Method Not Allowed');
    }

    const lat = req.query.lat;
    const lon = req.query.lon;
    const apiKey = process.env.WEATHER_API_KEY;

    if (!lat || !lon || !apiKey) {
        return res.status(400).json({ error: 'Missing coordinates or API key configuration.' });
    }

    try {
        // fetch is now imported directly via ESM syntax
        const weatherUrl = `${OPENWEATHER_ENDPOINT}?lat=${lat}&lon=${lon}&appid=${apiKey}`;
        
        const weatherResponse = await fetch(weatherUrl);
        const weatherData = await weatherResponse.json();
        
        if (weatherResponse.ok && weatherData.weather && weatherData.weather.length > 0) {
            const weatherCondition = weatherData.weather[0].main;
            const mood = weatherToMood(weatherCondition);
            
            return res.status(200).json({ 
                mood: mood,
                condition: weatherCondition 
            });
        }
        
        return res.status(500).json({ error: 'Failed to fetch weather data.' });

    } catch (error) {
        console.error('Weather API Error:', error);
        return res.status(500).json({ error: 'Internal server error while fetching weather.' });
    }
};
