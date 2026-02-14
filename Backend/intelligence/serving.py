"""
SkyLy Intelligence API Router
================================
FastAPI router that exposes the intelligence engine endpoints:

    GET  /api/intelligence/forecast   – Multi-day AQI forecast
    GET  /api/intelligence/predict    – Single-point AQI prediction (ML-based)
    GET  /api/intelligence/clusters   – City cluster info
    GET  /api/intelligence/metrics    – Model performance metrics
    POST /api/intelligence/ingest     – Trigger manual data ingestion
    POST /api/intelligence/train      – Trigger model training
    POST /api/intelligence/cluster    – Trigger clustering pipeline
    GET  /api/intelligence/health     – Engine health check
"""
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger("skyly.serving")

router = APIRouter(prefix="/api/intelligence", tags=["Intelligence Engine"])


# ----------------------------------------------------------------
# GET /api/intelligence/forecast?city=Delhi&days=7
# ----------------------------------------------------------------
@router.get("/forecast")
def get_forecast(
    city: str = Query(..., description="City name (e.g., Delhi, Mumbai)"),
    days: int = Query(7, ge=1, le=30, description="Number of days to forecast"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD), defaults to tomorrow"),
):
    """Multi-day AQI forecast for a city using trained XGBoost model."""
    from .forecasting import forecast_range

    try:
        results = forecast_range(city, days=days, start_date=start_date)
        return {
            "city": city,
            "days": days,
            "forecasts": results,
            "generated_at": datetime.utcnow().isoformat(),
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Forecast error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Forecast failed: {e}")


# ----------------------------------------------------------------
# GET /api/intelligence/predict?city=Delhi&date=2025-01-15
# ----------------------------------------------------------------
@router.get("/predict")
def get_prediction(
    city: str = Query(..., description="City name"),
    date: str = Query(..., description="Target date (YYYY-MM-DD)"),
):
    """Single-point AQI prediction for a specific city and date."""
    from .forecasting import predict_aqi

    try:
        result = predict_aqi(city, date)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")


# ----------------------------------------------------------------
# GET /api/intelligence/clusters
# ----------------------------------------------------------------
@router.get("/clusters")
def get_clusters():
    """Return all city cluster assignments and metadata."""
    from .clustering import load_all_clusters
    from pathlib import Path
    import json

    clusters = load_all_clusters()
    if not clusters:
        raise HTTPException(status_code=404, detail="No clusters computed yet. Run /api/intelligence/cluster first.")

    # Try to load full metadata from JSON
    meta_path = Path(__file__).parent.parent / "models" / "cluster_metadata.json"
    metadata = None
    if meta_path.exists():
        with open(meta_path) as f:
            metadata = json.load(f)

    return {
        "cluster_count": len(set(clusters.values())),
        "city_count": len(clusters),
        "assignments": clusters,
        "metadata": metadata,
    }


# ----------------------------------------------------------------
# GET /api/intelligence/metrics
# ----------------------------------------------------------------
@router.get("/metrics")
def get_metrics():
    """Return evaluation metrics of the active forecasting model."""
    from .forecasting import get_model_metrics

    metrics = get_model_metrics()
    if not metrics:
        raise HTTPException(status_code=404, detail="No model trained yet.")
    return metrics


# ----------------------------------------------------------------
# POST /api/intelligence/ingest
# ----------------------------------------------------------------
@router.post("/ingest")
async def trigger_ingestion():
    """Manually trigger a data ingestion cycle (fetches AQI + weather for all cities)."""
    from .ingestion import run_ingestion, INDIAN_CITIES
    from .schema import run_migrations

    try:
        run_migrations()
        result = run_ingestion(INDIAN_CITIES)
        return {
            "status": "completed",
            "summary": result,
        }
    except Exception as e:
        logger.error(f"Ingestion error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {e}")


# ----------------------------------------------------------------
# POST /api/intelligence/train
# ----------------------------------------------------------------
@router.post("/train")
async def trigger_training(
    use_live_data: bool = Query(True, description="Use live DB data with weather (falls back to CSV if empty)"),
):
    """Trigger model training using live data + weather OR historical CSV."""
    from .forecasting import train_forecasting_model
    from .schema import run_migrations

    try:
        run_migrations()
        metrics = train_forecasting_model(use_live_data=use_live_data)
        return {
            "status": "completed",
            "metrics": metrics,
        }
    except Exception as e:
        logger.error(f"Training error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Training failed: {e}")


# ----------------------------------------------------------------
# POST /api/intelligence/cluster
# ----------------------------------------------------------------
@router.post("/cluster")
async def trigger_clustering(
    n_clusters: int = Query(7, ge=2, le=20, description="Number of clusters"),
):
    """Trigger city clustering pipeline."""
    from .clustering import run_clustering
    from .schema import run_migrations

    try:
        run_migrations()
        result = run_clustering(n_clusters=n_clusters)
        return {
            "status": "completed",
            "result": result,
        }
    except Exception as e:
        logger.error(f"Clustering error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Clustering failed: {e}")


# ----------------------------------------------------------------
# GET /api/intelligence/health
# ----------------------------------------------------------------
@router.get("/health")
def health_check():
    """Check intelligence engine status."""
    from .forecasting import FORECAST_MODEL_PATH, get_model_metrics
    from .clustering import load_all_clusters
    from pathlib import Path

    model_exists = FORECAST_MODEL_PATH.exists()
    clusters = load_all_clusters()
    metrics = get_model_metrics()

    return {
        "status": "operational" if model_exists else "no_model",
        "model_trained": model_exists,
        "model_version": metrics.get("model_version") if metrics else None,
        "model_mae": metrics.get("mae") if metrics else None,
        "clusters_computed": len(clusters) > 0,
        "cluster_count": len(set(clusters.values())) if clusters else 0,
        "city_count": len(clusters),
    }
