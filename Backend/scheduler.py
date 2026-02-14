"""
Background Job Scheduler for SkyLy
===================================
Automates periodic tasks:
- Data ingestion (live AQI + weather) every hour
- Model retraining (optional, daily)
- Database cleanup (optional)

Configuration via env vars:
- ENABLE_AUTO_INGESTION=true/false (default: true)
- INGESTION_INTERVAL_MINUTES=60 (default: 60)
- ENABLE_AUTO_RETRAINING=true/false (default: false)
"""
import os
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()  # Ensure env vars are loaded

logger = logging.getLogger("skyly.scheduler")

# Configuration from environment
ENABLE_AUTO_INGESTION = os.getenv("ENABLE_AUTO_INGESTION", "true").lower() == "true"
INGESTION_INTERVAL_MINUTES = int(os.getenv("INGESTION_INTERVAL_MINUTES", "60"))
ENABLE_AUTO_RETRAINING = os.getenv("ENABLE_AUTO_RETRAINING", "false").lower() == "true"
RETRAINING_HOUR = int(os.getenv("RETRAINING_HOUR", "3"))  # 3 AM daily

scheduler = BackgroundScheduler()


def run_ingestion_job():
    """Background job: Fetch live AQI + weather for all cities."""
    try:
        logger.info("Starting scheduled ingestion...")
        from Backend.intelligence.ingestion import run_ingestion, INDIAN_CITIES
        
        result = run_ingestion(INDIAN_CITIES, max_workers=10)
        logger.info(
            f"✓ Ingestion complete: {result['ingested']}/{result['ingested'] + result['failed']} cities, "
            f"{result['duration_s']}s"
        )
    except Exception as e:
        logger.error(f"Ingestion job failed: {e}", exc_info=True)


def run_retraining_job():
    """Background job: Retrain forecasting model with latest data."""
    try:
        logger.info("Starting scheduled model retraining...")
        from Backend.intelligence.forecasting import train_forecasting_model
        
        metrics = train_forecasting_model(use_live_data=True)
        logger.info(
            f"✓ Model retrained: MAE={metrics['mae']}, R²={metrics['r2']}, "
            f"source={metrics['data_source']}"
        )
    except Exception as e:
        logger.error(f"Retraining job failed: {e}", exc_info=True)


def start_scheduler():
    """Initialize and start the background scheduler."""
    if not scheduler.running:
        # Job 1: Periodic data ingestion
        if ENABLE_AUTO_INGESTION:
            scheduler.add_job(
                run_ingestion_job,
                trigger=IntervalTrigger(minutes=INGESTION_INTERVAL_MINUTES),
                id="ingestion_job",
                name="Live AQI + Weather Ingestion",
                replace_existing=True,
                next_run_time=datetime.now(),  # Run immediately on startup
            )
            msg = f"✓ Scheduled ingestion job: every {INGESTION_INTERVAL_MINUTES} minutes"
            logger.info(msg)
            print(msg)
        
        # Job 2: Daily model retraining (optional)
        if ENABLE_AUTO_RETRAINING:
            scheduler.add_job(
                run_retraining_job,
                trigger="cron",
                hour=RETRAINING_HOUR,
                minute=0,
                id="retraining_job",
                name="Daily Model Retraining",
                replace_existing=True,
            )
            msg = f"✓ Scheduled retraining job: daily at {RETRAINING_HOUR}:00"
            logger.info(msg)
            print(msg)
        
        scheduler.start()
        msg = "✓ Background scheduler started"
        logger.info(msg)
        print(msg)


def stop_scheduler():
    """Gracefully shut down the scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Background scheduler stopped")
