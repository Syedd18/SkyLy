"""
Data Ingestion Service for SkyLy AQI Platform
===============================================
Fetches live AQI & weather data for all Indian cities and stores in DB.
Designed to run hourly via cron, background thread, or manual trigger.

Data sources:
    - WAQI API (api.waqi.info)   → AQI, PM2.5, PM10, NO2, SO2, CO, O3
    - Open-Meteo                  → temperature, humidity, wind speed/dir

⚠️  STORAGE: All data saved to Supabase PostgreSQL (set DATABASE_URL in .env).
   Falls back to SQLite only if DATABASE_URL not configured.
"""
import os
import logging
import time
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional
from dotenv import load_dotenv

import requests

load_dotenv()  # Load .env file

from .schema import get_intel_conn

logger = logging.getLogger("skyly.ingestion")

WAQI_TOKEN = os.getenv("WAQI_TOKEN", "")
OPEN_METEO_AQ_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
OPEN_METEO_WEATHER_URL = "https://api.open-meteo.com/v1/forecast"

# 63 major Indian cities with coordinates
INDIAN_CITIES = [
    {"name": "Delhi", "lat": 28.6139, "lng": 77.2090, "state": "Delhi"},
    {"name": "Mumbai", "lat": 19.0760, "lng": 72.8777, "state": "Maharashtra"},
    {"name": "Bangalore", "lat": 12.9716, "lng": 77.5946, "state": "Karnataka"},
    {"name": "Hyderabad", "lat": 17.3850, "lng": 78.4867, "state": "Telangana"},
    {"name": "Ahmedabad", "lat": 23.0225, "lng": 72.5714, "state": "Gujarat"},
    {"name": "Chennai", "lat": 13.0827, "lng": 80.2707, "state": "Tamil Nadu"},
    {"name": "Kolkata", "lat": 22.5726, "lng": 88.3639, "state": "West Bengal"},
    {"name": "Pune", "lat": 18.5204, "lng": 73.8567, "state": "Maharashtra"},
    {"name": "Jaipur", "lat": 26.9124, "lng": 75.7873, "state": "Rajasthan"},
    {"name": "Lucknow", "lat": 26.8467, "lng": 80.9462, "state": "Uttar Pradesh"},
    {"name": "Kanpur", "lat": 26.4499, "lng": 80.3319, "state": "Uttar Pradesh"},
    {"name": "Nagpur", "lat": 21.1458, "lng": 79.0882, "state": "Maharashtra"},
    {"name": "Indore", "lat": 22.7196, "lng": 75.8577, "state": "Madhya Pradesh"},
    {"name": "Thane", "lat": 19.2183, "lng": 72.9781, "state": "Maharashtra"},
    {"name": "Bhopal", "lat": 23.2599, "lng": 77.4126, "state": "Madhya Pradesh"},
    {"name": "Visakhapatnam", "lat": 17.6868, "lng": 83.2185, "state": "Andhra Pradesh"},
    {"name": "Patna", "lat": 25.6093, "lng": 85.1376, "state": "Bihar"},
    {"name": "Vadodara", "lat": 22.3072, "lng": 73.1812, "state": "Gujarat"},
    {"name": "Ghaziabad", "lat": 28.6692, "lng": 77.4538, "state": "Uttar Pradesh"},
    {"name": "Ludhiana", "lat": 30.9010, "lng": 75.8573, "state": "Punjab"},
    {"name": "Agra", "lat": 27.1767, "lng": 78.0081, "state": "Uttar Pradesh"},
    {"name": "Nashik", "lat": 19.9975, "lng": 73.7898, "state": "Maharashtra"},
    {"name": "Faridabad", "lat": 28.4089, "lng": 77.3178, "state": "Haryana"},
    {"name": "Meerut", "lat": 28.9845, "lng": 77.7064, "state": "Uttar Pradesh"},
    {"name": "Rajkot", "lat": 22.3039, "lng": 70.8022, "state": "Gujarat"},
    {"name": "Varanasi", "lat": 25.3176, "lng": 83.0103, "state": "Uttar Pradesh"},
    {"name": "Srinagar", "lat": 34.0837, "lng": 74.7973, "state": "Jammu & Kashmir"},
    {"name": "Aurangabad", "lat": 19.8762, "lng": 75.3433, "state": "Maharashtra"},
    {"name": "Dhanbad", "lat": 23.7957, "lng": 86.4304, "state": "Jharkhand"},
    {"name": "Amritsar", "lat": 31.6340, "lng": 74.8723, "state": "Punjab"},
    {"name": "Allahabad", "lat": 25.4358, "lng": 81.8463, "state": "Uttar Pradesh"},
    {"name": "Ranchi", "lat": 23.3441, "lng": 85.3096, "state": "Jharkhand"},
    {"name": "Howrah", "lat": 22.5958, "lng": 88.2636, "state": "West Bengal"},
    {"name": "Coimbatore", "lat": 11.0168, "lng": 76.9558, "state": "Tamil Nadu"},
    {"name": "Jabalpur", "lat": 23.1815, "lng": 79.9864, "state": "Madhya Pradesh"},
    {"name": "Gwalior", "lat": 26.2183, "lng": 78.1828, "state": "Madhya Pradesh"},
    {"name": "Vijayawada", "lat": 16.5062, "lng": 80.6480, "state": "Andhra Pradesh"},
    {"name": "Jodhpur", "lat": 26.2389, "lng": 73.0243, "state": "Rajasthan"},
    {"name": "Madurai", "lat": 9.9252, "lng": 78.1198, "state": "Tamil Nadu"},
    {"name": "Raipur", "lat": 21.2514, "lng": 81.6296, "state": "Chhattisgarh"},
    {"name": "Kota", "lat": 25.2138, "lng": 75.8648, "state": "Rajasthan"},
    {"name": "Chandigarh", "lat": 30.7333, "lng": 76.7794, "state": "Chandigarh"},
    {"name": "Guwahati", "lat": 26.1445, "lng": 91.7362, "state": "Assam"},
    {"name": "Solapur", "lat": 17.6599, "lng": 75.9064, "state": "Maharashtra"},
    {"name": "Hubli", "lat": 15.3647, "lng": 75.1240, "state": "Karnataka"},
    {"name": "Tiruchirappalli", "lat": 10.7905, "lng": 78.7047, "state": "Tamil Nadu"},
    {"name": "Bareilly", "lat": 28.3670, "lng": 79.4304, "state": "Uttar Pradesh"},
    {"name": "Moradabad", "lat": 28.8389, "lng": 78.7768, "state": "Uttar Pradesh"},
    {"name": "Mysore", "lat": 12.2958, "lng": 76.6394, "state": "Karnataka"},
    {"name": "Tiruppur", "lat": 11.1085, "lng": 77.3411, "state": "Tamil Nadu"},
    {"name": "Dehradun", "lat": 30.3165, "lng": 78.0322, "state": "Uttarakhand"},
    {"name": "Jamshedpur", "lat": 22.8046, "lng": 86.2029, "state": "Jharkhand"},
    {"name": "Navi Mumbai", "lat": 19.0330, "lng": 73.0297, "state": "Maharashtra"},
    {"name": "Udaipur", "lat": 24.5854, "lng": 73.7125, "state": "Rajasthan"},
    {"name": "Jammu", "lat": 32.7266, "lng": 74.8570, "state": "Jammu & Kashmir"},
    {"name": "Thiruvananthapuram", "lat": 8.5241, "lng": 76.9366, "state": "Kerala"},
    {"name": "Bengaluru", "lat": 12.9716, "lng": 77.5946, "state": "Karnataka"},
    {"name": "Noida", "lat": 28.5355, "lng": 77.3910, "state": "Uttar Pradesh"},
    {"name": "Gurugram", "lat": 28.4595, "lng": 77.0266, "state": "Haryana"},
    {"name": "Bhubaneswar", "lat": 20.2961, "lng": 85.8245, "state": "Odisha"},
    {"name": "Kochi", "lat": 9.9312, "lng": 76.2673, "state": "Kerala"},
    {"name": "Shimla", "lat": 31.1048, "lng": 77.1734, "state": "Himachal Pradesh"},
    {"name": "Gangtok", "lat": 27.3389, "lng": 88.6065, "state": "Sikkim"},
]

