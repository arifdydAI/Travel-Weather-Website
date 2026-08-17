const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5001;
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const OPENWEATHER_BASE = 'https://api.openweathermap.org/data/2.5';
const API_KEY = process.env.OPENWEATHER_API_KEY;

function loadDestinations() {
  const filePath = path.join(__dirname, '..', 'data', 'destinations.json');
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

const destinations = loadDestinations();

console.log('Total destinations:', destinations.length);

// Test: /api/destinations
app.get('/api/destinations', (req, res) => {
  res.json({
    count: destinations.length,
    destinations: destinations.map(d => ({
      id: d.id, name: d.name, country: d.country,
      latitude: d.latitude, longitude: d.longitude,
      category: d.category, shortDescription: d.shortDescription
    }))
  });
});

// Test: /api/destinations/:id with weather
app.get('/api/destinations/:id', async (req, res) => {
  const dest = destinations.find(d => d.id === req.params.id);
  if (!dest) return res.status(404).json({ error: 'Destination not found' });
  
  try {
    const weatherRes = await fetch(`${OPENWEATHER_BASE}/weather?lat=${dest.latitude}&lon=${dest.longitude}&units=metric&appid=${API_KEY}`);
    const wData = await weatherRes.json();
    const w = wData.weather && wData.weather[0];
    const normalized = {
      temperature: Math.round(wData.main.temp * 10) / 10,
      feelsLike: Math.round(wData.main.feels_like * 10) / 10,
      condition: w ? w.main : 'Unknown',
      description: w ? w.description : '',
      icon: w ? w.icon : '',
      rainProbability: wData.rain && wData.rain['1h'] ? Math.min(100, Math.round(wData.rain['1h'] * 100)) : 0,
      precipitationMm: wData.rain ? wData.rain['1h'] || 0 : 0,
      windSpeedKmh: Math.round(wData.wind.speed * 3.6 * 10) / 10,
      humidity: wData.main.humidity,
      visibilityKm: wData.visibility != null ? Math.round((wData.visibility / 1000) * 10) / 10 : null,
      dataSource: 'current',
    };
    
    // Compute travel score
    const TEMP_PROFILES = { Beach: { ideal: 29, span: 6 }, Hill: { ideal: 23, span: 7 }, Nature: { ideal: 24, span: 7 }, Forest: { ideal: 24, span: 7 }, Historical: { ideal: 27, span: 8 }, Lake: { ideal: 26, span: 7 }, default: { ideal: 25, span: 7 } };
    const CATEGORY_WEIGHTS = { Beach: { temp: 0.35, rain: 0.3, condition: 0.2, wind: 0.1, visibility: 0.05 }, Hill: { temp: 0.25, rain: 0.3, condition: 0.15, wind: 0.1, visibility: 0.2 }, Nature: { temp: 0.2, rain: 0.3, condition: 0.2, wind: 0.1, visibility: 0.2 }, Forest: { temp: 0.2, rain: 0.35, condition: 0.15, wind: 0.1, visibility: 0.2 }, Historical: { temp: 0.3, rain: 0.35, condition: 0.15, wind: 0.1, visibility: 0.1 }, Lake: { temp: 0.3, rain: 0.3, condition: 0.15, wind: 0.1, visibility: 0.15 }, default: { temp: 0.25, rain: 0.3, condition: 0.2, wind: 0.1, visibility: 0.15 } };
    const CONDITION_SCORES = { Clear: 100, Clouds: 72, Haze: 58, Smoke: 55, Mist: 45, Fog: 30, Dust: 40, Sand: 40, Drizzle: 42, Rain: 28, Thunderstorm: 8, Snow: 15, Unknown: 50 };
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const scoreTemperature = (temp, category) => { if (temp == null) return 50; const p = TEMP_PROFILES[category] || TEMP_PROFILES.default; const diff = (temp - p.ideal) / p.span; return clamp(Math.round(100 * Math.exp(-(diff * df))), 0, 100); };
    
    // Simplified: just return weather + score
    const { score, factors } = (() => {
      const scoreTemperature = (temp, category) => { if (temp == null) return 50; const p = TEMP_PROFILES[category] || TEMP_PROFILES.default; const diff = (temp - p.ideal) / p.span; return Math.round(100 * Math.exp(-(diff * diff))); };
      const scoreRain = (rainProbability, precipitationMm) => { const pop = rainProbability || 0; const precip = precipitationMm || 0; const popPenalty = pop * 0.75; const precipPenalty = clamp(precip / 20, 0, 1) * 100 * 0.25; return clamp(Math.round(100 - popPenalty - precipPenalty), 0, 100); };
      const scoreCondition = (condition) => CONDITION_SCORES[condition] != null ? CONDITION_SCORES[condition] : 50;
      const scoreWind = (speedKmh) => { if (speedKmh == null) return 50; if (speedKmh <= 10) return 100; if (speedKmh <= 20) return 100 - ((speedKmh - 10) / 10) * 30; if (speedKmh <= 35) return 70 - ((speedKmh - 20) / 15) * 35; if (speedKmh <= 50) return 35 - ((speedKmh - 35) / 15) * 25; return 0; };
      const scoreVisibility = (km) => { if (km == null) return 50; return clamp(Math.round((km / 10) * 100), 0, 100); };
      const weights = CATEGORY_WEIGHTS[dest.category] || CATEGORY_WEIGHTS.default;
      const factors = {
        temp: scoreTemperature(normalized.temperature, dest.category),
        rain: scoreRain(normalized.rainProbability, normalized.precipitationMm),
        condition: scoreCondition(normalized.condition),
        wind: scoreWind(normalized.windSpeedKmh),
        visibility: scoreVisibility(normalized.visibilityKm),
      };
      const score = Math.round(weights.temp * factors.temp + weights.rain * factors.rain + weights.condition * factors.condition + weights.wind * factors.wind + weights.visibility * factors.visibility);
      return { score: score, factors };
    })();
    
    const recommendationLabel = (score) => { if (score >= 80) return 'Excellent for travel'; if (score >= 60) return 'Good for travel'; if (score >= 40) return 'Moderate'; return 'Not recommended'; };
    const shortRecommendation = (weather, score) => {
      const label = recommendationLabel(score);
      if (weather.rainProbability >= 60) return `${label} — heavy rain chance (${weather.rainProbability}%). Pack an umbrella.`;
      if (weather.rainProbability >= 30) return `${label} — some chance of rain (${weather.rainProbability}%).`;
      if (weather.condition === 'Clear') return `${label} — clear skies and pleasant conditions.`;
      if (weather.condition === 'Thunderstorm') return `${label} — thunderstorms expected. Consider delaying the trip.`;
      return `${label} — ${weather.condition} conditions, ${weather.temperature}°C.`;
    };
    
    res.json({
      ...dest,
      weather: normalized,
      travelScore: score,
      factors,
      recommendation: recommendationLabel(score),
      shortRecommendation: shortRecommendation(normalized, score),
    });
  } catch (err) {
    console.error('Error for', dest.id, ':', err.message);
    res.status(500).json({ error: 'Weather API error' });
  }
});

app.listen(PORT, () => {
  console.log('Test server on port ' + PORT);
  
  // Verify new destinations are loaded
  const newDests = ['chattogram','patenga-beach','foys-lake','batali-hill','war-cemetery','ethnological-museum','chattogram-zoo','sitakunda','chandranath-hill','guliakhali-beach','bashbaria-beach','khoiyachora-waterfall','naphittachora-waterfall','mohamaya-lake','bhatiari','mirsarai'];
  const allIds = destinations.map(d => d.id);
  console.log('New destinations loaded:', newDests.filter(id => allIds.includes(id)).length + '/' + newDests.length);
  console.log('Original destinations preserved:', ['cox-bazar','sajek-valley','bandarban','rangamati','sylhet'].every(id => allIds.includes(id)) ? 'YES' : 'NO');
  
  // Test Chattogram weather
  http.get('http://localhost:5001/api/destinations/chattogram', (res) => {
    let d = '';
    res.on('data', chunk => d += chunk);
    res.on('end', () => {
      const j = JSON.parse(d);
      console.log('Chattogram weather:', j.weather?.condition, '| Score:', j.travelScore, '| Category:', j.category);
    });
  }).on('error', e => console.error(e));
  
  // Test Patenga Beach weather
  http.get('http://localhost:5001/api/destinations/patenga-beach', (res) => {
    let d = '';
    res.on('data', chunk => d += c => d += c);
    res.on('end', () => {
      const j = JSON.parse(d);
      console.log('Patenda Beach weather:', j.weather?.condition, '| Score:', j.travelScore, '| Category:', j.category);
    });
  }).on('error', e => console.error(e));
  
  // Test Foys Lake weather
  http.get('http://localhost:5001/api/destinations/foys-lake', (res) => {
    let d = '';
    res.on('data', chunk => d += c => d += c);
    res.on('end', () => {
      const j = JSON.parse(d);
      console.log('Foys Lake weather:', j.weather?.condition, '| Score:', j.travelScore, '| Category:', j.category);
    });
  }).on('error', e => console.error(e));
});