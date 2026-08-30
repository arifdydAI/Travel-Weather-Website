/**
 * Weather-Based Travel Recommendation — Backend
 * -------------------------------------------
 * Express server that:
 *   - Serves destination data from ../data/destinations.json
 *   - Fetches REAL weather data from the OpenWeather API (no fake data)
 *   - Computes a transparent Travel Score (0-100) per destination
 *   - Exposes clean JSON REST endpoints for the frontend
 *
 * The OpenWeather API key lives ONLY in backend/.env (never exposed to the
 * browser). The frontend talks exclusively to this server.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENWEATHER_API_KEY;
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

const OPENWEATHER_BASE = 'https://api.openweathermap.org/data/2.5';
const DHAKA_TZ_OFFSET_SECONDS = 6 * 3600; // Bangladesh is UTC+6

/* ------------------------------------------------------------------ */
/* Destination data                                                    */
/* ------------------------------------------------------------------ */

function loadDestinations() {
  const filePath = path.join(__dirname, '..', 'data', 'destinations.json');
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

const destinations = loadDestinations();

/* ------------------------------------------------------------------ */
/* Date helpers                                                        */
/* ------------------------------------------------------------------ */

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Validate a YYYY-MM-DD string. Returns the Date or null. */
function parseDate(str) {
  if (typeof str !== 'string' || !DATE_REGEX.test(str)) return null;
  const d = new Date(`${str}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  // Guard against invalid calendar dates like 2024-02-30 (JS rolls over)
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

/** Convert a UTC timestamp to a date string in Bangladesh (UTC+6). */
function toLocalDateString(utcSeconds) {
  return new Date((utcSeconds + DHAKA_TZ_OFFSET_SECONDS) * 1000)
    .toISOString()
    .slice(0, 10);
}

/** Today's date string in Bangladesh (UTC+6). */
function todayLocal() {
  return toLocalDateString(Math.floor(Date.now() / 1000));
}

/* ------------------------------------------------------------------ */
/* Weather service (OpenWeather)                                       */
/* ------------------------------------------------------------------ */

// Simple in-memory cache: key = `lat,lon,date` -> Promise<weather>
const weatherCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Fetch the OpenWeather 5-day / 3-hour forecast for a location.
 * @returns {Promise<object>} raw forecast payload
 */
async function fetchForecast(lat, lon) {
  const url =
    `${OPENWEATHER_BASE}/forecast?lat=${lat}&lon=${lon}` +
    `&units=metric&appid=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenWeather forecast error (${res.status}): ${text}`);
  }
  return res.json();
}

/**
 * Fetch the OpenWeather current-weather snapshot for a location.
 * @returns {Promise<object>} raw current payload
 */
async function fetchCurrent(lat, lon) {
  const url =
    `${OPENWEATHER_BASE}/weather?lat=${lat}&lon=${lon}` +
    `&units=metric&appid=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenWeather current error (${res.status}): ${text}`);
  }
  return res.json();
}

/** Normalize an OpenWeather condition group into a stable string. */
function normalizeCondition(main) {
  const m = String(main || '').toLowerCase();
  if (m.includes('clear')) return 'Clear';
  if (m.includes('thunder')) return 'Thunderstorm';
  if (m.includes('drizzle')) return 'Drizzle';
  if (m.includes('rain')) return 'Rain';
  if (m.includes('snow')) return 'Snow';
  if (m.includes('fog')) return 'Fog';
  if (m.includes('mist')) return 'Mist';
  if (m.includes('haze')) return 'Haze';
  if (m.includes('dust')) return 'Dust';
  if (m.includes('sand')) return 'Sand';
  if (m.includes('smoke')) return 'Smoke';
  if (m.includes('cloud')) return 'Clouds';
  return 'Unknown';
}

/** Convert the current-weather payload into our normalized weather shape. */
function normalizeCurrent(raw, meta = {}) {
  const w = raw.weather && raw.weather[0];
  return {
    temperature: Math.round(raw.main.temp * 10) / 10,
    feelsLike: Math.round(raw.main.feels_like * 10) / 10,
    condition: normalizeCondition(w && w.main),
    description: (w && w.description) || '',
    icon: (w && w.icon) || '',
    rainProbability: raw.rain && raw.rain['1h'] ? Math.min(100, Math.round(raw.rain['1h'] * 100)) : 0,
    precipitationMm: raw.rain ? raw.rain['1h'] || 0 : 0,
    windSpeedKmh: Math.round(raw.wind.speed * 3.6 * 10) / 10,
    humidity: raw.main.humidity,
    visibilityKm: raw.visibility != null ? Math.round((raw.visibility / 1000) * 10) / 10 : null,
    dataSource: 'current',
    ...meta,
  };
}

/**
 * Aggregate the 3-hourly forecast entries that fall on a given date
 * into a single day-level weather summary.
 */
function aggregateForecastForDate(raw, dateStr, meta = {}) {
  const entries = raw.list.filter((e) => toLocalDateString(e.dt) === dateStr);
  if (!entries.length) return null;

  const avg = (fn) =>
    Math.round((entries.reduce((s, e) => s + fn(e), 0) / entries.length) * 10) / 10;

  // Most frequent weather condition group + icon across the day
  const counts = {};
  let condition = 'Unknown';
  let icon = '';
  let description = '';
  let max = 0;
  for (const e of entries) {
    const w = e.weather && e.weather[0];
    if (!w) continue;
    const key = normalizeCondition(w.main);
    counts[key] = (counts[key] || 0) + 1;
    if (counts[key] > max) {
      max = counts[key];
      condition = key;
      icon = w.icon;
      description = w.description;
    }
  }

  // Rain probability = the highest POP across the day (OpenWeather gives 0..1)
  const maxPop = Math.max(0, ...entries.map((e) => e.pop || 0));
  // Precipitation = total expected mm for the day (3h buckets)
  const precipitation = entries.reduce((s, e) => s + ((e.rain && e.rain['3h']) || 0), 0);

  // Visibility is only sometimes present in forecast entries — average it.
  const vis = entries.filter((e) => e.visibility != null).map((e) => e.visibility);
  const visibilityKm =
    vis.length > 0 ? Math.round((vis.reduce((a, b) => a + b, 0) / vis.length / 1000) * 10) / 10 : null;

  return {
    temperature: avg((e) => e.main.temp),
    feelsLike: avg((e) => e.main.feels_like),
    condition,
    description,
    icon,
    rainProbability: Math.round(maxPop * 100),
    precipitationMm: Math.round(precipitation * 10) / 10,
    windSpeedKmh: avg((e) => e.wind.speed * 3.6),
    humidity: Math.round(avg((e) => e.main.humidity)),
    visibilityKm,
    dataSource: 'forecast',
    ...meta,
  };
}

/**
 * Get the best available weather for a location on a date.
 *
 * Strategy (never fabricates data):
 *   - Date == today  -> OpenWeather "current weather" snapshot
 *   - Date in the 5-day forecast window -> aggregated day forecast
 *   - Otherwise      -> fall back to current conditions, clearly flagged
 *
 * @returns {Promise<object>} normalized weather + flags
 */
async function getWeatherForDate(lat, lon, dateStr) {
  const cacheKey = `${lat},${lon},${dateStr}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.t < CACHE_TTL_MS) {
    return cached.v;
  }

  const tzDate = dateStr;
  const tzToday = todayLocal();

  let weather;
  if (tzDate === tzToday) {
    const raw = await fetchCurrent(lat, lon);
    weather = normalizeCurrent(raw);
  } else {
    const raw = await fetchForecast(lat, lon);
    weather = aggregateForecastForDate(raw, tzDate, {
      forecastAvailable: true,
    });
    if (!weather) {
      // Requested date is outside the 5-day forecast window.
      const rawCurrent = await fetchCurrent(lat, lon);
      weather = normalizeCurrent(rawCurrent, {
        forecastAvailable: false,
        note:
          'No forecast data available for the selected date. Showing current conditions as an approximation.',
      });
    }
  }

  const promise = Promise.resolve(weather);
  weatherCache.set(cacheKey, { t: Date.now(), v: promise });
  return weather;
}

/* ------------------------------------------------------------------ */
/* Travel Score algorithm                                              */
/* ------------------------------------------------------------------ */

/**
 * TRAVEL SCORE (0-100)
 * --------------------
 * A weighted blend of five weather factors, each scored 0-100.
 * Weights depend on the destination category because the "perfect
 * weather" for a beach differs from a hill trek or a heritage walk.
 *
 *   Factor    | What it measures              | How it is scored
 *   ----------|------------------------------|----------------------------------
 *   temp      | Air temperature comfort       | Gaussian around category ideal
 *   rain      | Chance of rain + volume       | Inverse of POP & precipitation
 *   condition | Weather condition group       | Lookup: Clear=100 ... Storm=8
 *   wind      | Wind speed (km/h)             | Piecewise linear, 0-100
 *   visibility| How far you can see (km)      | Linear 0km=0 ... 10km+=100
 *
 * Higher score = better travel conditions.
 */

// Ideal temperature (in °C) and how quickly comfort falls off around it.
const TEMP_PROFILES = {
  Beach: { ideal: 29, span: 6 },
  Hill: { ideal: 23, span: 7 },
  Nature: { ideal: 24, span: 7 },
  Forest: { ideal: 24, span: 7 },
  Historical: { ideal: 27, span: 8 },
  Lake: { ideal: 26, span: 7 },
  default: { ideal: 25, span: 7 },
};

// Category -> { factor: weight }. Weights always sum to 1.
const CATEGORY_WEIGHTS = {
  Beach: { temp: 0.35, rain: 0.3, condition: 0.2, wind: 0.1, visibility: 0.05 },
  Hill: { temp: 0.25, rain: 0.3, condition: 0.15, wind: 0.1, visibility: 0.2 },
  Nature: { temp: 0.2, rain: 0.3, condition: 0.2, wind: 0.1, visibility: 0.2 },
  Forest: { temp: 0.2, rain: 0.35, condition: 0.15, wind: 0.1, visibility: 0.2 },
  Historical: { temp: 0.3, rain: 0.35, condition: 0.15, wind: 0.1, visibility: 0.1 },
  Lake: { temp: 0.3, rain: 0.3, condition: 0.15, wind: 0.1, visibility: 0.15 },
  default: { temp: 0.25, rain: 0.3, condition: 0.2, wind: 0.1, visibility: 0.15 },
};

const CONDITION_SCORES = {
  Clear: 100,
  Clouds: 72,
  Haze: 58,
  Smoke: 55,
  Mist: 45,
  Fog: 30,
  Dust: 40,
  Sand: 40,
  Drizzle: 42,
  Rain: 28,
  Thunderstorm: 8,
  Snow: 15,
  Unknown: 50,
};

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/** Temperature comfort — Gaussian centered on the category ideal. */
function scoreTemperature(temp, category) {
  if (temp == null) return 50;
  const p = TEMP_PROFILES[category] || TEMP_PROFILES.default;
  const diff = (temp - p.ideal) / p.span;
  return clamp(Math.round(100 * Math.exp(-(diff * diff))), 0, 100);
}

/** Rain score — full marks when dry, heavy penalties as POP/precip grow. */
function scoreRain(rainProbability, precipitationMm) {
  const pop = rainProbability || 0;
  const precip = precipitationMm || 0;
  const popPenalty = pop * 0.75;
  const precipPenalty = clamp(precip / 20, 0, 1) * 100 * 0.25;
  return clamp(Math.round(100 - popPenalty - precipPenalty), 0, 100);
}

/** Condition group lookup. */
function scoreCondition(condition) {
  return CONDITION_SCORES[condition] != null ? CONDITION_SCORES[condition] : 50;
}

/** Wind — piecewise linear. Low wind is best. */
function scoreWind(speedKmh) {
  if (speedKmh == null) return 50;
  if (speedKmh <= 10) return 100;
  if (speedKmh <= 20) return 100 - ((speedKmh - 10) / 10) * 30; // 100 -> 70
  if (speedKmh <= 35) return 70 - ((speedKmh - 20) / 15) * 35; // 70 -> 35
  if (speedKmh <= 50) return 35 - ((speedKmh - 35) / 15) * 25; // 35 -> 10
  return 0;
}

/** Visibility — linear up to 10 km. */
function scoreVisibility(km) {
  if (km == null) return 50;
  return clamp(Math.round((km / 10) * 100), 0, 100);
}

/**
 * Compute the final Travel Score (0-100) for a category + weather.
 * @returns {{score:number, factors:object}}
 */
function computeTravelScore(category, weather) {
  const weights = CATEGORY_WEIGHTS[category] || CATEGORY_WEIGHTS.default;

  const factors = {
    temp: scoreTemperature(weather.temperature, category),
    rain: scoreRain(weather.rainProbability, weather.precipitationMm),
    condition: scoreCondition(weather.condition),
    wind: scoreWind(weather.windSpeedKmh),
    visibility: scoreVisibility(weather.visibilityKm),
  };

  const score = Math.round(
    weights.temp * factors.temp +
      weights.rain * factors.rain +
      weights.condition * factors.condition +
      weights.wind * factors.wind +
      weights.visibility * factors.visibility
  );

  return { score: clamp(score, 0, 100), factors };
}

/** Human-readable recommendation based on the score. */
function recommendationLabel(score) {
  if (score >= 80) return 'Excellent for travel';
  if (score >= 60) return 'Good for travel';
  if (score >= 40) return 'Moderate';
  return 'Not recommended';
}

/** One-line reason built from the dominant weather factor. */
function shortRecommendation(weather, score) {
  const label = recommendationLabel(score);
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

/* ------------------------------------------------------------------ */
/* API routes                                                          */
/* ------------------------------------------------------------------ */

/** Attach weather + score to a destination object. */
async function withWeather(dest, dateStr) {
  const weather = await getWeatherForDate(dest.latitude, dest.longitude, dateStr);
  const { score, factors } = computeTravelScore(dest.category, weather);
  return {
    ...dest,
    weather,
    travelScore: score,
    factors,
    recommendation: recommendationLabel(score),
    shortRecommendation: shortRecommendation(weather, score),
  };
}

// Load districts data
const districtsPath = path.join(__dirname, '..', 'data', 'districts.json');
const districts = JSON.parse(fs.readFileSync(districtsPath, 'utf8'));

// Get unique divisions
function getDivisions() {
  const divisionNames = [...new Set(districts.map(d => d.division))];
  return divisionNames.map(name => {
    const divisionDistricts = districts.filter(d => d.division === name);
    return {
      name,
      districtCount: divisionDistricts.length,
      destinationCount: divisionDistricts.reduce((sum, d) => sum + (d.destinationCount || 0), 0)
    };
  });
}

// Get districts for a division
function getDistrictsForDivision(division) {
  return districts
    .filter(d => d.division === division)
    .map(d => ({
      id: d.id,
      name: d.name,
      division: d.division,
      latitude: d.latitude,
      longitude: d.longitude,
      destinationCount: d.destinationCount || 0
    }));
}

// Public list of divisions.


// Auth routes - DISABLED (Admin Panel paused)
/*
const authRoutes = require('./api/auth.js');
app.post('/api/auth/login', require('./api/auth.js').login);
app.post('/api/auth/logout', require('./api/auth.js').logout);
app.get('/api/auth/status', require('./api/auth.js').status);
*/

app.get('/api/divisions', (req, res) => {
  res.json({ divisions: getDivisions() });
});

// Public list of districts for a division.
app.get('/api/districts', (req, res) => {
  const division = req.query.division;
  if (!division) {
    return res.status(400).json({ error: 'division query parameter is required' });
  }
  const divs = getDistrictsForDivision(division);
  if (divs.length === 0) {
    return res.status(404).json({ error: 'Division not found' });
  }
  res.json({ division, districts: divs });
});

// Public list of all districts.
app.get('/api/districts/all', (req, res) => {
  res.json({ districts: districts.map(d => ({
    id: d.id,
    name: d.name,
    division: d.division,
    latitude: d.latitude,
    longitude: d.longitude,
    destinationCount: d.destinationCount || 0
  })) });
});

// Public list of destinations (no API key, no weather).
app.get('/api/destinations', (req, res) => {
  res.json({
    count: destinations.length,
    destinations: destinations.map((d) => ({
      id: d.id,
      name: d.name,
      country: d.country,
      latitude: d.latitude,
      longitude: d.longitude,
      category: d.category,
      shortDescription: d.shortDescription,
      image: d.image,
      location: d.location,
    })),
  });
});

// Single destination. Optional ?date= adds live weather + travel score.
app.get('/api/destinations/:id', async (req, res, next) => {
  try {
    const dest = destinations.find((d) => d.id === req.params.id);
    if (!dest) {
      return res.status(404).json({ error: 'Destination not found' });
    }
    const dateStr = req.query.date || todayLocal();
    const parsed = parseDate(dateStr);
    if (!parsed) {
      return res.status(400).json({ error: 'Invalid date. Use YYYY-MM-DD.' });
    }
    const result = await withWeather(dest, dateStr);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Recommendations for every destination, sorted by Travel Score (desc).
app.get('/api/recommendations', async (req, res, next) => {
  try {
    const dateStr = req.query.date || todayLocal();
    const parsed = parseDate(dateStr);
    if (!parsed) {
      return res.status(400).json({ error: 'Invalid date. Use YYYY-MM-DD.' });
    }
    // Fetch weather for all destinations in parallel.
    const results = await Promise.all(
      destinations.map((d) => withWeather(d, dateStr))
    );
    results.sort((a, b) => b.travelScore - a.travelScore);
    res.json({
      date: dateStr,
      count: results.length,
      recommendations: results,
    });
  } catch (err) {
    next(err);
  }
});

// Weather + score for one location. Use id=... OR lat=...&lon=...
app.get('/api/weather', async (req, res, next) => {
  try {
    let dest = null;
    if (req.query.id) {
      dest = destinations.find((d) => d.id === req.query.id);
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

    const dateStr = req.query.date || todayLocal();
    const parsed = parseDate(dateStr);
    if (!parsed) {
      return res.status(400).json({ error: 'Invalid date. Use YYYY-MM-DD.' });
    }

    const result = await withWeather(dest, dateStr);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Serve the frontend statically when running everything from one server.
app.use(express.static(FRONTEND_DIR));

/* ------------------------------------------------------------------ */
/* Error handling                                                      */
/* ------------------------------------------------------------------ */

app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  if (err.message.includes('OpenWeather')) {
    return res.status(502).json({ error: 'Weather API error. ' + err.message });
  }
  res.status(500).json({ error: 'Internal server error.' });
});

/* ------------------------------------------------------------------ */
/* Startup                                                             */
/* ------------------------------------------------------------------ */

app.listen(PORT, '0.0.0.0', () => {
  console.log('==============================================');
  console.log('  Weather-Based Travel Recommendation API');
  console.log(`  Running on http://localhost:${PORT}`);
  console.log('==============================================');
  if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
    console.warn(
      '  WARNING: OPENWEATHER_API_KEY is not set in backend/.env.\n' +
        '  Weather endpoints will fail until you add your real API key.'
    );
  } else {
    console.log('  OpenWeather API key detected.');
  }
  console.log('==============================================');
}).on('error', (err) => {
  console.error('Server listen error:', err);
  process.exit(1);
});