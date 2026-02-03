#!/usr/bin/env node
/**
 * Weather Tool - Uses Open-Meteo API (free, no key needed)
 * 
 * Usage:
 *   node weather.js "Sydney"
 *   node weather.js "New York" --forecast
 *   node weather.js --lat -33.87 --lon 151.21
 */

const https = require('https');

// Geocoding API (free)
async function getCoordinates(city) {
  return new Promise((resolve, reject) => {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const json = JSON.parse(data);
        if (json.results && json.results[0]) {
          resolve({
            lat: json.results[0].latitude,
            lon: json.results[0].longitude,
            name: json.results[0].name,
            country: json.results[0].country
          });
        } else {
          reject(new Error(`City not found: ${city}`));
        }
      });
    }).on('error', reject);
  });
}

// Weather API (free)
async function getWeather(lat, lon, forecast = false) {
  return new Promise((resolve, reject) => {
    const params = forecast
      ? 'daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=auto'
      : 'current=temperature_2m,relative_humidity_2m,precipitation,weathercode,wind_speed_10m&timezone=auto';
    
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&${params}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve(JSON.parse(data));
      });
    }).on('error', reject);
  });
}

// Weather codes to descriptions
const weatherCodes = {
  0: '☀️ Clear sky',
  1: '🌤️ Mainly clear',
  2: '⛅ Partly cloudy',
  3: '☁️ Overcast',
  45: '🌫️ Foggy',
  48: '🌫️ Depositing rime fog',
  51: '🌧️ Light drizzle',
  53: '🌧️ Moderate drizzle',
  55: '🌧️ Dense drizzle',
  61: '🌧️ Slight rain',
  63: '🌧️ Moderate rain',
  65: '🌧️ Heavy rain',
  71: '🌨️ Slight snow',
  73: '🌨️ Moderate snow',
  75: '🌨️ Heavy snow',
  77: '🌨️ Snow grains',
  80: '🌧️ Slight rain showers',
  81: '🌧️ Moderate rain showers',
  82: '🌧️ Violent rain showers',
  85: '🌨️ Slight snow showers',
  86: '🌨️ Heavy snow showers',
  95: '⛈️ Thunderstorm',
  96: '⛈️ Thunderstorm with slight hail',
  99: '⛈️ Thunderstorm with heavy hail'
};

async function main() {
  const args = process.argv.slice(2);
  
  let city = null;
  let lat = null;
  let lon = null;
  let forecast = false;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--lat') lat = parseFloat(args[++i]);
    else if (args[i] === '--lon') lon = parseFloat(args[++i]);
    else if (args[i] === '--forecast' || args[i] === '-f') forecast = true;
    else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
Weather Tool (Open-Meteo - free, no API key)

Usage:
  node weather.js "City Name"           Current weather
  node weather.js "City" --forecast     7-day forecast
  node weather.js --lat 40.7 --lon -74  By coordinates

Examples:
  node weather.js "Sydney"
  node weather.js "Tokyo" --forecast
`);
      return;
    }
    else city = args[i];
  }
  
  if (!city && (!lat || !lon)) {
    console.error('Usage: node weather.js "City Name" [--forecast]');
    process.exit(1);
  }
  
  try {
    // Get coordinates if city provided
    let location = { lat, lon, name: 'Custom location' };
    if (city) {
      location = await getCoordinates(city);
    }
    
    // Get weather
    const weather = await getWeather(location.lat, location.lon, forecast);
    
    console.log(`\n📍 ${location.name}${location.country ? ', ' + location.country : ''}\n`);
    
    if (forecast && weather.daily) {
      console.log('7-Day Forecast:\n');
      for (let i = 0; i < weather.daily.time.length; i++) {
        const date = new Date(weather.daily.time[i]).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const high = Math.round(weather.daily.temperature_2m_max[i]);
        const low = Math.round(weather.daily.temperature_2m_min[i]);
        const precip = weather.daily.precipitation_sum[i];
        const code = weather.daily.weathercode[i];
        const desc = weatherCodes[code] || 'Unknown';
        
        console.log(`  ${date}: ${desc}`);
        console.log(`    High: ${high}°C / Low: ${low}°C${precip > 0 ? ` / Rain: ${precip}mm` : ''}`);
      }
    } else if (weather.current) {
      const c = weather.current;
      const desc = weatherCodes[c.weathercode] || 'Unknown';
      
      console.log(`${desc}`);
      console.log(`🌡️  Temperature: ${Math.round(c.temperature_2m)}°C`);
      console.log(`💧 Humidity: ${c.relative_humidity_2m}%`);
      console.log(`💨 Wind: ${Math.round(c.wind_speed_10m)} km/h`);
      if (c.precipitation > 0) {
        console.log(`🌧️  Precipitation: ${c.precipitation}mm`);
      }
    }
    
    console.log('');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