# City name normalization
_CITY_ALIASES = {
    "bengaluru": "Bangalore",
    "new delhi": "Delhi",
    "bombay": "Mumbai",
    "calcutta": "Kolkata",
    "madras": "Chennai",
    "trivandrum": "Thiruvananthapuram",
    "pondicherry": "Puducherry",
    "prayagraj": "Allahabad",
}


def normalize_city(name: str) -> str:
    """Normalize city name to canonical form."""
    lower = name.strip().lower()
    return _CITY_ALIASES.get(lower, name.strip().title())


def _get_city_coords(city_name: str) -> Optional[dict]:
    """Look up city lat/lng from INDIAN_CITIES."""
    lower = normalize_city(city_name).lower()
    for c in INDIAN_CITIES:
        if c["name"].lower() == lower:
            return c
    return None


# --------------- WAQI Fetch ---------------

def fetch_waqi_data(city_name: str) -> Optional[dict]:
    """
    Fetch live AQI + components from WAQI API for one city.
    Returns data from the HIGHEST AQI station in the city (for consistency with live page).
    """
    if not WAQI_TOKEN:
        logger.warning("WAQI_TOKEN not set, skipping WAQI fetch")
        return None

    # Search for all stations in the city
    search_url = "https://api.waqi.info/search/"
    try:
        search_res = requests.get(search_url, params={"token": WAQI_TOKEN, "keyword": city_name}, timeout=10)
        search_data = search_res.json()
        stations = search_data.get("data", []) if isinstance(search_data, dict) else []
        
        # Find station with highest AQI
        max_station = None
        for s in stations:
            aqi_raw = s.get("aqi", "-")
            try:
                aqi_val = float(aqi_raw) if aqi_raw != "-" else -1
            except (ValueError, TypeError):
                continue
            if aqi_val < 0:
                continue
            if not max_station or aqi_val > max_station.get("_aqi_val", -1):
                s["_aqi_val"] = aqi_val
                max_station = s
        
        # If no valid station found, fall back to city feed
        if not max_station or not max_station.get("uid"):
            logger.debug(f"No valid stations found for {city_name}, trying city feed")
            url = f"https://api.waqi.info/feed/{city_name}/"
            res = requests.get(url, params={"token": WAQI_TOKEN}, timeout=10)
            data = res.json()
            if data.get("status") != "ok":
                return None
            d = data["data"]
        else:
            # Fetch detailed data from highest AQI station
            uid = max_station.get("uid")
            feed_url = f"https://api.waqi.info/feed/@{uid}/"
            feed_res = requests.get(feed_url, params={"token": WAQI_TOKEN}, timeout=10)
            feed_data = feed_res.json()
            if feed_data.get("status") != "ok":
                return None
            d = feed_data["data"]
        
        iaqi = d.get("iaqi", {})

        # Extract component values (WAQI returns {v: value} objects)
        def _v(key):
            obj = iaqi.get(key)
            if isinstance(obj, dict):
                return obj.get("v")
            return obj

        time_info = d.get("time", {})
        # Prefer ISO (has timezone), fall back to local string
        time_str = time_info.get("iso") or time_info.get("s") or None

        return {
            "aqi": d.get("aqi") if isinstance(d.get("aqi"), (int, float)) else None,
            "pm25": _v("pm25"),
            "pm10": _v("pm10"),
            "no2": _v("no2"),
            "so2": _v("so2"),
            "co": _v("co"),
            "o3": _v("o3"),
            "time": time_str,
            "station": d.get("city", {}).get("name", city_name),
        }
    except Exception as e:
        logger.debug(f"WAQI fetch failed for {city_name}: {e}")
        return None


