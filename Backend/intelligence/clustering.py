"""
City Clustering Module for SkyLy AQI Platform
================================================
Groups Indian cities into 5-10 clusters based on:
    - AQI statistical profile (mean, std, seasonal amplitude)
    - Geographic proximity
    - Climate similarity

Design decision: Train ONE forecasting model per CLUSTER, not per city.
This avoids overfitting for cities with sparse data while allowing
cluster-specific patterns to be learned.
"""
import logging
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans

from .schema import get_intel_conn
from .ingestion import INDIAN_CITIES, normalize_city

logger = logging.getLogger("skyly.clustering")

MODELS_DIR = Path(__file__).parent.parent / "models"
CLUSTER_META_PATH = MODELS_DIR / "cluster_metadata.json"

N_CLUSTERS = 7  # Default; tuned via silhouette score


# --------------- Feature Extraction ---------------

def compute_city_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute per-city AQI statistics from historical data.

    Args:
        df: DataFrame with columns [date, city, aqi]

    Returns:
        DataFrame with columns [city, mean_aqi, std_aqi, seasonal_amp,
                                 winter_mean, summer_mean, monsoon_mean]
    """
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"], dayfirst=True, errors="coerce")
    df = df.dropna(subset=["date", "aqi"])
    df["aqi"] = pd.to_numeric(df["aqi"], errors="coerce")
    df = df.dropna(subset=["aqi"])
    df["month"] = df["date"].dt.month

    # Seasonal definitions (India-specific)
    def season(m):
        if m in (11, 12, 1, 2):
            return "winter"
        elif m in (3, 4, 5):
            return "summer"
        elif m in (6, 7, 8, 9):
            return "monsoon"
        else:
            return "post_monsoon"

    df["season"] = df["month"].apply(season)

    # Per-city aggregations
    stats = df.groupby("city")["aqi"].agg(["mean", "std", "median"]).reset_index()
    stats.columns = ["city", "mean_aqi", "std_aqi", "median_aqi"]

    # Seasonal means
    seasonal = df.pivot_table(values="aqi", index="city", columns="season", aggfunc="mean")
    seasonal = seasonal.reset_index()
    seasonal.columns = ["city"] + [f"{c}_mean" for c in seasonal.columns[1:]]

    features = stats.merge(seasonal, on="city", how="left")

    # Seasonal amplitude = max seasonal mean - min seasonal mean
    season_cols = [c for c in features.columns if c.endswith("_mean") and c != "mean_aqi"]
    features["seasonal_amp"] = features[season_cols].max(axis=1) - features[season_cols].min(axis=1)

    # Fill NaN with 0
    features = features.fillna(0)

    return features


def add_geo_features(features: pd.DataFrame) -> pd.DataFrame:
    """Add latitude/longitude from INDIAN_CITIES lookup."""
    coords = {}
    for c in INDIAN_CITIES:
        coords[c["name"].lower()] = (c["lat"], c["lng"], c.get("state", ""))

    features["latitude"] = features["city"].apply(
        lambda x: coords.get(normalize_city(x).lower(), (0, 0, ""))[0]
    )
    features["longitude"] = features["city"].apply(
        lambda x: coords.get(normalize_city(x).lower(), (0, 0, ""))[1]
    )
    features["state"] = features["city"].apply(
        lambda x: coords.get(normalize_city(x).lower(), (0, 0, ""))[2]
    )
    return features


# --------------- Clustering ---------------

def cluster_cities(
    df: pd.DataFrame,
    n_clusters: int = N_CLUSTERS,
) -> tuple[pd.DataFrame, dict]:
    """
    Cluster cities based on AQI patterns + geography.

    Args:
        df: Raw timeseries DataFrame [date, city, aqi]
        n_clusters: Number of clusters (default 7)

    Returns:
        (city_clusters_df, metadata_dict)
    """
    logger.info(f"Computing city features for clustering...")
    features = compute_city_features(df)
    features = add_geo_features(features)

    # Features for clustering
    cluster_cols = ["mean_aqi", "std_aqi", "seasonal_amp", "latitude", "longitude"]
    available_cols = [c for c in cluster_cols if c in features.columns]

    X = features[available_cols].values
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Determine optimal k using silhouette score (bounded by n_clusters)
    from sklearn.metrics import silhouette_score
    best_k = n_clusters
    best_score = -1

    k_range = range(max(3, n_clusters - 3), min(n_clusters + 4, len(features)))
    for k in k_range:
        if k >= len(features):
            continue
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = km.fit_predict(X_scaled)
        score = silhouette_score(X_scaled, labels)
        logger.debug(f"  k={k}, silhouette={score:.3f}")
        if score > best_score:
            best_score = score
            best_k = k

    logger.info(f"Optimal k={best_k} (silhouette={best_score:.3f})")

    # Final clustering
    kmeans = KMeans(n_clusters=best_k, random_state=42, n_init=10)
    features["cluster_id"] = kmeans.fit_predict(X_scaled)

    # Metadata
    metadata = {
        "n_clusters": best_k,
        "silhouette_score": round(best_score, 4),
        "cluster_sizes": features["cluster_id"].value_counts().to_dict(),
        "feature_cols": available_cols,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    # Per-cluster summary
    cluster_summary = {}
    for cid in range(best_k):
        mask = features["cluster_id"] == cid
        cluster_cities_list = features.loc[mask, "city"].tolist()
        cluster_summary[str(cid)] = {
            "cities": cluster_cities_list,
            "mean_aqi": round(features.loc[mask, "mean_aqi"].mean(), 1),
            "count": int(mask.sum()),
        }
    metadata["clusters"] = cluster_summary

    return features, metadata


# --------------- Persistence ---------------

def save_clusters(features: pd.DataFrame, metadata: dict):
    """Save cluster assignments to DB and metadata to JSON."""
    # Save to DB
    with get_intel_conn() as (conn, is_pg):
        for _, row in features.iterrows():
            vals = (
                normalize_city(row["city"]),
                int(row["cluster_id"]),
                float(row.get("mean_aqi", 0)),
                float(row.get("std_aqi", 0)),
                float(row.get("seasonal_amp", 0)),
                float(row.get("latitude", 0)),
                float(row.get("longitude", 0)),
                str(row.get("state", "")),
            )

            if is_pg:
                conn.cursor().execute("""
                    INSERT INTO city_clusters (city, cluster_id, mean_aqi, aqi_std,
                        seasonal_amp, latitude, longitude, state, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT (city) DO UPDATE SET
                        cluster_id = EXCLUDED.cluster_id,
                        mean_aqi = EXCLUDED.mean_aqi,
                        aqi_std = EXCLUDED.aqi_std,
                        seasonal_amp = EXCLUDED.seasonal_amp,
                        updated_at = NOW()
                """, vals)
            else:
                conn.execute("""
                    INSERT OR REPLACE INTO city_clusters
                        (city, cluster_id, mean_aqi, aqi_std, seasonal_amp,
                         latitude, longitude, state, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                """, vals)
        conn.commit()

    # Save metadata JSON
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    with open(CLUSTER_META_PATH, "w") as f:
        json.dump(metadata, f, indent=2)

    logger.info(f"Saved {len(features)} city clusters to DB and {CLUSTER_META_PATH}")


def load_cluster_id(city: str) -> Optional[int]:
    """Look up the cluster ID for a given city."""
    city = normalize_city(city)
    with get_intel_conn() as (conn, is_pg):
        if is_pg:
            cur = conn.cursor()
            cur.execute("SELECT cluster_id FROM city_clusters WHERE city = %s", (city,))
            row = cur.fetchone()
        else:
            row = conn.execute(
                "SELECT cluster_id FROM city_clusters WHERE city = ?", (city,)
            ).fetchone()
    return row[0] if row else None


def load_all_clusters() -> dict[str, int]:
    """Return {city_name: cluster_id} mapping."""
    with get_intel_conn() as (conn, is_pg):
        if is_pg:
            cur = conn.cursor()
            cur.execute("SELECT city, cluster_id FROM city_clusters")
            rows = cur.fetchall()
        else:
            rows = conn.execute("SELECT city, cluster_id FROM city_clusters").fetchall()
    return {r[0]: r[1] for r in rows} if rows else {}


# --------------- Entry Point ---------------

def run_clustering(csv_path: Optional[str] = None, n_clusters: int = N_CLUSTERS) -> dict:
    """
    Full clustering pipeline: load data → compute features → cluster → save.

    Args:
        csv_path: Path to aqi_timeseries.csv (optional, auto-detected if None)
        n_clusters: Number of clusters

    Returns:
        metadata dict
    """
    if csv_path is None:
        csv_path = str(Path(__file__).parent.parent / "Dataset" / "aqi_timeseries.csv")

    logger.info(f"Loading data from {csv_path}")
    df = pd.read_csv(csv_path)

    features, metadata = cluster_cities(df, n_clusters=n_clusters)
    save_clusters(features, metadata)

    return metadata


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    from .schema import run_migrations
    run_migrations()
    meta = run_clustering()
    print(json.dumps(meta, indent=2))
