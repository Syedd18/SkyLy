#!/usr/bin/env bash
set -euo pipefail

echo "=== SkyLy Backend Start ==="

# Prepare persistent data directory and environment
mkdir -p /data
export USERS_DB_PATH=/data/users.db

# Run database migrations (create Supabase tables if needed)
echo "Running database migrations..."
python -c "from Backend.intelligence.schema import run_migrations; run_migrations()" || echo "⚠ Migration skipped (non-fatal)"

# Train forecasting model if not present (pkl files are gitignored)
if [ ! -f "Backend/models/forecast_xgb.pkl" ]; then
  echo "No model found — training XGBoost forecasting model..."
  python -c "
from Backend.intelligence.forecasting import train_forecasting_model
import json
metrics = train_forecasting_model(use_live_data=True)
print('Model trained:', json.dumps(metrics, indent=2))
" || echo "⚠ Model training failed (non-fatal, predictions will use fallback)"
else
  echo "Model already exists — skipping training"
fi

# Run initial clustering if not present
if [ ! -f "Backend/models/cluster_metadata.json" ]; then
  echo "No clusters found — running city clustering..."
  python -c "
from Backend.intelligence.clustering import run_clustering_pipeline
result = run_clustering_pipeline()
print(f'Clustering complete: {result}')
" || echo "⚠ Clustering skipped (non-fatal)"
else
  echo "Clusters already exist — skipping"
fi

# Start the app (single worker to keep scheduler singleton, extended timeout for API calls)
echo "Starting gunicorn..."
exec gunicorn -k uvicorn.workers.UvicornWorker Backend.main:app --bind 0.0.0.0:$PORT --workers 1 --timeout 120
