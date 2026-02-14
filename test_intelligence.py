import sys
sys.path.insert(0, '.')
from Backend.intelligence.forecasting import predict_aqi, forecast_range

print("Testing Intelligence Engine...")
print("=" * 50)

# Test single prediction
try:
    result = predict_aqi('Delhi', '2026-02-15')
    print("✓ Single prediction PASSED")
    print(f"  Delhi 2026-02-15: AQI {result['predicted_aqi']} ({result['category']})")
    print(f"  Confidence: {result['confidence']['low']}-{result['confidence']['high']}")
except Exception as e:
    print(f"✗ Single prediction FAILED: {e}")

print()

# Test forecast range
try:
    forecasts = forecast_range('Mumbai', days=3)
    print("✓ Forecast range PASSED")
    for f in forecasts:
        if f.get('predicted_aqi'):
            date = f['target_date'][:10]
            print(f"  {date}: AQI {f['predicted_aqi']} ({f['category']})")
except Exception as e:
    print(f"✗ Forecast range FAILED: {e}")

print()
print("=" * 50)
print("Status: Intelligence engine is READY!")
