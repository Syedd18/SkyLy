"""
SkyLy AQI Intelligence Engine
==============================
Production-ready modules for data ingestion, city clustering,
time-series forecasting, and prediction serving.

Modules:
    schema      – Database schema (PostgreSQL-first, SQLite fallback)
    ingestion   – Hourly AQI + weather data fetcher
    clustering  – City grouping by AQI patterns & climate
    forecasting – XGBoost time-series model training & inference
    serving     – FastAPI router with /forecast, /predict endpoints

Quick Start:
    from Backend.intelligence.schema import run_migrations
    from Backend.intelligence.serving import router

    run_migrations()
    app.include_router(router)
"""