# --------------- Open-Meteo Weather Fetch ---------------

def fetch_weather(lat: float, lng: float) -> Optional[dict]:
    """Fetch current weather from Open-Meteo for a coordinate."""
    try:
        res = requests.get(OPEN_METEO_WEATHER_URL, params={
            "latitude": lat,
            "longitude": lng,
            "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m",
            "timezone": "auto",
        }, timeout=8)
        data = res.json()
        current = data.get("current", {})
        return {
            "temp": current.get("temperature_2m"),
            "humidity": current.get("relative_humidity_2m"),
            "wind_speed": current.get("wind_speed_10m"),
            "wind_dir": current.get("wind_direction_10m"),
        }
    except Exception as e:
        logger.debug(f"Weather fetch failed for ({lat},{lng}): {e}")
        return None


# --------------- Store Measurement ---------------

def _store_measurement(conn, is_pg: bool, row: dict):
    """Append a new AQI measurement row. Skips if same city+timestamp already exists (dedup only)."""
    cols = [
        "city", "state", "latitude", "longitude", "timestamp",
        "aqi", "pm25", "pm10", "no2", "so2", "co", "o3",
        "temp", "humidity", "wind_speed", "wind_dir", "source",
    ]
    vals = [row.get(c) for c in cols]

    if is_pg:
        # Check if row already exists — skip if so (never delete old data)
        cur = conn.cursor()
        cur.execute(
            "SELECT 1 FROM aqi_measurements WHERE city = %s AND timestamp = %s LIMIT 1",
            (row.get("city"), row.get("timestamp")),
        )
        if cur.fetchone():
            return False  # already exists, skip
        placeholders = ", ".join(["%s"] * len(cols))
        sql = f"INSERT INTO aqi_measurements ({', '.join(cols)}) VALUES ({placeholders})"
        cur.execute(sql, vals)
    else:
        cur = conn.execute(
            "SELECT 1 FROM aqi_measurements WHERE city = ? AND timestamp = ? LIMIT 1",
            (row.get("city"), row.get("timestamp")),
        )
        if cur.fetchone():
            return False  # already exists, skip
        placeholders = ", ".join(["?"] * len(cols))
        sql = f"INSERT INTO aqi_measurements ({', '.join(cols)}) VALUES ({placeholders})"
        conn.execute(sql, vals)
    return True  # new row inserted


