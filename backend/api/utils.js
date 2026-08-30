/**
 * Shared utilities for Vercel serverless functions
 */

const fs = require('fs');
const path = require('path');

// Load destinations data
const destinationsPath = path.join(process.cwd(), 'data', 'destinations.json');
const destinations = JSON.parse(fs.readFileSync(destinationsPath, 'utf8'));

// Load districts data
const districtsPath = path.join(process.cwd(), 'data', 'districts.json');
const districts = JSON.parse(fs.readFileSync(districtsPath, 'utf8'));

// OpenWeather API configuration
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const OPENWEATHER_BASE = 'https://api.openweathermap.org/data/2.5';
const DHAKA_TZ_OFFSET_SECONDS = 6 * 3600;

// Simple in-memory cache for weather data
const weatherCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

// Date helpers
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

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

function toLocalDateString(utcSeconds) {
  return new Date((utcSeconds + 6 * 3600) * 1000).toISOString().slice(0, 10);
}

function todayLocal() {
  return toLocalDateString(Math.floor(Date.now() / 1000));
}

// Weather cache
const weatherCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

async function fetchForecast(lat, lon) {
  const url = `${process.env.OPENWEATHER_BASE || 'https://api.openweathermap.org/data/2.5'}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${process.env.OPENWEATHER_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenWeather forecast error (${res.status}): ${text}`);
  }
  return res.json();
}

async function fetchCurrent(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${process.env.OPENWEATHER_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenWeather current error (${res.status}): ${text}`);
  }
  return res.json();
}

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
  };
}

function aggregateForecastForDate(raw, dateStr) {
  const entries = raw.list.filter((e) => toLocalDateString(e.dt) === dateStr);
  if (!entries.length) return null;

  const avg = (fn) =>
    Math.round((entries.reduce((s, e) => s + fn(e), 0) / entries.length) * 10) / 10;

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

  const maxPop = Math.max(0, ...entries.map((e) => e.pop || 0));
  const precipitation = entries.reduce((s, e) => s + ((e.rain && e.rain['3h']) || 0), 0);

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
  };
}

function toLocalDateString(utcSeconds) {
  return new Date((utcSeconds + 6 * 3600) * 1000).toISOString().slice(0, 10);
}

function todayLocal() {
  return toLocalDateString(Math.floor(Date.now() / 1000));
}

async function getWeatherForDate(lat, lon, dateStr) {
  const cacheKey = `${lat},${lon},${dateStr}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.t < 10 * 60 * 1000) {
    return cached.v;
  }

  const tzDate = dateStr;
  const tzToday = todayLocal();

  let weather;
  if (tzDate === tzToday) {
    const raw = await fetchCurrent(lat, lon);
    weather = {
      ...normalizeCurrent(await fetchCurrent(lat, lon)),
      dataSource: 'current',
    };
  } else {
    const raw = await fetchForecast(lat, lon);
    const aggregated = aggregateForecastForDate(raw, dateStr);
    if (aggregated) {
      weather = { ...aggregated, dataSource: 'forecast', forecastAvailable: true };
    } else {
      const rawCurrent = await fetchCurrent(lat, lon);
      weather = {
        ...normalizeCurrent(await fetchCurrent(lat, lon)),
        forecastAvailable: false,
        note: 'No forecast data available for the selected date. Showing current conditions as an approximation.',
      };
    }
  }

  const promise = Promise.resolve(weather);
  weatherCache.set(cacheKey, { t: Date.now(), v: promise });
  return weather;
}

// Travel Score algorithm
const TEMP_PROFILES = {
  Beach: { ideal: 29, span: 6 },
  Hill: { ideal: 23, span: 7 },
  Nature: { ideal: 24, span: 7 },
  Forest: { ideal: 24, span: 7 },
  Historical: { ideal: 27, span: 8 },
  Lake: { ideal: 26, span: 7 },
  default: { ideal: 25, span: 7 },
};

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
  Clear: 100, Clouds: 72, Haze: 58, Smoke: 55, Mist: 45, Fog: 30,
  Dust: 40, Sand: 40, Drizzle: 42, Rain: 28, Thunderstorm: 8, Snow: 15, Unknown: 50,
};

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function scoreTemperature(temp, category) {
  if (temp == null) return 50;
  const p = { Beach: { ideal: 29, span: 6 }, Hill: { ideal: 23, span: 7 }, Nature: { ideal: 24, span: 7 }, Forest: { ideal: 24, span: 7 }, Historical: { ideal: 27, span: 8 }, Lake: { ideal: 26, span: 7 }, default: { ideal: 25, span: 7 } }[category] || { ideal: 25, span: 7 };
  const diff = (temp - p.ideal) / p.span;
  return Math.max(0, Math.min(100, Math.round(100 * Math.exp(-(diff * diff)))));
}

function scoreRain(rainProbability, precipitationMm) {
  const pop = rainProbability || 0;
  const precip = precipitationMm || 0;
  const popPenalty = pop * 0.75;
  const precipPenalty = Math.max(0, Math.min(1, precip / 20)) * 100 * 0.25;
  return Math.max(0, Math.min(100, Math.round(100 - popPenalty - precipPenalty)));
}

const CONDITION_SCORES = { Clear: 100, Clouds: 72, Haze: 58, Smoke: 55, Mist: 45, Fog: 30, Dust: 40, Sand: 40, Drizzle: 42, Rain: 28, Thunderstorm: 8, Snow: 15, Unknown: 50 };

