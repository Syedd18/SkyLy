# SkyLy — Air Quality Intelligence Platform

> Real-time air quality monitoring, historical analytics, ML-based AQI forecasting, and AI-powered health insights for 200+ Indian cities.

![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat&logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat&logo=supabase&logoColor=white)
![XGBoost](https://img.shields.io/badge/XGBoost-2.1-E83524?style=flat)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Machine Learning](#machine-learning)
- [Frontend Pages](#frontend-pages)
- [Deployment](#deployment)
- [Project Structure](#project-structure)

---

## Overview

SkyLy is a full-stack air quality intelligence platform that combines live ground-sensor data, satellite-based pollutant readings, a trained XGBoost forecasting model, and Google Gemini AI to deliver actionable air quality insights across India.

---

## Features

- **Live AQI** — Real-time city and per-station AQI pulled from ground sensors
- **Pollutant Breakdown** — PM2.5, PM10, NO2, SO2, CO, O3 per station
- **Satellite Data** — Open-Meteo aerosol and pollutant model data mapped across all cities
- **Historical Analytics** — Yearly, seasonal, and monthly AQI trend analysis
- **ML Forecasting** — Multi-day AQI forecast using a trained XGBoost model
- **City Comparison** — Side-by-side AQI chart comparison of two cities
- **AI Health Insights** — Natural language health advice powered by Google Gemini
- **Nearby Stations** — Geolocation-based station discovery within a configurable radius
- **User Accounts** — Registration, login, OAuth, and favorite cities via Supabase Auth
- **City Ranking** — Real-time ranking of all cities by AQI

---

## Tech Stack

### Backend

| Layer | Technology |
|---|---|
| Framework | FastAPI 0.115 |
| Server | Gunicorn + Uvicorn |
| Language | Python 3.11 |
| Database | Supabase PostgreSQL (`psycopg3`) |
| Authentication | Supabase Auth + JWT (`python-jose`, HS256) |
| Password Hashing | `bcrypt` via `passlib` |
| ML — Forecasting | XGBoost 2.1 |
| ML — Preprocessing | scikit-learn 1.5 |
| Data Processing | pandas 2.2, NumPy 2.1 |
| AI / NLP | Google Gemini (`google-generativeai`) |
| Background Jobs | APScheduler |
| HTTP Client | `requests` |
| Config | `python-dotenv` |

### Frontend

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI | React 19 |
| Styling | Tailwind CSS v4 |
| Component Primitives | Radix UI (Dialog, Select, Tabs) |
| Icons | `lucide-react` |
| Charts | Recharts |
| Maps | Leaflet + `react-leaflet` |
| Auth Client | `@supabase/supabase-js` |
| Theme | `next-themes` |
| Class Utilities | `clsx`, `tailwind-merge`, `class-variance-authority` |

### Infrastructure

| Service | Role |
|---|---|
| Render | Backend hosting (Python web service) |
| Vercel | Frontend hosting (Next.js) |
| Supabase | PostgreSQL database + Auth |

---

## Architecture

```
Browser
  
  
Next.js Frontend (Vercel)
    REST API
  
FastAPI Backend (Render)
   WAQI API             real-time ground AQI + station data
   Open-Meteo API       satellite pollutants + weather
   Supabase DB          users, favorites, ingested AQI history
   CSV Dataset          historical city AQI (2015–present)
   XGBoost Model        multi-day AQI forecasting
   Google Gemini        AI health insights
   APScheduler          hourly background ingestion
```

**Data flow:**

1. On startup the backend loads historical CSV data into memory and auto-trains the XGBoost model in a background thread if no model artifact exists.
2. APScheduler runs an hourly job that fetches fresh AQI and weather for all 63 tracked cities and writes them to Supabase.
3. The frontend calls backend endpoints on each page load; maps render with Leaflet, charts render with Recharts.
4. Auth is handled end-to-end by Supabase Auth. The backend validates Supabase JWTs and maintains a local `app_users` table for favorites and preferences.

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- A [Supabase](https://supabase.com) project with Auth enabled
- A [WAQI](https://aqicn.org/data-platform/token/) API token
- A [Google Gemini](https://ai.google.dev) API key

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/your-username/skyly.git
cd skyly

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and fill in environment variables
cp .env.example .env
# Edit .env with your keys (see Environment Variables section)

# Start the development server
uvicorn Backend.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend-new

# Install dependencies
npm install

# Copy and fill in environment variables
cp .env.local.example .env.local
# Edit .env.local with your keys

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:3000` and will proxy `/api/*` requests to your backend.

---

## Environment Variables

> **Never commit `.env` or `.env.local` to version control.** Use your hosting provider's secret manager for production values.

### Backend — `.env`

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` |  | Supabase PostgreSQL connection string |
| `SUPABASE_URL` |  | Supabase project URL |
| `SUPABASE_ANON_KEY` |  | Supabase anonymous (publishable) key |
| `SUPABASE_SERVICE_ROLE_KEY` |  | Supabase service role key (server-side user creation) |
| `SECRET_KEY` |  | Random secret string for JWT signing |
| `WAQI_TOKEN` |  | WAQI API token for real-time AQI data |
| `GEMINI_API_KEY` |  | Google Gemini API key for AI insights |
| `ENABLE_AUTO_INGESTION` |  | `true` to run hourly ingestion job (default: `true`) |
| `INGESTION_INTERVAL_MINUTES` |  | Ingestion frequency in minutes (default: `60`) |
| `ENABLE_AUTO_RETRAINING` |  | `true` to retrain model nightly (default: `false`) |
| `RETRAINING_HOUR` |  | UTC hour for nightly retraining (default: `3`) |

### Frontend — `.env.local`

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Your deployed backend URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |

---

## API Reference

### Core

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/cities` | All cities from dataset |
| `GET` | `/cities/all` | All cities with coordinates |
| `GET` | `/cities/available` | Cities with live AQI (concurrent WAQI fetch) |

### Live AQI

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/live/aqi?city={city}` | Real-time AQI for a city |
| `GET` | `/live/aqi/stations?city={city}` | All monitoring stations in a city |

### Historical Analytics

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/analytics?city={city}` | Full historical AQI series |
| `GET` | `/compare?city1={city1}&city2={city2}` | Two-city AQI comparison |
| `GET` | `/api/historical/yearly-comparison/{city}` | Year-over-year averages |
| `GET` | `/api/historical/seasonal-trends/{city}` | Seasonal AQI averages |
| `GET` | `/api/historical/best-worst-times/{city}` | Best and worst months |

### Satellite / Open-Meteo

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/satellite/live?city={city}` | Satellite-based pollutants + US/EU AQI |
| `GET` | `/satellite/map` | Satellite data for all cities |

### Prediction

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/predict?pm25=..&pm10=..&no2=..&so2=..&co=..&o3=..` | AQI estimate from pollutant inputs |

### Location

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/location/nearby-stations?lat={lat}&lng={lng}&radius_km={r}` | Nearby stations within radius |

### Alerts

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/alerts` | Create an AQI alert rule |
| `GET` | `/alerts` | List all alert rules |

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register via Supabase Auth |
| `POST` | `/api/auth/login` | Login, returns access token |
| `POST` | `/api/auth/supabase-callback` | OAuth callback handler |
| `GET` | `/api/auth/me` | Current user profile *(protected)* |

### Favorites

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/favorites` | List favorite cities with AQI |
| `POST` | `/api/favorites/{city}` | Add a city to favorites |
| `DELETE` | `/api/favorites/{city}` | Remove a city from favorites |

### Intelligence Engine

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/intelligence/forecast?city={city}&days={n}` | Multi-day XGBoost AQI forecast |
| `GET` | `/api/intelligence/predict?city={city}&date={date}` | Single-point AQI prediction |
| `GET` | `/api/intelligence/clusters` | City cluster assignments |
| `GET` | `/api/intelligence/metrics` | Model metrics (MAE, RMSE, R) |
| `POST` | `/api/intelligence/ingest` | Trigger manual data ingestion |
| `POST` | `/api/intelligence/train` | Trigger model retraining |
| `POST` | `/api/intelligence/cluster` | Trigger clustering pipeline |
| `GET` | `/api/intelligence/health` | Intelligence engine status |

---

## Machine Learning

### XGBoost AQI Forecaster

One model is trained across all cities — city cluster membership is a feature, not a model split. This allows the model to generalise patterns across similar cities with limited data.

**Features used:**

| Category | Features |
|---|---|
| Temporal | `hour`, `day_of_month`, `month`, `day_of_week`, `is_weekend` |
| Lag | `aqi_lag_1`, `aqi_lag_7`, `aqi_lag_14` |
| Rolling | `rolling_7d_mean`, `rolling_30d_mean` |
| Weather | `temperature`, `humidity`, `wind_speed` |
| Cluster | `cluster_id` |

**Validation:** `TimeSeriesSplit` cross-validation  
**Metrics:** MAE, RMSE, R — saved to `Backend/models/forecast_metrics.json`  
**Artifacts:** `forecast_xgb.pkl`, `forecast_city_encoder.pkl`, `forecast_features.json`

### City Clustering

Cities are grouped by historical AQI behaviour using K-means (scikit-learn) on normalized time-series features. Cluster assignments are saved to `Backend/models/cluster_metadata.json` and used as a feature in the forecasting model.

---

## Frontend Pages

| Route | Description |
|---|---|
| `/` | Home — platform overview |
| `/live` | Live AQI — real-time city AQI with pollutant breakdown |
| `/map` | Map — interactive Leaflet map of all cities |
| `/nearby` | Nearby — stations around the user's geolocation |
| `/ranking` | Ranking — cities sorted by current AQI |
| `/analytics` | Analytics — historical AQI charts |
| `/historical` | Historical — yearly/seasonal/monthly trends |
| `/compare` | Compare — side-by-side two-city chart |
| `/predict` | Predict — AQI estimation from pollutant inputs |
| `/insights` | Insights — Gemini AI health advice + XGBoost forecast |
| `/search` | Search — city search with AQI preview |
| `/auth` | Auth — login and registration |
| `/about` | About |
| `/privacy` | Privacy Policy |
| `/terms` | Terms of Service |

---

## Deployment

### Backend (Render)

The backend is configured via `render.yaml`:

- **Runtime:** Python 3.11
- **Build:** `pip install -r requirements.txt`
- **Start:** `bash render_start.sh` (Gunicorn + Uvicorn workers)
- **Health check:** `GET /api/health`
- **Persistent disk:** 1 GB for model artifacts

Set all required environment variables in the Render dashboard under **Environment**.

### Frontend (Vercel)

The frontend is configured via `vercel.json` which rewrites `/api/*` requests to your backend URL. Set the following in Vercel's **Environment Variables** settings:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Project Structure

```
skyly/
 Backend/
    main.py                   # FastAPI app + all API routes
    auth.py                   # Auth, JWT, Supabase, user DB
    scheduler.py              # APScheduler background jobs
    intelligence/
       ingestion.py          # Hourly WAQI + Open-Meteo ingestion
       forecasting.py        # XGBoost training + inference
       clustering.py         # K-means city clustering
       schema.py             # DB schema + connection management
       serving.py            # /api/intelligence/* router
    models/
       forecast_xgb.pkl      # Trained XGBoost model
       forecast_metrics.json
       forecast_features.json
       cluster_metadata.json
    Dataset/
        aqi_timeseries.csv    # Historical AQI data

 Dataset/
    aqi_timeseries.csv        # Root-level dataset (used at runtime)

 frontend-new/
    src/
       app/                  # Next.js App Router pages
       components/           # Shared UI components
       contexts/             # AuthContext (Supabase session)
       lib/                  # API helpers + utilities
       types/                # TypeScript type definitions
    package.json
    next.config.js
    vercel.json

 requirements.txt              # Python dependencies
 render.yaml                   # Render deployment config
 render_start.sh               # Gunicorn start script
 .env.example                  # Environment variable template
 .gitignore
```

---

## License

This project is for educational and portfolio purposes.
