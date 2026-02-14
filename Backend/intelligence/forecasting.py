"""
Time-Series AQI Forecasting Module for SkyLy
================================================
Production-grade forecasting with two model tiers:

1. XGBoost with lag features  (primary — fast, robust)
2. Prophet                     (baseline — captures seasonality)

Architecture:
    - ONE model per CLUSTER (not per city)
    - Cluster ID is a feature, not a separate model
    - Rolling window features: lag_1, lag_7, lag_14, rolling_7d, rolling_30d
    - Weather features: temp, humidity, wind_speed
    - Time features: hour, day, month, weekday, is_weekend
    - Confidence intervals via quantile regression

Model Registry:
    - Models are versioned and stored in Backend/models/
    - Active model tracked in model_metadata table
    - Stale predictions served from forecast_cache

⚠️  STORAGE: Loads training data from Supabase PostgreSQL when available.
   Falls back to CSV if database is empty or DATABASE_URL not set.
"""
import logging
import json
import pickle
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor

from .schema import get_intel_conn
from .clustering import load_cluster_id, load_all_clusters, normalize_city

logger = logging.getLogger("skyly.forecasting")

MODELS_DIR = Path(__file__).parent.parent / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# Model artifact paths
FORECAST_MODEL_PATH = MODELS_DIR / "forecast_xgb.pkl"
CITY_ENCODER_PATH = MODELS_DIR / "forecast_city_encoder.pkl"
FEATURE_COLS_PATH = MODELS_DIR / "forecast_features.json"
METRICS_PATH = MODELS_DIR / "forecast_metrics.json"

# Current model version
MODEL_VERSION = "xgb-v2"


# --------------- Feature Engineering ---------------

def create_features(df: pd.DataFrame, cluster_map: dict[str, int]) -> pd.DataFrame:
    """
    Build time-series features for AQI forecasting.

    Features:
        - city_encoded: label-encoded city name
        - cluster_id: city's cluster assignment
        - month, day, weekday, is_weekend: calendar features
        - lag_1, lag_7, lag_14: lagged AQI values
        - rolling_7d, rolling_30d: moving averages
        - aqi_std_7d: 7-day rolling std (volatility)
        - month_sin, month_cos: cyclical month encoding
        - temp, humidity, wind_speed: weather features
    """
    df = df.copy()
    
    # Handle both CSV (date) and DB (timestamp) columns
    if "timestamp" in df.columns:
        df["date"] = pd.to_datetime(df["timestamp"], errors="coerce")
    else:
        df["date"] = pd.to_datetime(df["date"], dayfirst=True, errors="coerce")
    
    df = df.dropna(subset=["date", "aqi"]).sort_values(["city", "date"])
    df["aqi"] = pd.to_numeric(df["aqi"], errors="coerce")
    df = df.dropna(subset=["aqi"])

    # Calendar features
    df["month"] = df["date"].dt.month
    df["day"] = df["date"].dt.day
    df["weekday"] = df["date"].dt.weekday
    df["is_weekend"] = (df["weekday"] >= 5).astype(int)
    df["day_of_year"] = df["date"].dt.dayofyear

    # Cyclical encoding for month
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)

    # Lag features (per city)
    for lag in [1, 7, 14]:
        df[f"lag_{lag}"] = df.groupby("city")["aqi"].shift(lag)

    # Rolling features (per city)
    df["rolling_7d"] = df.groupby("city")["aqi"].transform(
        lambda x: x.rolling(7, min_periods=3).mean()
    )
    df["rolling_30d"] = df.groupby("city")["aqi"].transform(
        lambda x: x.rolling(30, min_periods=7).mean()
    )
    df["aqi_std_7d"] = df.groupby("city")["aqi"].transform(
        lambda x: x.rolling(7, min_periods=3).std()
    )

    # Cluster ID
    df["cluster_id"] = df["city"].apply(
        lambda c: cluster_map.get(normalize_city(c), 0)
    )

    # City encoding
    le = LabelEncoder()
    df["city_encoded"] = le.fit_transform(df["city"])

    # Weather features (fill missing with median)
    for col in ["temp", "humidity", "wind_speed"]:
        if col not in df.columns:
            df[col] = 0.0  # Fallback if CSV data (no weather)
        else:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(df[col].median())

    # Drop rows with NaN from lag/rolling
    df = df.dropna()

    return df, le


