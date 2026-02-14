"""
Database Schema & Migrations for SkyLy AQI Platform
=====================================================
Tables:
    aqi_measurements    – Ingested AQI + weather snapshots
    city_clusters       – City → cluster mapping
    forecast_cache      – Cached predictions (TTL-based)
    model_metadata      – Trained model registry

⚠️  STORAGE: Uses Supabase PostgreSQL (set DATABASE_URL in .env)
    Falls back to SQLite only for local development if DATABASE_URL not set.
"""
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()  # Load .env file

# Optional Postgres
try:
    import psycopg
    HAS_PSYCOPG = True
except ImportError:
    HAS_PSYCOPG = False

DATABASE_URL = os.getenv("DATABASE_URL")
INTEL_DB_PATH = os.getenv("INTEL_DB_PATH", str(Path(__file__).parent.parent / "intelligence.db"))

# --------------- Connection helper ---------------

@contextmanager
def get_intel_conn():
    """Yield (conn, is_pg) for the intelligence database.
    
    ⚠️  Production: Requires DATABASE_URL env var pointing to Supabase PostgreSQL.
       Development: Falls back to SQLite if DATABASE_URL not set.
    """
    if DATABASE_URL and HAS_PSYCOPG:
        conn = psycopg.connect(DATABASE_URL)
        try:
            yield conn, True
        finally:
            conn.close()
    else:
        if not DATABASE_URL:
            print("⚠️  WARNING: DATABASE_URL not set. Using SQLite fallback.")
            print("   For production, set DATABASE_URL in .env to your Supabase PostgreSQL URL.")
        elif not HAS_PSYCOPG:
            print("⚠️  WARNING: psycopg not installed. Using SQLite fallback.")
            print("   Install: pip install psycopg[binary]")
        
        conn = sqlite3.connect(INTEL_DB_PATH)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        try:
            yield conn, False
        finally:
            conn.close()


# --------------- Schema DDL ---------------

PG_SCHEMA = """
-- UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS aqi_measurements (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    city            VARCHAR(128) NOT NULL,
    state           VARCHAR(128),
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    timestamp       TIMESTAMPTZ NOT NULL,
    aqi             REAL,
    pm25            REAL,
    pm10            REAL,
    no2             REAL,
    so2             REAL,
    co              REAL,
    o3              REAL,
    temp            REAL,
    humidity        REAL,
    wind_speed      REAL,
    wind_dir        REAL,
    source          VARCHAR(32) DEFAULT 'waqi',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aqi_city_ts
    ON aqi_measurements (city, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_aqi_ts
    ON aqi_measurements (timestamp DESC);

CREATE TABLE IF NOT EXISTS city_clusters (
    city            VARCHAR(128) PRIMARY KEY,
    cluster_id      INTEGER NOT NULL,
    mean_aqi        REAL,
    aqi_std         REAL,
    seasonal_amp    REAL,
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    state           VARCHAR(128),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forecast_cache (
    id              SERIAL PRIMARY KEY,
    city            VARCHAR(128) NOT NULL,
    target_time     TIMESTAMPTZ NOT NULL,
    predicted_aqi   REAL NOT NULL,
    confidence_low  REAL,
    confidence_high REAL,
    model_version   VARCHAR(64),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (city, target_time, model_version)
);

CREATE INDEX IF NOT EXISTS idx_fc_city_target
    ON forecast_cache (city, target_time);

CREATE TABLE IF NOT EXISTS model_metadata (
    id              SERIAL PRIMARY KEY,
    model_name      VARCHAR(128) NOT NULL,
    version         VARCHAR(64) NOT NULL,
    model_type      VARCHAR(32) NOT NULL,
    metrics         JSONB,
    params          JSONB,
    artifact_path   VARCHAR(512),
    trained_at      TIMESTAMPTZ DEFAULT NOW(),
    is_active       BOOLEAN DEFAULT TRUE,
    UNIQUE (model_name, version)
);
"""

SQLITE_SCHEMA = """
CREATE TABLE IF NOT EXISTS aqi_measurements (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    city            TEXT NOT NULL,
    state           TEXT,
    latitude        REAL,
    longitude       REAL,
    timestamp       TEXT NOT NULL,
    aqi             REAL,
    pm25            REAL,
    pm10            REAL,
    no2             REAL,
    so2             REAL,
    co              REAL,
    o3              REAL,
    temp            REAL,
    humidity        REAL,
    wind_speed      REAL,
    wind_dir        REAL,
    source          TEXT DEFAULT 'waqi',
    created_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_aqi_city_ts
    ON aqi_measurements (city, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_aqi_ts
    ON aqi_measurements (timestamp DESC);

CREATE TABLE IF NOT EXISTS city_clusters (
    city            TEXT PRIMARY KEY,
    cluster_id      INTEGER NOT NULL,
    mean_aqi        REAL,
    aqi_std         REAL,
    seasonal_amp    REAL,
    latitude        REAL,
    longitude       REAL,
    state           TEXT,
    updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS forecast_cache (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    city            TEXT NOT NULL,
    target_time     TEXT NOT NULL,
    predicted_aqi   REAL NOT NULL,
    confidence_low  REAL,
    confidence_high REAL,
    model_version   TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    UNIQUE (city, target_time, model_version)
);

CREATE INDEX IF NOT EXISTS idx_fc_city_target
    ON forecast_cache (city, target_time);

CREATE TABLE IF NOT EXISTS model_metadata (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    model_name      TEXT NOT NULL,
    version         TEXT NOT NULL,
    model_type      TEXT NOT NULL,
    metrics         TEXT,
    params          TEXT,
    artifact_path   TEXT,
    trained_at      TEXT DEFAULT (datetime('now')),
    is_active       INTEGER DEFAULT 1,
    UNIQUE (model_name, version)
);
"""


def run_migrations():
    """Create all intelligence tables if they don't exist.
    
    ⚠️  Recommendation: Set DATABASE_URL for Supabase PostgreSQL in production.
    """
    with get_intel_conn() as (conn, is_pg):
        if is_pg:
            cur = conn.cursor()
            cur.execute(PG_SCHEMA)
            conn.commit()
            db_name = DATABASE_URL.split('@')[-1].split('/')[0] if '@' in DATABASE_URL else 'PostgreSQL'
            print(f"INTEL DB: ✓ Supabase PostgreSQL schema created/verified ({db_name})")
        else:
            for stmt in SQLITE_SCHEMA.split(";"):
                stmt = stmt.strip()
                if stmt:
                    conn.execute(stmt)
            conn.commit()
            print(f"INTEL DB: ✓ SQLite fallback at {INTEL_DB_PATH}")
            print(f"           Set DATABASE_URL in .env for Supabase PostgreSQL")


if __name__ == "__main__":
    run_migrations()