function scoreCondition(condition) { return CONDITION_SCORES[condition] != null ? CONDITION_SCORES[condition] : 50; }

function scoreWind(speedKmh) {
  if (speedKmh == null) return 50;
  if (speedKmh <= 10) return 100;
  if (speedKmh <= 20) return 100 - ((speedKmh - 10) / 10) * 30;
  if (speedKmh <= 35) return 70 - ((speedKmh - 20) / 15) * 35;
  if (speedKmh <= 50) return 35 - ((speedKmh - 35) / 15) * 25;
  return 0;
}

function scoreVisibility(km) { if (km == null) return 50; return Math.max(0, Math.min(100, Math.round((km / 10) * 100))); }

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

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function computeTravelScore(category, weather) {
  const weights = {
    Beach: { temp: 0.35, rain: 0.3, condition: 0.2, wind: 0.1, visibility: 0.05 },
    Hill: { temp: 0.25, rain: 0.3, condition: 0.15, wind: 0.1, visibility: 0.2 },
    Nature: { temp: 0.2, rain: 0.3, condition: 0.2, wind: 0.1, visibility: 0.2 },
    Forest: { temp: 0.2, rain: 0.35, condition: 0.15, wind: 0.1, visibility: 0.2 },
    Historical: { temp: 0.3, rain: 0.35, condition: 0.15, wind: 0.1, visibility: 0.1 },
    Lake: { temp: 0.3, rain: 0.3, condition: 0.15, wind: 0.1, visibility: 0.15 },
    default: { temp: 0.25, rain: 0.3, condition: 0.2, wind: 0.1, visibility: 0.15 },
  }[category] || { temp: 0.25, rain: 0.3, condition: 0.2, wind: 0.1, visibility: 0.15 };

  const factors = {
    temp: scoreTemperature(weather.temperature, weather.category),
    rain: scoreRain(weather.rainProbability, weather.precipitationMm),
    condition: scoreCondition(weather.condition),
    wind: scoreWind(weather.windSpeedKmh),
    visibility: scoreVisibility(weather.visibilityKm),
  };

  const weights = { Beach: { temp: 0.35, rain: 0.3, condition: 0.2, wind: 0.1, visibility: 0.05 }, Hill: { temp: 0.25, rain: 0.3, condition: 0.15, wind: 0.1, visibility: 0.2 }, Nature: { temp: 0.2, rain: 0.3, condition: 0.2, wind: 0.1, visibility: 0.2 }, Forest: { temp: 0.2, rain: 0.35, condition: 0.15, wind: 0.1, visibility: 0.2 }, Historical: { temp: 0.3, rain: 0.35, condition: 0.15, wind: 0.1, visibility: 0.1 }, Lake: { temp: 0.3, rain: 0.3, condition: 0.15, wind: 0.1, visibility: 0.15 }, default: { temp: 0.25, rain: 0.3, condition: 0.2, wind: 0.1, visibility: 0.15 } }[category] || { temp: 0.25, rain: 0.3, condition: 0.2, wind: 0.1, visibility: 0.15 };

  const score = Math.round(
    weights.temp * factors.temp +
    weights.rain * factors.rain +
    weights.condition * factors.condition +
    weights.wind * factors.wind +
    weights.visibility * factors.visibility
  );

  return { score: Math.max(0, Math.min(100, score)), factors };
}

function scoreTemperature(temp, category) {
  if (temp == null) return 50;
  const p = { Beach: { ideal: 29, span: 6 }, Hill: { ideal: 23, span: 7 }, Nature: { ideal: 24, span: 7 }, Forest: { ideal: 24, span: 7 }, Historical: { ideal: 27, span: 8 }, Lake: { ideal: 26, span: 7 }, default: { ideal: 25, span: 7 } }[category] || { ideal: 25, span: 7 };
  const diff = (temp - p.ideal) / p.span;
  return Math.max(0, Math.min(100, Math.round(100 * Math.exp(-(diff * diff)))));
}

function scoreRain(rainProbability, precipitationMm) {
  const pop = rainProbability || 0;
  const precip = precipitationMm || 0;
  const popPenalty = pop * 0.75;
  const precipPenalty = Math.max(0, Math.min(1, precip / 20)) * 100 * 0.25;
  return Math.max(0, Math.min(100, Math.round(100 - popPenalty - precipPenalty)));
}

function scoreCondition(condition) {
  const CONDITION_SCORES = { Clear: 100, Clouds: 72, Haze: 58, Smoke: 55, Mist: 45, Fog: 30, Dust: 40, Sand: 40, Drizzle: 42, Rain: 28, Thunderstorm: 8, Snow: 15, Unknown: 50 };
  return CONDITION_SCORES[condition] != null ? CONDITION_SCORES[condition] : 50;
}

function scoreWind(speedKmh) {
  if (speedKmh == null) return 50;
  if (speedKmh <= 10) return 100;
  if (speedKmh <= 20) return 100 - ((speedKmh - 10) / 10) * 30;
  if (speedKmh <= 35) return 70 - ((speedKmh - 20) / 15) * 35;
  if (speedKmh <= 50) return 35 - ((speedKmh - 35) / 15) * 25;
  return 0;
}

function scoreVisibility(km) { if (km == null) return 50; return Math.max(0, Math.min(100, Math.round((km / 10) * 100))); }

module.exports = {
  destinations: require('../data/destinations.json'),
  districts: require('../data/districts.json'),
  getWeatherForDate: async (lat, lon, dateStr) => {
    // This will be implemented inline in the API routes
    return null;
  }
};