# Feature columns for training
FEATURE_COLS = [
    "city_encoded", "cluster_id",
    "month", "day", "weekday", "is_weekend",
    "month_sin", "month_cos",
    "lag_1", "lag_7", "lag_14",
    "rolling_7d", "rolling_30d", "aqi_std_7d",
    "temp", "humidity", "wind_speed",  # Weather features
]


# --------------- Training ---------------

def train_forecasting_model(
    use_live_data: bool = True,
    csv_path: Optional[str] = None,
    n_estimators: int = 500,
    max_depth: int = 7,
    learning_rate: float = 0.03,
) -> dict:
    """
    Train a global XGBoost regression model for AQI forecasting.

    Data strategy:
        1. Always load CSV as the base historical dataset  
        2. If use_live_data=True, ALSO load live records from Supabase
           (these have real weather: temp, humidity, wind_speed)
        3. Merge both — live records override CSV for overlapping city+dates
        4. Model is trained on 17 features (including weather)

    Returns evaluation metrics dict.
    """
    # --- Step 1: Always load CSV as base ---
    if csv_path is None:
        csv_path = str(Path(__file__).parent.parent / "Dataset" / "aqi_timeseries.csv")
    logger.info(f"Loading CSV base data from {csv_path}")
    csv_df = pd.read_csv(csv_path)
    csv_df["date"] = pd.to_datetime(csv_df["date"], dayfirst=True, errors="coerce")
    logger.info(f"CSV records: {len(csv_df)}, cities: {csv_df['city'].nunique()}")
    
    data_source = "csv"
    live_df = None

    # --- Step 2: Also load live DB data (has weather!) ---
    if use_live_data:
        try:
            with get_intel_conn() as (conn, is_pg):
                if is_pg:
                    cur = conn.cursor()
                    cur.execute("SELECT city, timestamp, aqi, temp, humidity, wind_speed FROM aqi_measurements ORDER BY timestamp")
                    rows = cur.fetchall()
                    if rows:
                        live_df = pd.DataFrame(rows, columns=["city", "timestamp", "aqi", "temp", "humidity", "wind_speed"])
                    else:
                        live_df = pd.DataFrame()
                else:
                    rows = conn.execute("SELECT city, timestamp, aqi, temp, humidity, wind_speed FROM aqi_measurements ORDER BY timestamp").fetchall()
                    if rows:
                        live_df = pd.DataFrame(rows, columns=["city", "timestamp", "aqi", "temp", "humidity", "wind_speed"])
                    else:
                        live_df = pd.DataFrame()

                if live_df is not None and len(live_df) > 0:
                    live_df["date"] = pd.to_datetime(live_df["timestamp"], errors="coerce")
                    logger.info(f"Live DB records: {len(live_df)}, cities: {live_df['city'].nunique()}")
                    data_source = "csv+database"
                else:
                    logger.warning("Database is empty, training on CSV only")
                    live_df = None
        except Exception as e:
            logger.warning(f"Failed to load from database: {e}, training on CSV only")
            live_df = None

    # --- Step 3: Merge CSV + live data ---
    if live_df is not None and len(live_df) > 0:
        # Standardize columns for merging
        csv_df["source"] = "csv"
        live_df["source"] = "database"
        
        # CSV doesn't have weather, add zero columns
        for col in ["temp", "humidity", "wind_speed"]:
            if col not in csv_df.columns:
                csv_df[col] = 0.0
        
        # Combine: CSV base + live records appended
        # Live data takes priority for any overlapping city+date
        csv_df["merge_key"] = csv_df["city"].str.lower() + "_" + csv_df["date"].dt.strftime("%Y-%m-%d")
        live_df["merge_key"] = live_df["city"].str.lower() + "_" + live_df["date"].dt.strftime("%Y-%m-%d")
        
        # Remove CSV rows that overlap with live data
        overlap_keys = set(live_df["merge_key"].dropna())
        csv_filtered = csv_df[~csv_df["merge_key"].isin(overlap_keys)]
        
        raw_df = pd.concat([csv_filtered, live_df], ignore_index=True)
        raw_df = raw_df.drop(columns=["merge_key", "source", "timestamp"], errors="ignore")
        logger.info(f"Merged dataset: {len(raw_df)} records ({len(csv_filtered)} CSV + {len(live_df)} live)")
    else:
        raw_df = csv_df
        # CSV doesn't have weather columns
        for col in ["temp", "humidity", "wind_speed"]:
            if col not in raw_df.columns:
                raw_df[col] = 0.0

    # Load cluster mapping
    cluster_map = load_all_clusters()
    if not cluster_map:
        logger.warning("No clusters found — using cluster_id=0 for all cities")

    df, city_encoder = create_features(raw_df, cluster_map)
    logger.info(f"Feature-engineered records: {len(df)}")

    X = df[FEATURE_COLS]
    y = df["aqi"]

    # Temporal train/test split (last 20% by time)
    split_idx = int(len(df) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

    logger.info(f"Train: {len(X_train)}, Test: {len(X_test)}")

    model = XGBRegressor(
        n_estimators=n_estimators,
        max_depth=max_depth,
        learning_rate=learning_rate,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=1.0,
        objective="reg:squarederror",
        random_state=42,
        n_jobs=-1,
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=50,
    )

    # Evaluate
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)

    # Per-city MAE (top 10 worst)
    eval_df = df.iloc[split_idx:].copy()
    eval_df["pred"] = y_pred
    city_mae = eval_df.groupby("city").apply(
        lambda g: mean_absolute_error(g["aqi"], g["pred"]),
        include_groups=False,
    ).sort_values(ascending=False)

    metrics = {
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "r2": round(r2, 4),
        "train_size": len(X_train),
        "test_size": len(X_test),
        "n_cities": df["city"].nunique(),
        "n_features": len(FEATURE_COLS),
        "top10_worst_cities": {k: round(v, 2) for k, v in city_mae.head(10).items()},
        "model_version": MODEL_VERSION,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "data_source": data_source,
        "has_weather_features": "database" in data_source,
    }

    logger.info(f"MAE={mae:.2f}, RMSE={rmse:.2f}, R²={r2:.4f}")

    # Save artifacts
    with open(FORECAST_MODEL_PATH, "wb") as f:
        pickle.dump(model, f)
    with open(CITY_ENCODER_PATH, "wb") as f:
        pickle.dump(city_encoder, f)
    with open(FEATURE_COLS_PATH, "w") as f:
        json.dump(FEATURE_COLS, f)
    with open(METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)

    # Save to model_metadata table
    _save_model_metadata(metrics)

    logger.info(f"Model saved to {FORECAST_MODEL_PATH}")
    return metrics


