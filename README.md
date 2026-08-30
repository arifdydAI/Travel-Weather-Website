# SkyTrip — Weather-Based Travel Recommendation

A professional website that recommends the best places to travel in Bangladesh
based on **real weather conditions** from the OpenWeather API. Every
destination is scored 0–100 with a transparent, category-aware Travel Score.

Built with **HTML5, CSS3, Vanilla JavaScript, Node.js and Express.js** —
no frontend frameworks.

---

## Project Overview

- Pick a travel date, search destinations, and filter by category.
- Explore Bangladesh hierarchically: **Division → District → Destinations**,
  or browse all recommendations at once.
- The backend fetches **live weather** for every destination (temperature,
  feels-like, condition, rain probability, precipitation, wind, humidity,
  visibility) using each destination's latitude/longitude.
- A documented scoring algorithm turns that weather into a **Travel Score
  (0–100)** with category-specific weights.
- Destinations are sorted from highest to lowest score and plotted on an
  interactive **Leaflet map**, color-coded by recommendation level.
- Click any destination for a detailed weather + activities view.

> ⚠️ **No fake weather data.** All recommendations are based on actual
> OpenWeather responses. If a selected date is outside the 5-day forecast
> window, the backend transparently falls back to current conditions and flags
> it in the response (`note` field).

---

## Project Structure

```
Travel-Weather-Website/
├── frontend/
│   ├── index.html        # Homepage markup (hero, explorer, map, modal)
│   ├── style.css         # Design system + responsive layout
│   └── script.js         # Vanilla JS app logic (fetch, render, modal)
├── backend/
│   ├── server.js         # Express API + weather fetching + scoring
│   ├── package.json      # Dependencies & scripts
│   └── .env              # API key + port (git-ignored)
├── data/
│   ├── destinations.json # 235 Bangladeshi destinations (64 districts, 8 divisions)
│   └── districts.json    # 64 districts with division + centroid coords + counts
├── start.bat / start_server.bat  # Quick-start helpers (PORT=3000)
├── find-images.js, process-all.js, …  # One-off data/image population scripts
├── .gitignore
└── README.md
```

---

## Installation

```bash
# 1. Install backend dependencies
cd backend
npm install
```

Requires **Node.js 18+** (uses the built-in global `fetch`).

---

## API Key Configuration

1. Sign up at [openweathermap.org](https://openweathermap.org) and copy your
   API key.
2. Open `backend/.env` and replace the placeholder:

```env
OPENWEATHER_API_KEY=YOUR_API_KEY_HERE
PORT=3000
```

The key is **only** read server-side via `dotenv` and is **never** exposed to
the frontend. `backend/.env` is in `.gitignore` so it can't be committed.

> The frontend expects the backend on **port 3000** (it talks to
> `http://localhost:3000` when not served from the same origin).

---

## How the Travel Score Works

The score is a weighted blend of five weather factors, each scored 0–100.
Weights depend on the destination category (a perfect beach day differs from a
hill trek). See the `TRAVEL SCORE` section in `backend/server.js` for the full
implementation.

| Factor       | What it measures              | How it is scored                                             |
|--------------|-------------------------------|--------------------------------------------------------------|
| Temperature  | Air temperature comfort       | Gaussian curve around a category ideal (e.g. Beach 29°C)     |
| Rain         | Rain chance + precipitation   | 100 − (POP × 0.75) − (precip/20mm × 0.25), min 0             |
| Condition    | Weather condition group       | Clear=100, Clouds=72, Rain=28, Thunderstorm=8 …              |
| Wind         | Wind speed (km/h)             | Piecewise linear, 0 at ≥50 km/h                              |
| Visibility   | How far you can see           | Linear 0km=0 → 10km+=100                                     |

**Category weights** (sum to 1):

| Category     | Temp | Rain | Condition | Wind | Visibility |
|--------------|------|------|-----------|------|------------|
| Beach        | 0.35 | 0.30 | 0.20      | 0.10 | 0.05       |
| Hill         | 0.25 | 0.30 | 0.15      | 0.10 | 0.20       |
| Nature       | 0.20 | 0.30 | 0.20      | 0.10 | 0.20       |
| Forest       | 0.20 | 0.35 | 0.15      | 0.10 | 0.20       |
| Historical   | 0.30 | 0.35 | 0.15      | 0.10 | 0.10       |
| Lake         | 0.30 | 0.30 | 0.15      | 0.10 | 0.15       |

**Recommendation thresholds:**

| Score    | Recommendation      |
|----------|---------------------|
| ≥ 80     | Excellent for travel |
| ≥ 60     | Good for travel     |
| ≥ 40     | Moderate            |
| < 40     | Not recommended     |

---

## API Endpoints

| Endpoint                                    | Description                                        |
|---------------------------------------------|----------------------------------------------------|
| `GET /api/divisions`                        | All 8 divisions with district/destination counts   |
| `GET /api/districts?division=Chattogram`    | Districts of one division                          |
| `GET /api/districts/all`                    | All 64 districts                                   |
| `GET /api/destinations`                     | List all destinations (no weather)                 |
| `GET /api/destinations/:id?date=YYYY-MM-DD` | One destination + optional weather & score         |
| `GET /api/recommendations?date=YYYY-MM-DD`  | Weather + score for all, sorted high → low         |
| `GET /api/weather?lat=LAT&lon=LON&date=..`  | Weather + score for any lat/lon (or `id=`)         |

Errors are returned as `{ "error": "message" }` with appropriate status codes
(400 invalid date, 404 unknown destination, 502 weather API failure).

---

## How to Run

### Option A — single server (easiest)

```bash
cd backend
npm start
```

Open **http://localhost:3000** — Express serves the `frontend/` folder too.
(On Windows you can also just run `start_server.bat` in the repo root.)

### Option B — separate frontend server

```bash
# Terminal 1 — backend
cd backend && npm start

# Terminal 2 — static server for the frontend
npx serve frontend
```

---

## Data Source

- `data/destinations.json` — 235 destinations across all 64 districts and
  8 divisions of Bangladesh, each with real lat/lon coordinates, a category
  (`Beach`, `Hill`, `Nature`, `Forest`, `Historical`, `Lake`, `City`,
  `Museum`), short description, recommended activities, and (where available)
  a Wikimedia Commons image. Destinations without photos simply omit the
  `image` field.
- `data/districts.json` — the 64 districts with division, centroid
  coordinates, and destination counts (kept in sync with destinations.json).
- Live weather: [OpenWeather](https://openweathermap.org) — current weather +
  5-day/3-hour forecast endpoints.

### Current data coverage

| Division   | Destinations |
|------------|-------------:|
| Dhaka      | 55 |
| Khulna     | 34 |
| Rajshahi   | 33 |
| Chattogram | 25 |
| Sylhet     | 24 |
| Barishal   | 23 |
| Rangpur    | 24 |
| Mymensingh | 17 |
| **Total**  | **235** |

Images: ~156/235 destinations have photos; image population is ongoing.
Chattogram Division is currently the thinnest outside Chattogram district —
Khagrachhari, Cumilla, Chandpur, Feni, Lakshmipur and Noakhali have no
destinations yet.