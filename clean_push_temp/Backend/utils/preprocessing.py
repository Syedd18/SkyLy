import pandas as pd
import numpy as np
import os

# ---------------------------------------------------
# Resolve absolute dataset path (works anywhere)
# ---------------------------------------------------

# Current file → utils/preprocessing.py
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

# Backend folder
BASE_DIR = os.path.dirname(CURRENT_DIR)

# Dataset folder inside Backend
DATASET_DIR = os.path.join(BASE_DIR, "Dataset")

print("Dataset Directory:", DATASET_DIR)


# ---------------------------------------------------
# Load all datasets
# ---------------------------------------------------
def load_datasets():

    print("\nLoading datasets...\n")

    city_day = pd.read_csv(os.path.join(DATASET_DIR, "city_day.csv"))
    city_hour = pd.read_csv(os.path.join(DATASET_DIR, "city_hour.csv"))
    station_day = pd.read_csv(os.path.join(DATASET_DIR, "station_day.csv"))
    station_hour = pd.read_csv(os.path.join(DATASET_DIR, "station_hour.csv"))
    stations = pd.read_csv(os.path.join(DATASET_DIR, "stations.csv"))

    print("Datasets loaded successfully!\n")
    print("city_day:", city_day.shape)
    print("city_hour:", city_hour.shape)
    print("station_day:", station_day.shape)
    print("station_hour:", station_hour.shape)
    print("stations:", stations.shape)

    return city_day, city_hour, station_day, station_hour, stations


# ---------------------------------------------------
# Clean dataset (dates, invalid values, missing AQI)
# ---------------------------------------------------
def clean_pollution_data(df):
    df = df.copy()

    # Trim spaces from columns
    df.columns = df.columns.str.strip()

    # Convert date/time columns
    for col in df.columns:
        if "date" in col.lower() or "time" in col.lower():
            df[col] = pd.to_datetime(df[col], errors="coerce")

    # Replace invalid entries
    df = df.replace(["#", "##", "NA", "NAN", "NaN", "", " "], np.nan)

    # Convert numeric columns safely
    for col in df.columns:
        try:
            df[col] = pd.to_numeric(df[col], errors="ignore")
        except:
            pass

    # Remove rows missing AQI for ML
    if "AQI" in df.columns:
        df = df.dropna(subset=["AQI"])

    return df.reset_index(drop=True)


# ---------------------------------------------------
# Merge metadata (add city, state, coordinates)
# ---------------------------------------------------
def merge_station_metadata(station_df, stations_meta):
    if "station" in station_df.columns and "station" in stations_meta.columns:
        return station_df.merge(stations_meta, on="station", how="left")
    return station_df


# ---------------------------------------------------
# Main preprocessing pipeline
# ---------------------------------------------------
def preprocess_all():

    city_day, city_hour, station_day, station_hour, stations = load_datasets()

    print("\nCleaning datasets...")

    city_day = clean_pollution_data(city_day)
    city_hour = clean_pollution_data(city_hour)
    station_day = clean_pollution_data(station_day)
    station_hour = clean_pollution_data(station_hour)

    station_day = merge_station_metadata(station_day, stations)
    station_hour = merge_station_metadata(station_hour, stations)

    print("\nCleaning completed!\n")
    print("Final Shapes:")
    print("city_day:", city_day.shape)
    print("city_hour:", city_hour.shape)
    print("station_day:", station_day.shape)
    print("station_hour:", station_hour.shape)
    print("stations:", stations.shape)

    return {
        "city_day": city_day,
        "city_hour": city_hour,
        "station_day": station_day,
        "station_hour": station_hour,
        "stations": stations
    }


# ---------------------------------------------------
# Run the file directly for testing
# ---------------------------------------------------
if __name__ == "__main__":
    data = preprocess_all()

    print("\nPreview of cleaned city_day:")
    print(data["city_day"].head())