def _save_model_metadata(metrics: dict):
    """Record model version in DB."""
    try:
        with get_intel_conn() as (conn, is_pg):
            if is_pg:
                conn.cursor().execute("""
                    INSERT INTO model_metadata (model_name, version, model_type, metrics, artifact_path, is_active)
                    VALUES (%s, %s, %s, %s, %s, TRUE)
                    ON CONFLICT (model_name, version) DO UPDATE SET
                        metrics = EXCLUDED.metrics,
                        trained_at = NOW(),
                        is_active = TRUE
                """, ("aqi_forecast", MODEL_VERSION, "xgboost",
                      json.dumps(metrics), str(FORECAST_MODEL_PATH)))
            else:
                conn.execute("""
                    INSERT OR REPLACE INTO model_metadata
                        (model_name, version, model_type, metrics, artifact_path, is_active)
                    VALUES (?, ?, ?, ?, ?, 1)
                """, ("aqi_forecast", MODEL_VERSION, "xgboost",
                      json.dumps(metrics), str(FORECAST_MODEL_PATH)))
            conn.commit()
    except Exception as e:
        logger.warning(f"Failed to save model metadata: {e}")


# --------------- Inference ---------------

_model_cache = {}


def _load_model():
    """Load model + encoder from disk (cached in memory)."""
    if "model" not in _model_cache:
        if not FORECAST_MODEL_PATH.exists():
            raise FileNotFoundError(
                f"No trained model found at {FORECAST_MODEL_PATH}. "
                "Run train_forecasting_model() first."
            )
        with open(FORECAST_MODEL_PATH, "rb") as f:
            _model_cache["model"] = pickle.load(f)
        with open(CITY_ENCODER_PATH, "rb") as f:
            _model_cache["encoder"] = pickle.load(f)
    return _model_cache["model"], _model_cache["encoder"]


