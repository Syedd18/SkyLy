import os
import csv
import requests
from datetime import date
from pathlib import Path

# ---------- CONFIG ----------

# Use env var in production; fallback to your token for local testing
WAQI_TOKEN = os.getenv("WAQI_TOKEN", "9fe0a55684bf08d8c8131b1cba6233542f86f55d")

# ABSOLUTE PATH TO YOUR EXISTING CSV  (change only if your path is different)
CSV_PATH = Path(r"C:\Users\acer\Air Pollution\Backend\Dataset\aqi_timeseries.csv")
DATASET_DIR = CSV_PATH.parent

# Same cities as used in your app (you can extend this)
INDIAN_CITIES = [
    "Delhi", "Mumbai", "Bangalore", "Chennai", "Kolkata", "Hyderabad",
    "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Kanpur", "Patna", "Ranchi",
    "Gurugram", "Noida", "Faridabad", "Ghaziabad", "Meerut", "Agra",
    "Varanasi", "Amritsar", "Ludhiana", "Chandigarh", "Dehradun",
    "Shimla", "Srinagar", "Jammu"
]

# ---------- HELPERS ----------

def fetch_city_aqi(city: str) -> int | None:
    """Fetch current AQI for a city from WAQI. Returns int or None."""
    url = f"https://api.waqi.info/feed/{city}/"
    try:
        res = requests.get(url, params={"token": WAQI_TOKEN}, timeout=15)
        res.raise_for_status()
        data = res.json()
        if data.get("status") != "ok":
            print(f"[WARN] No data for {city}: {data.get('data')}")
            return None
        aqi = data["data"].get("aqi")
        if aqi is None or aqi == "-":
            return None
        return int(aqi)
    except Exception as e:
        print(f"[ERROR] Fetching {city}: {e}")
        return None

def ensure_csv_header():
    DATASET_DIR.mkdir(parents=True, exist_ok=True)
    if not CSV_PATH.exists():
        with CSV_PATH.open("w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f, delimiter="\t")
            writer.writerow(["city", "aqi", "date"])
        print(f"[INFO] Created new CSV with header at {CSV_PATH}")
    else:
        print(f"[INFO] Using existing CSV at {CSV_PATH}")

def already_has_today(city: str, today_str: str) -> bool:
    if not CSV_PATH.exists():
        return False
    with CSV_PATH.open("r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for row in reader:
            if row.get("city") == city and row.get("date") == today_str:
                return True
    return False

def append_today_row(city: str, aqi: int, today_str: str):
    with CSV_PATH.open("a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f, delimiter="\t")
        writer.writerow([city, aqi, today_str])

# ---------- MAIN ----------

def main():
    ensure_csv_header()
    today_str = date.today().strftime("%d-%m-%Y")  # matches day-first format

    print(f"[INFO] Updating AQI CSV for {today_str}")
    print(f"[INFO] Target CSV: {CSV_PATH}")

    for city in INDIAN_CITIES:
        if already_has_today(city, today_str):
            print(f"[SKIP] {city} already has entry for {today_str}")
            continue

        aqi = fetch_city_aqi(city)
        if aqi is not None:
            append_today_row(city, aqi, today_str)
            print(f"[OK] {city}: {aqi}")
        else:
            print(f"[MISS] {city}: no AQI value")

    print("[INFO] Done.")

if __name__ == "__main__":
    main()
