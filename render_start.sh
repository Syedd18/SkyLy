#!/usr/bin/env bash
set -euo pipefail

# Prepare persistent data directory and environment
mkdir -p /data
export USERS_DB_PATH=/data/users.db

# Ensure virtualenv / deps are available (Render runs Build Command before Start)

# Start the app (single worker to avoid SQLite concurrency issues)
exec gunicorn -k uvicorn.workers.UvicornWorker Backend.main:app --bind 0.0.0.0:$PORT --workers 1