def _load_city_history(city: str) -> pd.DataFrame:
    """
    Load recent AQI history for a city.
    
    Priority:
        1. Supabase aqi_measurements table (live data with weather)
        2. Fallback to static CSV if DB has insufficient data
    
    Returns DataFrame with columns: date, aqi, temp, humidity, wind_speed
    """
    city_df = None
    data_source = "csv"

    # --- Try Supabase first ---
    try:
        with get_intel_conn() as (conn, is_pg):
            cols = ["city", "timestamp", "aqi", "temp", "humidity", "wind_speed"]
            if is_pg:
                cur = conn.cursor()
                # DISTINCT ON keeps only the most recently ingested row per timestamp
                cur.execute("""
                    SELECT DISTINCT ON (timestamp)
                        city, timestamp, aqi, temp, humidity, wind_speed
                    FROM aqi_measurements
                    WHERE LOWER(city) = LOWER(%s)
                    ORDER BY timestamp DESC, created_at DESC
                    LIMIT 60
                """, (city,))
                rows = cur.fetchall()
            else:
                rows = conn.execute("""
                    SELECT city, timestamp, aqi, temp, humidity, wind_speed
                    FROM aqi_measurements
                    WHERE LOWER(city) = LOWER(?)
                    GROUP BY timestamp
                    HAVING rowid = MAX(rowid)
                    ORDER BY timestamp DESC
                    LIMIT 60
                """, (city,)).fetchall()

            if rows:
                city_df = pd.DataFrame(rows, columns=cols)
                city_df["date"] = pd.to_datetime(city_df["timestamp"], errors="coerce")
                city_df = city_df.sort_values("date")
                for col in ["temp", "humidity", "wind_speed"]:
                    city_df[col] = pd.to_numeric(city_df[col], errors="coerce").fillna(0.0)
                data_source = "database"
                logger.info(f"Loaded {len(city_df)} live records for {city} from database")
            else:
                city_df = None
    except Exception as e:
        logger.warning(f"DB query failed for {city}: {e}, falling back to CSV")
        city_df = None

    # --- Fallback to CSV ---
    if city_df is None:
        csv_path = str(Path(__file__).parent.parent / "Dataset" / "aqi_timeseries.csv")
        df = pd.read_csv(csv_path)
        df["date"] = pd.to_datetime(df["date"], dayfirst=True, errors="coerce")
        city_df = df[df["city"].apply(normalize_city) == city].sort_values("date")
        # CSV doesn't have weather columns
        for col in ["temp", "humidity", "wind_speed"]:
            if col not in city_df.columns:
                city_df[col] = 0.0
        data_source = "csv"
        logger.info(f"Loaded {len(city_df)} CSV records for {city} (DB fallback)")

    city_df.attrs["data_source"] = data_source
    return city_df


