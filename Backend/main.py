from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests
import pandas as pd
from pathlib import Path

# ---------------- APP ----------------
app = FastAPI(title="Air Quality Intelligence API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- CONSTANTS ----------------
WAQI_TOKEN = "9fe0a55684bf08d8c8131b1cba6233542f86f55d"

BASE_DIR = Path(__file__).parent
CSV_PATH = BASE_DIR / "Dataset" / "aqi_timeseries.csv"

# ---------------- LOAD DATA ----------------
if not CSV_PATH.exists():
    raise RuntimeError(f"❌ CSV NOT FOUND at {CSV_PATH}")

df = pd.read_csv(CSV_PATH)

# ---- COLUMN DETECTION (NO ASSUMPTIONS) ----
CITY_COL = next(c for c in df.columns if c.lower() == "city")
AQI_COL = next(c for c in df.columns if c.lower() == "aqi")

DATE_COL = None
for c in df.columns:
    if c.lower() in ["date", "datetime", "timestamp"]:
        DATE_COL = c
        break

if DATE_COL is None:
    raise RuntimeError("❌ No Date / Datetime column found in CSV")

df[DATE_COL] = pd.to_datetime(df[DATE_COL])

# ---------------- ROUTES ----------------

@app.get("/")
def root():
    return {"status": "API running successfully"}

# -------- CITIES --------
@app.get("/cities")
def cities():
    return sorted(df[CITY_COL].dropna().unique().tolist())

# -------- LIVE AQI --------
@app.get("/live/aqi")
def live_aqi(city: str):
    url = f"https://api.waqi.info/feed/{city}/"
    res = requests.get(url, params={"token": WAQI_TOKEN}, timeout=10)

    data = res.json()

    if data.get("status") != "ok":
        raise HTTPException(404, "Live AQI not available")

    d = data["data"]

    return {
        "city": d.get("city", {}).get("name"),
        "aqi": d.get("aqi"),
        "dominant_pollutant": d.get("dominentpol"),
        "components": d.get("iaqi", {}),
        "time": d.get("time", {}).get("s")
    }

# -------- ANALYTICS (LAST 1 YEAR) --------
@app.get("/analytics")
def analytics(city: str):
    sub = df[df[CITY_COL] == city].sort_values(DATE_COL).tail(365)

    if sub.empty:
        raise HTTPException(404, "No data for city")

    return {
        "dates": sub[DATE_COL].astype(str).tolist(),
        "aqi": sub[AQI_COL].tolist()
    }

# -------- COMPARE --------
@app.get("/compare")
def compare(city1: str, city2: str):
    d1 = df[df[CITY_COL] == city1].sort_values(DATE_COL).tail(365)
    d2 = df[df[CITY_COL] == city2].sort_values(DATE_COL).tail(365)

    if d1.empty or d2.empty:
        raise HTTPException(404, "City data missing")

    return {
        "city1": {
            "name": city1,
            "dates": d1[DATE_COL].astype(str).tolist(),
            "aqi": d1[AQI_COL].tolist()
        },
        "city2": {
            "name": city2,
            "dates": d2[DATE_COL].astype(str).tolist(),
            "aqi": d2[AQI_COL].tolist()
        }
    }

# -------- PREDICT (SAFE BASELINE) --------
@app.get("/predict")
def predict(
    pm25: float,
    pm10: float,
    no2: float,
    so2: float,
    co: float,
    o3: float
):
    """
    Safe prediction placeholder.
    Replace logic after model stabilizes.
    """
    predicted_aqi = round(
        (pm25 * 0.4) +
        (pm10 * 0.2) +
        (no2 * 0.15) +
        (so2 * 0.1) +
        (co * 0.1) +
        (o3 * 0.05),
        2
    )

    return {
        "predicted_aqi": predicted_aqi,
        "note": "Baseline prediction (model integration pending)"
    }