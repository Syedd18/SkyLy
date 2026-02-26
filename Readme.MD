# SkyLy — Air Quality Intelligence Platform

Real-time air quality monitoring, historical analytics, ML-based AQI forecasting, and AI-powered health insights for Indian cities.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [How It Works](#how-it-works)
- [Backend Architecture](#backend-architecture)
  - [API Endpoints](#api-endpoints)
  - [Authentication](#authentication)
  - [Intelligence Engine](#intelligence-engine)
  - [Background Scheduler](#background-scheduler)
  - [Data Sources](#data-sources)
  - [Database](#database)
- [Frontend Architecture](#frontend-architecture)
  - [Pages](#pages)
  - [Key Libraries](#key-libraries)
- [Machine Learning](#machine-learning)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)

---

## Project Overview

SkyLy monitors air quality across 200+ Indian cities. It combines ground-sensor data (WAQI), satellite/model data (Open-Meteo), historical CSV datasets, and a trained XGBoost model to provide:

- Live AQI readings with per-station breakdowns
- Pollutant-level data (PM2.5, PM10, NO2, SO2, CO, O3)
- Historical analytics and seasonal trends
- Multi-day AQI forecasting using ML
- City-to-city comparison
- AI health insights via Google Gemini
- User accounts with favorite cities
- Satellite/aerosol map of all cities

---

## Tech Stack

### Backend

| Layer | Technology |
|---|---|
| Framework | FastAPI 0.115 |
| Server | Uvicorn + Gunicorn |
| Language | Python 3.11 |
| Database | Supabase PostgreSQL (via psycopg3) |
| Authentication | Supabase Auth + JWT (python-jose) |
| Password Hashing | bcrypt (passlib) |
| ML - Forecasting | XGBoost 2.1 |
| ML - Preprocessing | scikit-learn 1.5 |
| Data Processing | pandas 2.2, numpy 2.1 |
| AI / Chatbot | Google Gemini (google-generativeai) |
| Background Jobs | APScheduler |
| HTTP Client | requests |
| Environment Config | python-dotenv |

### Frontend

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI Library | React 19 |
| Styling | Tailwind CSS v4 |
| Component Primitives | Radix UI (Dialog, Select, Tabs) |
| Icons | lucide-react |
| Charts | Recharts |
| Maps | Leaflet + react-leaflet |
| Auth Client | @supabase/supabase-js |
| Theme | next-themes |
| Utilities | clsx, tailwind-merge, class-variance-authority |

### Infrastructure

| Service | Purpose |
|---|---|
| Render (free tier) | Backend hosting (Python web service) |
| Vercel | Frontend hosting (Next.js) |
| Supabase | PostgreSQL database + Auth |

---

## How It Works

```
User Browser
    |
    v
Frontend (Next.js on Vercel)
    |  REST API calls
    v
Backend (FastAPI on Render)
    +--- WAQI API          -> real-time ground AQI + station data
    +--- Open-Meteo API    -> satellite-based pollutants + weather
    +--- Supabase DB       -> user accounts, favorites, ingested AQI history
    +--- CSV Dataset       -> historical city AQI (2015-present)
    +--- XGBoost Model     -> multi-day AQI forecasting
    +--- Google Gemini     -> AI health insights & chatbot
    +--- APScheduler       -> hourly background data ingestion
```

1. **On startup**, the backend loads historical CSV data into a pandas DataFrame and checks whether a trained XGBoost model exists. If not, it trains one in a background thread using live ingested data or the CSV as fallback.
2. **APScheduler** runs an hourly ingestion job that calls WAQI and Open-Meteo for all 63 tracked cities and stores results in Supabase PostgreSQL.
3. **The frontend** fetches from the backend API on every page load. Maps use Leaflet with dynamic city markers. Charts use Recharts to visualize historical and forecast data.
4. **User auth** flows through Supabase Auth (email/password and OAuth). The backend validates Supabase JWT tokens and maintains a local user table for favorites and preferences.

---

## Backend Architecture

### API Endpoints

#### Core

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | API root |
| GET | `/api/health` | Uptime/health check for Render |
| GET | `/cities` | List all cities from CSV |
| GET | `/cities/all` | All cities with coordinates |
| GET | `/cities/available` | Cities with live AQI from WAQI (concurrent fetch) |

#### Live AQI

| Method | Endpoint | Description |
|---|---|---|
| GET | `/live/aqi?city=Delhi` | Real-time AQI for a city (highest station selected) |
| GET | `/live/aqi/stations?city=Delhi` | All monitoring stations in a city with AQI + pollutants |

#### Analytics (Historical)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/analytics?city=Delhi` | Full historical AQI series from CSV |
| GET | `/compare?city1=Delhi&city2=Mumbai` | Side-by-side historical AQI comparison |
| GET | `/api/historical/yearly-comparison/{city}` | Year-over-year AQI averages |
| GET | `/api/historical/seasonal-trends/{city}` | Seasonal AQI averages (Winter/Spring/Summer/Autumn) |
| GET | `/api/historical/best-worst-times/{city}` | Best and worst months for air quality |

#### Satellite / Open-Meteo

| Method | Endpoint | Description |
|---|---|---|
| GET | `/satellite/live?city=Delhi` | Satellite-based PM10, PM2.5, gases, US/EU AQI for a city |
| GET | `/satellite/map` | Satellite data for all cities (used for the AOD map) |

#### ML Prediction

| Method | Endpoint | Description |
|---|---|---|
| GET | `/predict?pm25=..&pm10=..&no2=..&so2=..&co=..&o3=..` | Simple weighted AQI estimation from pollutant inputs |

#### Location

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/location/nearby-stations?lat=..&lng=..&radius_km=20` | WAQI stations within radius using bounding box + Haversine |

#### Alerts

| Method | Endpoint | Description |
|---|---|---|
| POST | `/alerts` | Create AQI alert rule |
| GET | `/alerts` | List stored alert rules |

#### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register user via Supabase Auth |
| POST | `/api/auth/login` | Login via Supabase, returns access token |
| POST | `/api/auth/supabase-callback` | OAuth callback: validate Supabase token, return backend JWT |
| GET | `/api/auth/me` | Current user profile (JWT-protected) |

#### Favorites

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/favorites` | Get favorite cities with current AQI |
| POST | `/api/favorites/{city_name}` | Add city to favorites |
| DELETE | `/api/favorites/{city_name}` | Remove city from favorites |

#### Intelligence Engine

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/intelligence/forecast?city=Delhi&days=7` | Multi-day XGBoost AQI forecast |
| GET | `/api/intelligence/predict?city=Delhi&date=2026-03-01` | Single-point AQI prediction |
| GET | `/api/intelligence/clusters` | City cluster assignments and metadata |
| GET | `/api/intelligence/metrics` | Model evaluation metrics (MAE, RMSE, R2) |
| POST | `/api/intelligence/ingest` | Manually trigger data ingestion cycle |
| POST | `/api/intelligence/train` | Manually trigger model training |
| POST | `/api/intelligence/cluster` | Manually trigger clustering pipeline |
| GET | `/api/intelligence/health` | Intelligence engine health status |

#### Debug

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/debug/db-status` | Database connection status, user/favorites count |
| GET | `/debug/env` | Supabase config flags (no secrets exposed) |

---

### Authentication

Authentication is handled in `Backend/auth.py`:

- **Primary**: Supabase Auth (email/password + OAuth via Google etc.)
- **Token type**: Supabase JWT returned to client; backend also issues its own JWT via `python-jose` for protected endpoints
- **Algorithm**: HS256, 7-day expiry
- **Local user table**: `app_users` in Supabase PostgreSQL, mirroring Supabase Auth users for storing favorites and preferences
- **Database tables**:
  - `app_users` — user profiles
  - `app_favorite_cities` — user to city mappings
  - `app_user_preferences` — theme, notification settings, AQI alert threshold
- **Supabase Admin API** is used server-side to create users (requires `SUPABASE_SERVICE_ROLE_KEY`)

---

### Intelligence Engine

Located in `Backend/intelligence/`, this module handles the full ML pipeline:

#### ingestion.py
- Fetches live AQI from the **WAQI API** and weather from **Open-Meteo** for 63 Indian cities every hour
- Stores results in the `aqi_readings` table in Supabase PostgreSQL
- Uses `ThreadPoolExecutor` for parallel city fetching

#### forecasting.py
- **Model**: XGBoost Regressor (one model covering all cities; city cluster is a feature)
- **Features**: lag features (lag_1, lag_7, lag_14), rolling averages (7d, 30d), weather (temp, humidity, wind speed), time features (hour, day, month, weekday, is_weekend), cluster ID
- **Training**: Uses live Supabase data; falls back to `Dataset/aqi_timeseries.csv`
- **Output**: Multi-day AQI forecast with confidence intervals via quantile regression
- **Storage**: Model artifacts stored as `.pkl` and `.json` in `Backend/models/`
- Auto-trains on startup if `Backend/models/forecast_xgb.pkl` does not exist

#### clustering.py
- Groups cities by AQI behavior patterns using K-means (scikit-learn)
- Cluster assignments stored in `Backend/models/cluster_metadata.json`
- Cluster ID is used as a feature in the forecasting model

#### schema.py
- Table definitions and connection management for the intelligence DB
- Manages connections to Supabase PostgreSQL

#### serving.py
- FastAPI `APIRouter` exposing all intelligence endpoints under `/api/intelligence/*`
- Included into the main FastAPI app at startup

---

### Background Scheduler

`Backend/scheduler.py` uses **APScheduler** to run background tasks:

- **Hourly data ingestion**: calls `run_ingestion()` to fetch fresh AQI and weather for all cities
- **Optional nightly retraining**: controlled by `ENABLE_AUTO_RETRAINING` and `RETRAINING_HOUR` env vars
- Starts on FastAPI app startup event, stops on shutdown event

---

### Data Sources

| Source | What It Provides | Auth Required |
|---|---|---|
| WAQI API (api.waqi.info) | Real-time ground-station AQI, PM2.5, PM10, NO2, SO2, CO, O3 | WAQI_TOKEN |
| Open-Meteo Air Quality | Satellite/model-based PM10, PM2.5, dust, CO, NO2, SO2, O3, US/EU AQI | None (free) |
| Open-Meteo Weather | Temperature, wind speed, wind direction | None (free) |
| Google Gemini | AI health insights and natural language responses | GEMINI_API_KEY |
| Dataset/aqi_timeseries.csv | Historical AQI for Indian cities (2015 to present) | Local file |

---

### Database

Supabase PostgreSQL via `psycopg3` (`psycopg[binary]`), configured through `DATABASE_URL`.

Tables:
- `app_users` — registered users
- `app_favorite_cities` — user favorite cities
- `app_user_preferences` — per-user settings
- `aqi_readings` — ingested live city and weather data (intelligence schema)
- `model_metadata` — active model version tracking
- `forecast_cache` — cached recent forecast results

---

## Frontend Architecture

The frontend lives in `frontend-new/` and is a **Next.js 16 App Router** app written in TypeScript.

### Pages

| Route | Page | What It Does |
|---|---|---|
| `/` | Home | Landing page with platform overview |
| `/live` | Live AQI | Real-time AQI for a searched city with pollutant breakdown |
| `/map` | Map | Interactive Leaflet map of all cities with AQI markers |
| `/nearby` | Nearby | AQI stations near the user's geolocation |
| `/ranking` | Ranking | City ranking by current AQI (cleanest to most polluted) |
| `/analytics` | Analytics | Historical AQI line charts for a selected city |
| `/historical` | Historical | Yearly comparison, seasonal trends, best/worst months |
| `/compare` | Compare | Side-by-side chart comparison of two cities |
| `/predict` | Predict | Input pollutant values to get estimated AQI |
| `/insights` | Insights | AI health insights and forecasting (Gemini + XGBoost) |
| `/search` | Search | City search with AQI preview |
| `/auth` | Auth | Login and Register with Supabase |
| `/about` | About | Project information |
| `/privacy` | Privacy | Privacy policy |
| `/terms` | Terms | Terms of service |

### Key Libraries

| Library | Version | Used For |
|---|---|---|
| next | 16.1.1 | App framework, routing, SSR/SSG |
| react / react-dom | 19.2.3 | UI rendering |
| tailwindcss | v4 | Utility-first styling |
| @supabase/supabase-js | ^2.91 | Supabase Auth client (login, OAuth) |
| recharts | ^3.6 | Line charts and area charts (AQI history, forecasts) |
| leaflet + react-leaflet | ^1.9 / ^5.0 | Interactive city maps with AQI markers |
| @radix-ui/react-dialog | ^1.1 | Accessible modal dialogs |
| @radix-ui/react-select | ^2.2 | Accessible dropdown selects |
| @radix-ui/react-tabs | ^1.1 | Tabbed interface components |
| lucide-react | ^0.562 | Icon set |
| next-themes | ^0.4.6 | Dark/light mode switching |
| clsx + tailwind-merge | latest | Conditional className utilities |
| class-variance-authority | ^0.7 | Variant-based component styling |

### Global Layout

`src/app/layout.tsx` wraps all pages with:
- `ThemeProvider` (next-themes) — dark/light/system theme support
- `AuthProvider` (custom context) — user session state from Supabase
- `Navigation` — top nav bar
- `Footer` — bottom footer

---

## Machine Learning

### Model: XGBoost AQI Forecaster

- **Type**: XGBRegressor (gradient-boosted trees)
- **Architecture**: One model trained on all cities; city cluster is a feature rather than separate models per city
- **Input features**:
  - Temporal: `hour`, `day_of_month`, `month`, `day_of_week`, `is_weekend`
  - Lag: `aqi_lag_1` (yesterday), `aqi_lag_7` (last week), `aqi_lag_14`
  - Rolling: `rolling_7d_mean`, `rolling_30d_mean`
  - Weather: `temperature`, `humidity`, `wind_speed`
  - Cluster: `cluster_id` (from K-means grouping of cities)
- **Validation**: `TimeSeriesSplit` cross-validation
- **Metrics**: MAE, RMSE, R2 stored in `Backend/models/forecast_metrics.json`
- **Artifacts**: `forecast_xgb.pkl`, `forecast_city_encoder.pkl`, `forecast_features.json`

### Clustering

- Cities are grouped into clusters based on historical AQI behavior patterns
- K-means (via scikit-learn) on normalized AQI time series features
- Cluster assignments stored in `Backend/models/cluster_metadata.json`
- Cluster ID is used as a feature in the forecasting model, enabling learned patterns to transfer across similar cities

---

## Deployment

### Backend — Render

- Runtime: Python 3.11
- Region: Oregon (us-west)
- Plan: Free
- Build command: `pip install -r requirements.txt`
- Start command: `bash render_start.sh` (runs Gunicorn + Uvicorn workers)
- Health check path: `/api/health`
- Persistent disk: 1 GB mounted at `/data`
- Auto-ingestion: enabled every 60 minutes via environment variable

### Frontend — Vercel

- Framework: Next.js (auto-detected)
- API proxy: `vercel.json` rewrites `/api/*` to `https://skyly-2.onrender.com/api/*`
- Build env: `NEXT_PUBLIC_API_URL=https://skyly-2.onrender.com`

---

## Environment Variables

### Backend (Render dashboard or `.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes (prod) | Supabase PostgreSQL connection string |
| `WAQI_TOKEN` | Yes | WAQI API token for real-time ground AQI |
| `GEMINI_API_KEY` | Yes | Google Gemini API key for AI insights |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (auth) | Supabase service role key for admin user creation |
| `SECRET_KEY` | Yes | JWT signing secret |
| `ENABLE_AUTO_INGESTION` | No | Set to "true" to run hourly ingestion (default: true) |
| `INGESTION_INTERVAL_MINUTES` | No | Ingestion frequency in minutes (default: 60) |
| `ENABLE_AUTO_RETRAINING` | No | Set to "true" to retrain model nightly (default: false) |
| `RETRAINING_HOUR` | No | Hour (UTC) to run retraining (default: 3) |

### Frontend (Vercel / `.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL (https://skyly-2.onrender.com) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |

---

## Project Structure

```
Air Pollution/
+-- Backend/
|   +-- main.py                  # FastAPI app, all core API routes
|   +-- auth.py                  # User auth, JWT, Supabase integration, DB
|   +-- scheduler.py             # APScheduler background jobs
|   +-- intelligence/
|   |   +-- ingestion.py         # Hourly WAQI + Open-Meteo data ingestion
|   |   +-- forecasting.py       # XGBoost model training and inference
|   |   +-- clustering.py        # K-means city clustering
|   |   +-- schema.py            # DB schema and connection management
|   |   +-- serving.py           # FastAPI router for /api/intelligence/*
|   +-- models/
|   |   +-- forecast_xgb.pkl     # Trained XGBoost model
|   |   +-- forecast_metrics.json
|   |   +-- forecast_features.json
|   |   +-- cluster_metadata.json
|   +-- Dataset/
|       +-- aqi_timeseries.csv   # Historical city AQI data
|
+-- Dataset/
|   +-- aqi_timeseries.csv       # Root-level copy used by backend at runtime
|
+-- frontend-new/                # Next.js 16 frontend
|   +-- src/
|   |   +-- app/                 # App Router pages
|   |   |   +-- page.tsx         # Home
|   |   |   +-- live/            # Live AQI
|   |   |   +-- map/             # Interactive map
|   |   |   +-- nearby/          # Nearby stations
|   |   |   +-- ranking/         # City ranking
|   |   |   +-- analytics/       # Historical charts
|   |   |   +-- historical/      # Yearly/seasonal trends
|   |   |   +-- compare/         # City comparison
|   |   |   +-- predict/         # AQI predictor
|   |   |   +-- insights/        # AI + forecast insights
|   |   |   +-- search/          # City search
|   |   |   +-- auth/            # Login / Register
|   |   +-- components/          # Shared UI components
|   |   +-- contexts/            # AuthContext (Supabase session)
|   |   +-- lib/                 # API helpers, utils
|   |   +-- types/               # TypeScript type definitions
|   +-- package.json
|   +-- next.config.js
|   +-- vercel.json              # Vercel deployment config + API rewrite
|
+-- requirements.txt             # Python dependencies
+-- render.yaml                  # Render deployment blueprint
+-- render_start.sh              # Gunicorn startup script
+-- .env                         # Local environment variables (not committed)
```