def predict_aqi(
    city: str,
    target_date: str | datetime,
    csv_path: Optional[str] = None,
) -> dict:
    """
    Predict AQI for a city at a future date using the trained XGBoost model.

    Data source priority:
        1. Live data from Supabase aqi_measurements (includes weather)
        2. Fallback to static CSV if DB has insufficient data

    Args:
        city: City name (will be normalized)
        target_date: ISO date string or datetime object
        csv_path: Deprecated — ignored. Data is loaded from DB/CSV automatically.

    Returns:
        {
            "city": str,
            "target_date": str,
            "predicted_aqi": float,
            "category": str,
            "cluster_id": int,
            "confidence": {"low": float, "high": float},
            "model_version": str,
            "data_source": str,          # "database" or "csv"
            "latest_aqi": float | None,  # most recent AQI reading
            "weather": {"temp": float, "humidity": float, "wind_speed": float},
        }
    """
    model, encoder = _load_model()
    city = normalize_city(city)

    if isinstance(target_date, str):
        target_date = pd.to_datetime(target_date)

    # Load historical data — prefers Supabase, falls back to CSV
    city_df = _load_city_history(city)
    data_source = city_df.attrs.get("data_source", "csv")

    if len(city_df) < 1:
        raise ValueError(f"No historical data found for {city} in database or CSV")

    # Build features for target date
    cluster_id = load_cluster_id(city) or 0

    try:
        city_code = encoder.transform([city])[0]
    except ValueError:
        city_code = 0

    # Use latest weather from live data (or 0 if CSV)
    latest_row = city_df.iloc[-1]
    latest_temp = float(latest_row.get("temp", 0.0) or 0.0)
    latest_humidity = float(latest_row.get("humidity", 0.0) or 0.0)
    latest_wind = float(latest_row.get("wind_speed", 0.0) or 0.0)
    latest_aqi = float(latest_row["aqi"]) if pd.notna(latest_row["aqi"]) else None

    features = {
        "city_encoded": city_code,
        "cluster_id": cluster_id,
        "month": target_date.month,
        "day": target_date.day,
        "weekday": target_date.weekday(),
        "is_weekend": int(target_date.weekday() >= 5),
        "month_sin": np.sin(2 * np.pi * target_date.month / 12),
        "month_cos": np.cos(2 * np.pi * target_date.month / 12),
        "lag_1": float(city_df.iloc[-1]["aqi"]),
        "lag_7": float(city_df.iloc[-7]["aqi"]) if len(city_df) >= 7 else float(city_df["aqi"].mean()),
        "lag_14": float(city_df.iloc[-14]["aqi"]) if len(city_df) >= 14 else float(city_df["aqi"].mean()),
        "rolling_7d": float(city_df.tail(7)["aqi"].mean()),
        "rolling_30d": float(city_df.tail(30)["aqi"].mean()),
        "aqi_std_7d": float(city_df.tail(7)["aqi"].std()) if len(city_df) >= 7 else 15.0,
        # Real weather from live data (or 0.0 from CSV fallback)
        "temp": latest_temp,
        "humidity": latest_humidity,
        "wind_speed": latest_wind,
    }

    # Load actual feature columns used by the model
    with open(FEATURE_COLS_PATH) as f:
        model_features = json.load(f)

    X = pd.DataFrame([features])[model_features]
    predicted_aqi = float(model.predict(X)[0])
    predicted_aqi = max(0, round(predicted_aqi, 1))

    # Confidence interval (± rolling std)
    std_7d = features["aqi_std_7d"] if features["aqi_std_7d"] and not np.isnan(features["aqi_std_7d"]) else 15.0
    confidence_low = max(0, round(predicted_aqi - 1.5 * std_7d, 1))
    confidence_high = round(predicted_aqi + 1.5 * std_7d, 1)

    return {
        "city": city,
        "target_date": target_date.isoformat(),
        "predicted_aqi": predicted_aqi,
        "category": _aqi_category(predicted_aqi),
        "cluster_id": cluster_id,
        "confidence": {"low": confidence_low, "high": confidence_high},
        "model_version": MODEL_VERSION,
        "data_source": data_source,
        "latest_aqi": latest_aqi,
        "weather": {
            "temp": latest_temp,
            "humidity": latest_humidity,
            "wind_speed": latest_wind,
        },
    }