# --------------- Main Ingestion ---------------

def ingest_city(city_info: dict) -> Optional[dict]:
    """Fetch AQI + weather for one city and return the merged row."""
    name = city_info["name"]
    lat = city_info["lat"]
    lng = city_info["lng"]
    state = city_info.get("state")

    # Fetch AQI
    aqi_data = fetch_waqi_data(name)
    if not aqi_data or aqi_data.get("aqi") is None:
        return None

    # Fetch weather
    weather = fetch_weather(lat, lng) or {}

    # Parse timestamp
    ts_str = aqi_data.get("time")
    try:
        ts = datetime.fromisoformat(ts_str) if ts_str else datetime.now(timezone.utc)
    except (ValueError, TypeError):
        ts = datetime.now(timezone.utc)

    return {
        "city": normalize_city(name),
        "state": state,
        "latitude": lat,
        "longitude": lng,
        "timestamp": ts.isoformat(),
        "aqi": aqi_data["aqi"],
        "pm25": aqi_data.get("pm25"),
        "pm10": aqi_data.get("pm10"),
        "no2": aqi_data.get("no2"),
        "so2": aqi_data.get("so2"),
        "co": aqi_data.get("co"),
        "o3": aqi_data.get("o3"),
        "temp": weather.get("temp"),
        "humidity": weather.get("humidity"),
        "wind_speed": weather.get("wind_speed"),
        "wind_dir": weather.get("wind_dir"),
        "source": "waqi",
    }


def run_ingestion(cities: list[dict] | None = None, max_workers: int = 10) -> dict:
    """
    Run a full ingestion cycle for all Indian cities.

    Returns summary dict: {ingested, failed, duration_s, timestamp}.
    """
    cities = cities or INDIAN_CITIES
    start = time.time()
    results = []

    logger.info(f"Starting ingestion for {len(cities)} cities...")

    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {pool.submit(ingest_city, c): c["name"] for c in cities}
        for future in as_completed(futures):
            city_name = futures[future]
            try:
                row = future.result()
                if row:
                    results.append(row)
                else:
                    logger.debug(f"No data for {city_name}")
            except Exception as e:
                logger.warning(f"Ingestion error for {city_name}: {e}")

    # Store all results
    stored = 0
    skipped = 0
    with get_intel_conn() as (conn, is_pg):
        for row in results:
            try:
                inserted = _store_measurement(conn, is_pg, row)
                if inserted:
                    stored += 1
                else:
                    skipped += 1
            except Exception as e:
                logger.warning(f"DB insert failed for {row.get('city')}: {e}")
        conn.commit()

    duration = round(time.time() - start, 2)
    summary = {
        "ingested": stored,
        "skipped": skipped,
        "failed": len(cities) - len(results),
        "duration_s": duration,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    logger.info(f"Ingestion complete: {stored} new, {skipped} skipped, {len(cities) - len(results)} failed in {duration}s")
    return summary


# --------------- Background Scheduler ---------------

_scheduler_running = False

def start_background_ingestion(interval_minutes: int = 60):
    """Start a background thread that runs ingestion periodically."""
    import threading

    global _scheduler_running
    if _scheduler_running:
        logger.info("Background ingestion already running")
        return

    _scheduler_running = True

    def _loop():
        while _scheduler_running:
            try:
                run_ingestion()
            except Exception as e:
                logger.error(f"Background ingestion error: {e}")
            time.sleep(interval_minutes * 60)

    t = threading.Thread(target=_loop, daemon=True, name="skyly-ingestion")
    t.start()
    logger.info(f"Background ingestion started (every {interval_minutes} min)")


def stop_background_ingestion():
    global _scheduler_running
    _scheduler_running = False


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    from .schema import run_migrations
    run_migrations()
    summary = run_ingestion()
    print(summary)
