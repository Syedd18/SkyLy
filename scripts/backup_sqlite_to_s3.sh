#!/usr/bin/env bash
set -euo pipefail

# Wrapper to run the Python backup script (use as Render Scheduled Job)
PYTHON=${PYTHON:-python}
exec "$PYTHON" scripts/backup_sqlite_to_s3.py