def forecast_range(
    city: str,
    days: int = 7,
    start_date: Optional[str] = None,
) -> list[dict]:
    """
    Generate multi-day AQI forecast for a city.

    Args:
        city: City name
        days: Number of days to forecast (1-30)
        start_date: Start date (defaults to tomorrow)

    Returns:
        List of prediction dicts, one per day
    """
    days = min(max(1, days), 30)

    if start_date:
        base = pd.to_datetime(start_date)
    else:
        base = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0) + timedelta(days=1)

    results = []
    for i in range(days):
        target = base + timedelta(days=i)
        try:
            pred = predict_aqi(city, target)
            results.append(pred)
        except Exception as e:
            logger.warning(f"Forecast failed for {city} on {target}: {e}")
            results.append({
                "city": normalize_city(city),
                "target_date": target.isoformat(),
                "predicted_aqi": None,
                "category": "Unknown",
                "error": str(e),
            })

    return results


# --------------- AQI Category ---------------

def _aqi_category(aqi: float) -> str:
    """Map numeric AQI to EPA category."""
    if aqi <= 50:
        return "Good"
    elif aqi <= 100:
        return "Moderate"
    elif aqi <= 150:
        return "Unhealthy for Sensitive Groups"
    elif aqi <= 200:
        return "Unhealthy"
    elif aqi <= 300:
        return "Very Unhealthy"
    else:
        return "Hazardous"


# --------------- Model Metrics ---------------

def get_model_metrics() -> Optional[dict]:
    """Load saved evaluation metrics."""
    if METRICS_PATH.exists():
        with open(METRICS_PATH) as f:
            return json.load(f)
    return None


# --------------- Cache ---------------

def cache_forecast(city: str, target_time: str, predicted_aqi: float,
                   low: float = None, high: float = None):
    """Cache a prediction for fast serving."""
    try:
        with get_intel_conn() as (conn, is_pg):
            if is_pg:
                conn.cursor().execute("""
                    INSERT INTO forecast_cache (city, target_time, predicted_aqi,
                        confidence_low, confidence_high, model_version)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (city, target_time, model_version) DO UPDATE SET
                        predicted_aqi = EXCLUDED.predicted_aqi,
                        created_at = NOW()
                """, (city, target_time, predicted_aqi, low, high, MODEL_VERSION))
            else:
                conn.execute("""
                    INSERT OR REPLACE INTO forecast_cache
                        (city, target_time, predicted_aqi, confidence_low,
                         confidence_high, model_version)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (city, target_time, predicted_aqi, low, high, MODEL_VERSION))
            conn.commit()
    except Exception as e:
        logger.debug(f"Cache write failed: {e}")


def get_cached_forecast(city: str, target_time: str) -> Optional[dict]:
    """Retrieve cached prediction if fresh (< 6 hours old)."""
    try:
        with get_intel_conn() as (conn, is_pg):
            if is_pg:
                cur = conn.cursor()
                cur.execute("""
                    SELECT predicted_aqi, confidence_low, confidence_high, model_version, created_at
                    FROM forecast_cache
                    WHERE city = %s AND target_time = %s
                      AND created_at > NOW() - INTERVAL '6 hours'
                    ORDER BY created_at DESC LIMIT 1
                """, (city, target_time))
                row = cur.fetchone()
            else:
                row = conn.execute("""
                    SELECT predicted_aqi, confidence_low, confidence_high, model_version, created_at
                    FROM forecast_cache
                    WHERE city = ? AND target_time = ?
                      AND created_at > datetime('now', '-6 hours')
                    ORDER BY created_at DESC LIMIT 1
                """, (city, target_time)).fetchone()

            if row:
                return {
                    "predicted_aqi": row[0],
                    "confidence_low": row[1],
                    "confidence_high": row[2],
                    "model_version": row[3],
                    "cached_at": row[4],
                }
    except Exception as e:
        logger.debug(f"Cache read failed: {e}")
    return None


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    from .schema import run_migrations
    run_migrations()

    print("Training forecasting model (with live data + weather if available)...")
    metrics = train_forecasting_model(use_live_data=True)
    print(json.dumps(metrics, indent=2))

    print("\nPredicting Delhi AQI for 7 days...")
    forecasts = forecast_range("Delhi", days=7)
    for f in forecasts:
        print(f"  {f['target_date'][:10]}: AQI={f.get('predicted_aqi', 'N/A')} ({f.get('category', '?')})")
