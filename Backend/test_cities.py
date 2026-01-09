import requests
from concurrent.futures import ThreadPoolExecutor

WAQI_TOKEN = '9fe0a55684bf08d8c8131b1cba6233542f86f55d'
INDIAN_CITIES = [
    {'name': 'Delhi', 'lat': 28.6139, 'lng': 77.2090},
    {'name': 'Mumbai', 'lat': 19.0760, 'lng': 72.8777},
    {'name': 'Bangalore', 'lat': 12.9716, 'lng': 77.5946},
    {'name': 'Chennai', 'lat': 13.0827, 'lng': 80.2707},
    {'name': 'Kolkata', 'lat': 22.5726, 'lng': 88.3639}
]

def fetch_city_aqi(city):
    try:
        url = f"https://api.waqi.info/feed/{city['name']}/"
        res = requests.get(url, params={'token': WAQI_TOKEN}, timeout=2)
        data = res.json()
        
        if data.get('status') == 'ok':
            aqi_value = data.get('data', {}).get('aqi')
            if aqi_value not in ['-', None, '']:
                try:
                    aqi_float = float(aqi_value)
                    return {'name': city['name'], 'lat': city['lat'], 'lng': city['lng'], 'aqi': aqi_float}
                except (ValueError, TypeError):
                    pass
    except Exception as e:
        print(f'Error with {city["name"]}: {e}')
    return None

available_cities = []
with ThreadPoolExecutor(max_workers=5) as executor:
    results = list(executor.map(fetch_city_aqi, INDIAN_CITIES))
    available_cities = [r for r in results if r]

print(f'Total cities: {len(available_cities)}')
for city in available_cities:
    print(f"  {city['name']}: AQI {city['aqi']}")
