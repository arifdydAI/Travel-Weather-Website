const fs = require('fs');
const path = require('path');

// Shared utilities
const utils = require('./utils.js');

const DESTINATIONS_PATH = require('path').join(process.cwd(), 'data', 'destinations.json');

function parseDate(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const d = new Date(`${str}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const parts = str.split('-').map(Number);
  if (
    d.getUTCFullYear() !== parts[0] ||
    d.getUTCMonth() + 1 !== parts[1] ||
    d.getUTCDate() !== parts[2]
  ) {
    return null;
  }
  return d;
}

function todayLocal() {
  return new Date().toISOString().split('T')[0];
}

function parseDate(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const d = new Date(`${str}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const parts = str.split('-').map(Number);
  if (
    d.getUTCFullYear() !== parts[0] ||
    d.getUTCMonth() + 1 !== parts[1] ||
    d.getUTCDate() !== parts[2]
  ) {
    return null;
  }
  return d;
}

function recommendationLabel(score) {
  if (score >= 80) return 'Excellent for travel';
  if (score >= 60) return 'Good for travel';
  if (score >= 40) return 'Moderate';
  return 'Not recommended';
}

function shortRecommendation(weather, score) {
  const label = score >= 80 ? 'Excellent for travel' : score >= 60 ? 'Good for travel' : score >= 40 ? 'Moderate' : 'Not recommended';
  if (weather.rainProbability >= 60) {
    return `${label} — heavy rain chance (${weather.rainProbability}%). Pack an umbrella.`;
  }
  if (weather.rainProbability >= 30) {
    return `${label} — some chance of rain (${weather.rainProbability}%).`;
  }
  if (weather.condition === 'Clear') {
    return `${label} — clear skies and pleasant conditions.`;
  }
  if (weather.condition === 'Thunderstorm') {
    return `${label} — thunderstorms expected. Consider delaying the trip.`;
  }
  return `${label} — ${weather.condition} conditions, ${weather.temperature}°C.`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let dest = null;
    if (req.query.id) {
      const destinationsData = JSON.parse(require('fs').readFileSync(require('path').join(process.cwd(), 'data', 'destinations.json'), 'utf8'));
      const dest = destinationsData.find((d) => d.id === req.query.id);
      if (!dest) return res.status(404).json({ error: 'Destination not found' });
    } else {
      const lat = Number(req.query.lat);
      const lon = Number(req.query.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return res
          .status(400)
          .json({ error: 'lat and lon query parameters are required and must be numbers.' });
      }
      dest = { id: 'custom', name: 'Custom location', country: '', latitude: lat, longitude: lon };
    }

    const dateStr = req.query.date || new Date().toISOString().split('T')[0];
    const parsed = parseDate(dateStr);
    if (!parsed) {
      return res.status(400).json({ error: 'Invalid date. Use YYYY-MM-DD.' });
    }

    // Load destinations
    const destinationsData = JSON.parse(require('fs').readFileSync(require('path').join(process.cwd(), 'data', 'destinations.json'), 'utf8'));

    let dest = null;
    if (req.query.id) {
      dest = destinationsData.find((d) => d.id === req.query.id);
      if (!dest) return res.status(404).json({ error: 'Destination not found' });
    } else {
      const lat = Number(req.query.lat);
      const lon = Number(req.query.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return res
          .status(400)
          .json({ error: 'lat and lon query parameters are required and must be numbers.' });
      }
      dest = { id: 'custom', name: 'Custom location', country: '', latitude: lat, longitude: lon };
    }

    const dateStr = req.query.date || new Date().toISOString().split('T')[0];
    const parsed = parseDate(dateStr);
    if (!parsed) {
      return res.status(400).json({ error: 'Invalid date. Use YYYY-MM-DD.' });
    }

    // Get weather and compute travel score
    const utils = require('./utils.js');
    const weather = await utils.getWeatherForDate(dest.latitude, dest.longitude, dateStr);
    const { score, factors } = require('./utils.js').computeTravelScore(dest.category, weather);

    const result = {
      ...dest,
      weather,
      travelScore: score,
      factors,
      recommendation: recommendationLabel(score),
      shortRecommendation: shortRecommendation(weather, score),
    };

    res.status(200).json(result);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

function parseDate(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const d = new Date(`${str}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const parts = str.split('-').map(Number);
  if (
    d.getUTCFullYear() !== parts[0] ||
    d.getUTCMonth() + 1 !== parts[1] ||
    d.getUTCDate() !== parts[2]
  ) {
    return null;
  }
  return d;
}

function recommendationLabel(score) {
  if (score >= 80) return 'Excellent for travel';
  if (score >= 60) return 'Good for travel';
  if (score >= 40) return 'Moderate';
  return 'Not recommended';
}

function shortRecommendation(weather, score) {
  const label = score >= 80 ? 'Excellent for travel' : score >= 60 ? 'Good for travel' : score >= 40 ? 'Moderate' : 'Not recommended';
  if (weather.rainProbability >= 60) {
    return `${label} — heavy rain chance (${weather.rainProbability}%). Pack an umbrella.`;
  }
  if (weather.rainProbability >= 30) {
    return `${label} — some chance of rain (${weather.rainProbability}%).`;
  }
  if (weather.condition === 'Clear') {
    return `${label} — clear skies and pleasant conditions.`;
  }
  if (weather.condition === 'Thunderstorm') {
    return `${label} — thunderstorms expected. Consider delaying the trip.`;
  }
  return `${label} — ${weather.condition} conditions, ${weather.temperature}°C.`;
}