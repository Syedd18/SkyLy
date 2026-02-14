"""
SkyLy Intelligence Platform - Status Check
===========================================
Run this to verify all components are ready for deployment.
"""
import os
import sys
import sqlite3
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env

sys.path.insert(0, '.')

print("=" * 70)
print("🔍 SkyLy Intelligence Platform - Status Check")
print("=" * 70)
print()

# ===== Environment Variables =====
print("📋 Environment Configuration")
print("-" * 70)

env_vars = {
    'DATABASE_URL': '🔥 Required for Supabase PostgreSQL',
    'WAQI_TOKEN': '🔥 Required for live AQI data',
    'SUPABASE_URL': 'Optional (for Supabase Auth)',
    'GEMINI_API_KEY': 'Optional (for AI chatbot)',
}

for var, desc in env_vars.items():
    value = os.getenv(var)
    if value:
        masked = value[:20] + '...' if len(value) > 20 else value
        print(f"  ✓ {var}: {masked}")
    else:
        print(f"  ✗ {var}: NOT SET - {desc}")

print()

# ===== Database Status =====
print("🗄️  Database Status")
print("-" * 70)

# Check intelligence.db
intel_db = Path('Backend/intelligence.db')
if intel_db.exists():
    conn = sqlite3.connect(str(intel_db))
    try:
        aqi_count = conn.execute('SELECT COUNT(*) FROM aqi_measurements').fetchone()[0]
        cluster_count = conn.execute('SELECT COUNT(*) FROM city_clusters').fetchone()[0]
        print(f"  ✓ SQLite intelligence.db exists ({intel_db.stat().st_size // 1024}KB)")
        print(f"    - AQI measurements: {aqi_count:,} records")
        print(f"    - City clusters: {cluster_count} cities")
        
        if aqi_count == 0:
            print(f"    ⚠️  No live data - run: python Backend/run_ingestion.py")
    except Exception as e:
        print(f"  ✗ Database error: {e}")
    finally:
        conn.close()
else:
    print(f"  ✗ intelligence.db not found - run migrations")

# Check users.db
users_db = Path('Backend/users.db')
if users_db.exists():
    print(f"  ✓ User auth DB exists ({users_db.stat().st_size // 1024}KB)")
else:
    print(f"  ℹ️  User auth DB not created yet (will auto-create on first use)")

print()

# ===== Trained Models =====
print("🤖 Trained Models")
print("-" * 70)

models_dir = Path('Backend/models')
required_files = {
    'cluster_metadata.json': 'City clustering metadata',
    'forecast_xgb.pkl': 'XGBoost forecasting model',
    'forecast_city_encoder.pkl': 'City label encoder',
    'forecast_features.json': 'Feature column definitions',
    'forecast_metrics.json': 'Model evaluation metrics',
}

all_models_exist = True
for filename, desc in required_files.items():
    filepath = models_dir / filename
    if filepath.exists():
        size = filepath.stat().st_size
        if size > 1024:
            size_str = f"{size // 1024}KB"
        else:
            size_str = f"{size}B"
        print(f"  ✓ {filename} ({size_str}) - {desc}")
    else:
        print(f"  ✗ {filename} - {desc} - MISSING!")
        all_models_exist = False

if not all_models_exist:
    print()
    print("  ⚠️  Missing models - run training:")
    print("     1. py -m Backend.intelligence.clustering")
    print("     2. py -m Backend.intelligence.forecasting")

# Load and display model metrics
metrics_file = models_dir / 'forecast_metrics.json'
if metrics_file.exists():
    import json
    with open(metrics_file) as f:
        metrics = json.load(f)
    print()
    print(f"  📊 Model Performance:")
    print(f"     - MAE: {metrics.get('mae')} (lower is better)")
    print(f"     - RMSE: {metrics.get('rmse')}")
    print(f"     - R²: {metrics.get('r2')} (closer to 1.0 is better)")
    print(f"     - Trained on: {metrics.get('train_size'):,} samples")
    print(f"     - Data source: {metrics.get('data_source', 'csv')}")

print()

# ===== Prediction Test =====
print("🎯 Prediction Test")
print("-" * 70)

try:
    from Backend.intelligence.forecasting import predict_aqi
    result = predict_aqi('Delhi', '2026-02-15')
    print(f"  ✓ Prediction engine working")
    print(f"    Delhi 2026-02-15: AQI {result['predicted_aqi']} ({result['category']})")
    print(f"    Confidence range: {result['confidence']['low']}-{result['confidence']['high']}")
except Exception as e:
    print(f"  ✗ Prediction failed: {e}")

print()

# ===== Frontend Check =====
print("🎨 Frontend")
print("-" * 70)

frontend_files = {
    'frontend-new/src/app/predict/page.tsx': 'Forecast UI with ML tab',
    'frontend-new/package.json': 'Dependencies',
}

for filepath, desc in frontend_files.items():
    if Path(filepath).exists():
        print(f"  ✓ {filepath}")
    else:
        print(f"  ✗ {filepath} - MISSING!")

print()

# ===== Deployment Readiness =====
print("🚀 Deployment Readiness")
print("-" * 70)

checklist = []

# Check essential components
if os.getenv('DATABASE_URL'):
    checklist.append(('✓', 'DATABASE_URL configured (Supabase)'))
else:
    checklist.append(('⚠️', 'DATABASE_URL not set - using SQLite fallback'))

if os.getenv('WAQI_TOKEN'):
    checklist.append(('✓', 'WAQI_TOKEN configured'))
else:
    checklist.append(('✗', 'WAQI_TOKEN missing - live data ingestion will fail'))

if all_models_exist:
    checklist.append(('✓', 'All models trained'))
else:
    checklist.append(('✗', 'Models need training'))

if Path('.env').exists():
    checklist.append(('✓', '.env file exists'))
else:
    checklist.append(('⚠️', '.env file missing - copy from .env.example'))

for status, message in checklist:
    print(f"  {status} {message}")

print()

# ===== Summary =====
print("=" * 70)
errors = sum(1 for s, _ in checklist if s == '✗')
warnings = sum(1 for s, _ in checklist if s == '⚠️')

if errors == 0 and warnings == 0:
    print("✅ System is PRODUCTION READY!")
elif errors == 0:
    print(f"⚠️  System is READY with {warnings} warning(s)")
    print("   Can run locally with SQLite - configure DATABASE_URL for production")
else:
    print(f"❌ System has {errors} error(s) and {warnings} warning(s)")
    print("   Fix errors before deployment")

print()
print("📚 Next Steps:")
if not os.getenv('DATABASE_URL'):
    print("   • Set DATABASE_URL in .env (see docs/SUPABASE_INTELLIGENCE_SETUP.md)")
if not os.getenv('WAQI_TOKEN'):
    print("   • Set WAQI_TOKEN in .env")
print("   • Start backend: cd Backend && python main.py")
print("   • Start frontend: cd frontend-new && npm run dev")
print("   • Test forecast: http://localhost:3000/predict")
print("=" * 70)
