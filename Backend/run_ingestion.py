"""
Quick script to run data ingestion once.
Fetches live AQI + weather for all 63 Indian cities.
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from Backend.intelligence.schema import run_migrations
from Backend.intelligence.ingestion import run_ingestion, INDIAN_CITIES

if __name__ == "__main__":
    print("Initializing database schema...")
    run_migrations()
    
    print(f"\nFetching live AQI + weather data for {len(INDIAN_CITIES)} cities...")
    print("This will take ~30 seconds with concurrent requests\n")
    
    result = run_ingestion(INDIAN_CITIES, max_workers=10)
    
    print(f"\n✓ Ingestion complete!")
    print(f"  Ingested: {result['ingested']}")
    print(f"  Failed: {result['failed']}")
    print(f"  Duration: {result['duration_s']}s")
    print(f"  Timestamp: {result['timestamp']}")
