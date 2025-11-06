// api/get-weather.js
import fetch from 'node-fetch';

const OPENWEATHER_ENDPOINT = 'https://api.openweathermap.org/data/2.5/weather';

const weatherToMood = (weatherMain) => {
    const main = weatherMain.toLowerCase();
    
    if (main.includes('clear') || main.includes('sun')) return 'sunny';
    if (main.includes('rain') || main.includes('drizzle')) return 'rainy';
    if (main.includes('thunderstorm') || main.includes('squall')) return 'stormy';
    if (main.includes('snow')) return 'snow';
    if (main.includes('cloud') || main.includes('mist') || main.includes('haze')) return 'gloomy';
    
    return 'sunny'; // Default fallback
};

export default async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).send('Method Not Allowed');
    }

    // CRITICAL FIX: Read the 'city' from the query
    const city = req.query.city;
    const apiKey = process.env.WEATHER_API_KEY;

    if (!city) {
        return res.status(400).json({ error: 'Missing query parameter: city' });
    }
    
    if (!apiKey) {
        return res.status(500).json({ error: 'Server configuration error: WEATHER_API_KEY is missing.' });
    }

    try {
        // CRITICAL FIX: Use the 'q=' parameter for city name
        const weatherUrl = `${OPENWEATHER_ENDPOINT}?q=${city}&appid=${apiKey}`;
        
        const weatherResponse = await fetch(weatherUrl);
        const weatherData = await weatherResponse.json();
        
        if (!weatherResponse.ok) {
             return res.status(weatherData.cod || 500).json({ error: weatherData.message || 'Failed to fetch weather data.' });
        }

        if (weatherData.weather && weatherData.weather.length > 0) {
            const weatherCondition = weatherData.weather[0].main;
            const mood = weatherToMood(weatherCondition);
            
            return res.status(200).json({ 
                mood: mood,
                condition: weatherCondition 
            });
        }
        
        return res.status(500).json({ error: 'Weather data format unexpected.' });

    } catch (error) {
        console.error('Weather API Error:', error);
        return res.status(500).json({ error: 'Internal server error while fetching weather.' });
    }
};
