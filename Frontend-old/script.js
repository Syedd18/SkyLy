// ==================== CONFIGURATION ====================
const API_BASE_URL = "http://127.0.0.1:8000";
// Change to your backend URL

// List of major Indian cities for Map and Ranking features
const INDIAN_CITIES = [
  { name: "Delhi", lat: 28.6139, lng: 77.2090 },
  { name: "Mumbai", lat: 19.0760, lng: 72.8777 },
  { name: "Bangalore", lat: 12.9716, lng: 77.5946 },
  { name: "Chennai", lat: 13.0827, lng: 80.2707 },
  { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
  { name: "Hyderabad", lat: 17.3850, lng: 78.4867 },
  { name: "Pune", lat: 18.5204, lng: 73.8567 },
  { name: "Ahmedabad", lat: 23.0225, lng: 72.5714 },
  { name: "Jaipur", lat: 26.9124, lng: 75.7873 },
  { name: "Lucknow", lat: 26.8467, lng: 80.9462 },
  { name: "Kanpur", lat: 26.4499, lng: 80.3319 },
  { name: "Nagpur", lat: 21.1458, lng: 79.0882 },
  { name: "Indore", lat: 22.7196, lng: 75.8577 },
  { name: "Bhopal", lat: 23.2599, lng: 77.4126 },
  { name: "Patna", lat: 25.5941, lng: 85.1376 },
  { name: "Ranchi", lat: 23.3441, lng: 85.3096 },
  { name: "Gurugram", lat: 28.4595, lng: 77.0266 },
  { name: "Noida", lat: 28.5355, lng: 77.3910 },
  { name: "Faridabad", lat: 28.4089, lng: 77.3178 },
  { name: "Ghaziabad", lat: 28.6692, lng: 77.4538 },
  { name: "Meerut", lat: 28.9845, lng: 77.7064 },
  { name: "Agra", lat: 27.1767, lng: 78.0081 },
  { name: "Varanasi", lat: 25.3176, lng: 82.9739 },
  { name: "Prayagraj", lat: 25.4358, lng: 81.8463 },
  { name: "Amritsar", lat: 31.6340, lng: 74.8723 },
  { name: "Ludhiana", lat: 30.9010, lng: 75.8573 },
  { name: "Jalandhar", lat: 31.3260, lng: 75.5762 },
  { name: "Chandigarh", lat: 30.7333, lng: 76.7794 },
  { name: "Dehradun", lat: 30.3165, lng: 78.0322 },
  { name: "Roorkee", lat: 29.8543, lng: 77.8880 },
  { name: "Shimla", lat: 31.1048, lng: 77.1734 },
  { name: "Srinagar", lat: 34.0837, lng: 74.7973 },
  { name: "Jammu", lat: 32.7266, lng: 74.8570 },
  { name: "Udaipur", lat: 24.5854, lng: 73.7125 },
  { name: "Jodhpur", lat: 26.2389, lng: 73.0243 },
  { name: "Kota", lat: 25.2138, lng: 75.8648 },
  { name: "Rajkot", lat: 22.3039, lng: 70.8022 },
  { name: "Vadodara", lat: 22.3072, lng: 73.1812 },
  { name: "Surat", lat: 21.1702, lng: 72.8311 },
  { name: "Vapi", lat: 20.3717, lng: 72.9049 },
  { name: "Nashik", lat: 19.9975, lng: 73.7898 },
  { name: "Aurangabad", lat: 19.8762, lng: 75.3433 },
  { name: "Solapur", lat: 17.6599, lng: 75.9064 },
  { name: "Kolhapur", lat: 16.7050, lng: 74.2433 },
  { name: "Coimbatore", lat: 11.0168, lng: 76.9558 },
  { name: "Madurai", lat: 9.9252, lng: 78.1198 },
  { name: "Tiruchirappalli", lat: 10.7905, lng: 78.7047 },
  { name: "Salem", lat: 11.6643, lng: 78.1460 },
  { name: "Vellore", lat: 12.9165, lng: 79.1325 },
  { name: "Erode", lat: 11.3410, lng: 77.7172 },
  { name: "Visakhapatnam", lat: 17.6868, lng: 83.2185 },
  { name: "Vijayawada", lat: 16.5062, lng: 80.6480 },
  { name: "Guntur", lat: 16.3067, lng: 80.4365 },
  { name: "Rajahmundry", lat: 17.0005, lng: 81.8040 },
  { name: "Tirupati", lat: 13.6288, lng: 79.4192 },
  { name: "Bhubaneswar", lat: 20.2961, lng: 85.8245 },
  { name: "Cuttack", lat: 20.4625, lng: 85.8828 },
  { name: "Rourkela", lat: 22.2604, lng: 84.8536 },
  { name: "Durgapur", lat: 23.5204, lng: 87.3119 },
  { name: "Asansol", lat: 23.6739, lng: 86.9524 },
  { name: "Siliguri", lat: 26.7271, lng: 88.3953 },
  { name: "Guwahati", lat: 26.1445, lng: 91.7362 },
  { name: "Shillong", lat: 25.5788, lng: 91.8933 }
];


// ==================== THEME MANAGEMENT ====================
let currentTheme = localStorage.getItem('theme') || 'light';

function initializeTheme() {
  document.documentElement.setAttribute('data-theme', currentTheme);
  updateThemeIcon();
}

function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);
  localStorage.setItem('theme', currentTheme);
  updateThemeIcon();
}

function updateThemeIcon() {
  const themeIcon = document.querySelector('#theme-toggle i');
  if (currentTheme === 'light') {
    themeIcon.className = 'fas fa-moon';
  } else {
    themeIcon.className = 'fas fa-sun';
  }
}


// ==================== UTILITY FUNCTIONS ====================
function showLoading() {
  document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loading-overlay').classList.add('hidden');
}

function showError(elementId, message) {
  const errorEl = document.getElementById(elementId);
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
}

function hideError(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.classList.add('hidden');
}

function getAQICategory(aqi) {
  if (aqi <= 50) {
    return {
      category: 'Good',
      class: 'aqi-good',
      label: 'Good',
      color: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.15)',
      borderColor: 'rgba(16, 185, 129, 0.4)',
      description: 'Air quality is satisfactory, and air pollution poses little or no risk.'
    };
  }
  if (aqi <= 100) {
    return {
      category: 'Moderate',
      class: 'aqi-moderate',
      label: 'Moderate',
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.15)',
      borderColor: 'rgba(245, 158, 11, 0.4)',
      description: 'Air quality is acceptable. However, there may be a risk for some people.'
    };
  }
  if (aqi <= 150) {
    return {
      category: 'Unhealthy for Sensitive Groups',
      class: 'aqi-unhealthy-sensitive',
      label: 'Unhealthy for Sensitive',
      color: '#f97316',
      bgColor: 'rgba(249, 115, 22, 0.15)',
      borderColor: 'rgba(249, 115, 22, 0.4)',
      description: 'Members of sensitive groups may experience health effects.'
    };
  }
  if (aqi <= 200) {
    return {
      category: 'Unhealthy',
      class: 'aqi-unhealthy',
      label: 'Unhealthy',
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.15)',
      borderColor: 'rgba(239, 68, 68, 0.4)',
      description: 'Everyone may begin to experience health effects. Sensitive groups at greater risk.'
    };
  }
  if (aqi <= 300) {
    return {
      category: 'Very Unhealthy',
      class: 'aqi-very-unhealthy',
      label: 'Very Unhealthy',
      color: '#a855f7',
      bgColor: 'rgba(168, 85, 247, 0.15)',
      borderColor: 'rgba(168, 85, 247, 0.4)',
      description: 'Health alert: everyone may experience more serious health effects.'
    };
  }
  return {
    category: 'Hazardous',
    class: 'aqi-hazardous',
    label: 'Hazardous',
    color: '#dc2626',
    bgColor: 'rgba(220, 38, 38, 0.15)',
    borderColor: 'rgba(220, 38, 38, 0.5)',
    description: 'Health warning of emergency conditions. The entire population is likely to be affected.'
  };
}

function getMarkerColor(aqi) {
  if (aqi <= 50) return '#10b981';
  if (aqi <= 100) return '#f59e0b';
  if (aqi <= 150) return '#f97316';
  if (aqi <= 200) return '#ef4444';
  if (aqi <= 300) return '#a855f7';
  return '#7f1d1d';
}

// Helper function for navigation
function navigateToSection(sectionId) {
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.section');
  
  navLinks.forEach(l => l.classList.remove('active'));
  const targetLink = document.querySelector(`.nav-link[data-section="${sectionId}"]`);
  if (targetLink) targetLink.classList.add('active');
  
  sections.forEach(s => s.classList.remove('active'));
  const targetSection = document.getElementById(sectionId);
  if (targetSection) targetSection.classList.add('active');
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  // Trigger section-specific loads
  if (sectionId === 'map' && !window.indiaMap) {
    initializeMap();
  }
  if (sectionId === 'ranking') {
    loadRankings();
  }
  if (sectionId === 'dashboard') {
    if (typeof loadDashboard === 'function') loadDashboard();
  }
}


// ==================== NAVIGATION & INIT ====================
document.addEventListener('DOMContentLoaded', function () {
  initializeTheme();
  
  // Authentication is handled by auth.js
  // if (typeof initAuth === 'function') {
  //   initAuth();
  // }
  
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.section');

  navLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const targetSection = this.getAttribute('data-section');
      navigateToSection(targetSection);
    });
  });

  loadCities();
  
  // Load cities for multi-city comparison dropdowns (features.js)
  if (typeof loadCompareCities === 'function') {
    loadCompareCities();
  }

  // ==================== NEW: MAP TOGGLE BUTTON WIRES ====================
  const groundToggle = document.getElementById('ground-map-toggle');
  const satelliteToggle = document.getElementById('satellite-map-toggle');
  if (groundToggle && satelliteToggle) {
    groundToggle.addEventListener('click', () => {
      document.getElementById('india-map').style.display = 'block';
      document.getElementById('india-aod-map').style.display = 'none';
      groundToggle.classList.add('btn-primary');
      satelliteToggle.classList.remove('btn-primary');
    });

    satelliteToggle.addEventListener('click', () => {
      document.getElementById('india-map').style.display = 'none';
      document.getElementById('india-aod-map').style.display = 'block';
      satelliteToggle.classList.add('btn-primary');
      groundToggle.classList.remove('btn-primary');
      // lazy init satellite map on first switch
      if (!window.indiaAodMap) {
        initializeSatelliteMap();
      }
    });
  }
});


// ==================== LOAD DROPDOWN CITIES ====================
async function loadCities() {
  try {
    const response = await fetch(API_BASE_URL + '/cities');
    const cities = await response.json();

    const selects = [
      'analytics-city-select', 
      'compare-city1-select', 
      'compare-city2-select',
      'historical-city-select',
      'migration-city-select'
    ];
    
    selects.forEach(function (selectId) {
      const select = document.getElementById(selectId);
      if (!select) return;

      // Clear existing options except the first one
      while (select.options.length > 1) {
        select.remove(1);
      }
      cities.forEach(function (city) {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        select.appendChild(option);
      });
    });
  } catch (error) {
    console.error('Error loading cities:', error);
  }
}


// ==================== LIVE AQI MODULE ====================
document.getElementById('fetch-live-btn').addEventListener('click', fetchLiveAQI);
document.getElementById('live-city-input').addEventListener('keypress', function (e) {
  if (e.key === 'Enter') fetchLiveAQI();
});
document.getElementById('view-stations-btn').addEventListener('click', fetchCityStations);

// Add to favorites button
const addFavoriteBtn = document.getElementById('add-favorite-btn');
if (addFavoriteBtn) {
  addFavoriteBtn.addEventListener('click', async function() {
    if (window.currentLiveCity && typeof addFavorite === 'function') {
      const success = await addFavorite(window.currentLiveCity);
      if (success && typeof loadDashboard === 'function') {
        loadDashboard(); // Refresh dashboard
      }
    }
  });
}

async function fetchLiveAQI() {
  const cityInput = document.getElementById('live-city-input');
  const city = cityInput.value.trim();

  if (!city) {
    showError('live-error', 'Please enter a city name');
    return;
  }

  hideError('live-error');
  showLoading();

  try {
    const response = await fetch(API_BASE_URL + '/live/aqi?city=' + encodeURIComponent(city));
    if (!response.ok) throw new Error('City not found or API error');

    const data = await response.json();
    displayLiveAQI(data);

    // Store current city for stations view
    window.currentLiveCity = city;

    // Hide stations container when fetching new city
    document.getElementById('stations-container').classList.add('hidden');
    
    // Show Add to Favorites button for authenticated users
    const addFavBtn = document.getElementById('add-favorite-btn');
    if (addFavBtn && typeof authToken !== 'undefined' && authToken) {
      addFavBtn.style.display = 'inline-flex';
    }

    // NEW: check local alert rules after every live fetch
    checkLocalAlerts(data.city, data.aqi);

    document.getElementById('live-result').classList.remove('hidden');

    // ==================== NEW: ALSO FETCH SATELLITE LIVE (NON-BLOCKING) ====================
    fetchSatelliteLiveSafe(data.city);
  } catch (error) {
    showError('live-error', 'Error: ' + error.message);
    document.getElementById('live-result').classList.add('hidden');
  } finally {
    hideLoading();
  }
}

async function fetchCityStations() {
  const city = window.currentLiveCity;
  
  if (!city) {
    alert('Please search for a city first');
    return;
  }

  showLoading();

  try {
    const response = await fetch(API_BASE_URL + '/live/aqi/stations?city=' + encodeURIComponent(city));
    if (!response.ok) throw new Error('Failed to fetch stations');

    const data = await response.json();
    displayCityStations(data);
  } catch (error) {
    alert('Error fetching stations: ' + error.message);
  } finally {
    hideLoading();
  }
}

// Store current sort order
let stationSortOrder = 'highest'; // 'highest' or 'lowest'
let currentStationsData = null;

function displayCityStations(data) {
  const container = document.getElementById('stations-container');
  const grid = document.getElementById('stations-grid');
  
  // Store data for toggling
  currentStationsData = data;
  
  grid.innerHTML = '';

  if (!data.stations || data.stations.length === 0) {
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No stations with valid data found</p>';
    container.classList.remove('hidden');
    return;
  }

  // Add toggle button at the top
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'btn btn-primary';
  toggleBtn.style.gridColumn = '1/-1';
  toggleBtn.style.marginBottom = '1rem';
  toggleBtn.innerHTML = stationSortOrder === 'highest' 
    ? '<i class="fas fa-arrow-down"></i> Show Station with Lowest AQI'
    : '<i class="fas fa-arrow-up"></i> Show Station with Highest AQI';
  toggleBtn.onclick = toggleStationSort;
  grid.appendChild(toggleBtn);

  // Sort stations based on current order
  const sortedStations = [...data.stations].sort((a, b) => 
    stationSortOrder === 'highest' ? b.aqi - a.aqi : a.aqi - b.aqi
  );

  sortedStations.forEach(station => {
    const aqi = station.aqi;
    const result = getAQICategory(aqi);

    const stationCard = document.createElement('div');
    stationCard.className = 'pollutant-item';
    stationCard.style.background = `linear-gradient(135deg, ${result.bgColor} 0%, rgba(15, 30, 48, 0.8) 100%)`;
    stationCard.style.border = `1px solid ${result.borderColor}`;
    
    stationCard.innerHTML = `
      <div class="pollutant-name" style="font-weight: 600; font-size: 0.95rem;">
        <i class="fas fa-broadcast-tower"></i> ${station.station_name}
      </div>
      <div class="pollutant-value" style="font-size: 2.5rem; font-weight: bold; color: ${result.color}; margin: 1rem 0;">
        ${aqi}
      </div>
      <div style="font-size: 1.1rem; font-weight: 600; color: ${result.color}; text-transform: uppercase; letter-spacing: 0.5px;">
        ${station.label || result.label}
      </div>
      <div style="font-size: 0.85rem; margin-top: 0.5rem; padding: 0.4rem 0.8rem; background: rgba(0,0,0,0.2); border-radius: 8px; color: rgba(255,255,255,0.8);">
        ${station.description || result.description}
      </div>
      ${station.coordinates.lat ? `
        <div style="font-size: 0.75rem; margin-top: 0.8rem; opacity: 0.6;">
          <i class="fas fa-map-marker-alt"></i> ${station.coordinates.lat.toFixed(4)}, ${station.coordinates.lng.toFixed(4)}
        </div>
      ` : ''}
      <div style="font-size: 0.7rem; margin-top: 0.5rem; opacity: 0.5;">
        ${station.time || 'N/A'}
      </div>
    `;
    grid.appendChild(stationCard);
  });

  container.classList.remove('hidden');
  
  // Scroll to stations
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function toggleStationSort() {
  stationSortOrder = stationSortOrder === 'highest' ? 'lowest' : 'highest';
  if (currentStationsData) {
    displayCityStations(currentStationsData);
  }
}

function displayLiveAQI(data) {
  document.getElementById('live-city-name').textContent = data.city || 'Unknown';
  document.getElementById('live-timestamp').textContent = 'Updated: ' + (data.time || 'N/A');

  // NEW: keep alert city synced with the currently viewed city
  const alertCityInput = document.getElementById('alert-city');
  if (alertCityInput) {
    alertCityInput.value = data.city || '';
  }

  const aqi = data.aqi || 0;
  const result = getAQICategory(aqi);

  // Update gauge meter
  const aqiValueEl = document.getElementById('live-aqi-value');
  aqiValueEl.textContent = aqi;
  
  // Animate gauge progress (max AQI of 500 for display)
  const gaugeProgress = document.getElementById('gauge-progress');
  if (gaugeProgress) {
    const maxAQI = 500;
    const percentage = Math.min((aqi / maxAQI) * 100, 100);
    const circumference = 251.2; // Approximate arc length
    const offset = circumference - (circumference * percentage) / 100;
    gaugeProgress.style.strokeDashoffset = offset;
    
    // Update gradient colors based on AQI
    const gradient = gaugeProgress.parentElement.querySelector('#gaugeGradient');
    if (gradient && aqi <= 50) {
      gradient.innerHTML = '<stop offset="0%" style="stop-color:#10b981;stop-opacity:1" /><stop offset="100%" style="stop-color:#10b981;stop-opacity:1" />';
    } else if (gradient && aqi <= 100) {
      gradient.innerHTML = '<stop offset="0%" style="stop-color:#10b981;stop-opacity:1" /><stop offset="100%" style="stop-color:#f59e0b;stop-opacity:1" />';
    } else if (gradient && aqi <= 150) {
      gradient.innerHTML = '<stop offset="0%" style="stop-color:#f59e0b;stop-opacity:1" /><stop offset="100%" style="stop-color:#f97316;stop-opacity:1" />';
    } else if (gradient) {
      gradient.innerHTML = '<stop offset="0%" style="stop-color:#f97316;stop-opacity:1" /><stop offset="100%" style="stop-color:#ef4444;stop-opacity:1" />';
    }
  }
  
  const categoryEl = document.getElementById('live-aqi-category');
  categoryEl.textContent = result.category;
  categoryEl.className = 'aqi-category ' + result.class;
  categoryEl.style.color = result.color;
  categoryEl.style.borderColor = result.borderColor;
  categoryEl.style.background = result.bgColor;
  
  // Add description below category
  const descriptionEl = document.getElementById('live-aqi-description');
  if (descriptionEl) {
    descriptionEl.textContent = result.description;
  }

  document.getElementById('live-dominant').textContent = data.dominant_pollutant || 'N/A';

  const pollutantsGrid = document.getElementById('pollutants-grid');
  pollutantsGrid.innerHTML = '';

  const components = data.components || {};
  const pollutantNames = { pm25: 'PM2.5', pm10: 'PM10', no2: 'NO₂', so2: 'SO₂', co: 'CO', o3: 'O₃', t: 'Temp', h: 'Humidity', p: 'Pressure', w: 'Wind' };

  Object.keys(components).forEach(function (key) {
    if (components[key] && components[key].v !== undefined) {
      const pollutantDiv = document.createElement('div');
      pollutantDiv.className = 'pollutant-item';
      pollutantDiv.innerHTML =
        '<div class="pollutant-name">' + (pollutantNames[key] || key.toUpperCase()) + '</div>' +
        '<div class="pollutant-value">' + components[key].v + '</div>';
      pollutantsGrid.appendChild(pollutantDiv);
    }
  });
}

// ==================== NEW: SATELLITE LIVE HELPERS ====================
async function fetchSatelliteLiveSafe(cityName) {
  // best-effort: do not affect original UX
  try {
    const res = await fetch(`${API_BASE_URL}/satellite/live?city=${encodeURIComponent(cityName)}`);
    if (!res.ok) return;
    const sat = await res.json();
    renderSatelliteTiles(sat);
  } catch {
    // ignore errors silently to keep original logic untouched
  }
}

function renderSatelliteTiles(sat) {
  const grid = document.getElementById('pollutants-grid');
  if (!grid || !sat) return;

  const items = [
    { label: 'Satellite US AQI', value: sat.us_aqi },
    { label: 'Satellite EU AQI', value: sat.european_aqi },
    { label: 'PM2.5 (µg/m³, model)', value: sat.pm2_5 },
    { label: 'PM10 (µg/m³, model)', value: sat.pm10 },
    { label: 'Dust (µg/m³, model)', value: sat.dust },
    { label: 'NO₂ (µg/m³, model)', value: sat.nitrogen_dioxide },
    { label: 'SO₂ (µg/m³, model)', value: sat.sulphur_dioxide },
    { label: 'O₃ (µg/m³, model)', value: sat.ozone },
    { label: 'CO (µg/m³, model)', value: sat.carbon_monoxide },
  ];

  items.forEach(it => {
    if (it.value === null || it.value === undefined) return;
    const div = document.createElement('div');
    div.className = 'pollutant-item';
    div.innerHTML =
      `<div class="pollutant-name">${it.label}</div>` +
      `<div class="pollutant-value">${Math.round(it.value * 10) / 10}</div>`;
    grid.appendChild(div);
  });
}


// ==================== MAP MODULE ====================
let indiaMap = null;

function initializeMap() {
  if (indiaMap) return;

  indiaMap = L.map('india-map').setView([22.5937, 78.9629], 5); // Centered on India

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(indiaMap);

  loadMapData();
}

async function loadMapData() {
  showLoading();
  try {
    // Fetch all available cities from the API
    const response = await fetch(API_BASE_URL + '/cities/available');
    if (!response.ok) throw new Error('Failed to fetch cities');
    
    const data = await response.json();
    const cities = data.cities || [];

    cities.forEach(city => {
      if (city.aqi !== null && city.aqi !== undefined) {
        const color = getMarkerColor(city.aqi);
        const category = getAQICategory(city.aqi).category;

        const marker = L.circleMarker([city.lat, city.lng], {
          color: '#fff',
          fillColor: color,
          fillOpacity: 0.8,
          radius: 12,
          weight: 2
        }).addTo(indiaMap);

        marker.bindPopup(`
            <div style="text-align:center; color: #333;">
                <h3 style="margin:0 0 5px 0;">${city.name}</h3>
                <div style="font-size:24px; font-weight:bold; color:${color}">${city.aqi}</div>
                <div>${category}</div>
            </div>
        `);
      }
    });
  } catch (error) {
    showError('map-error', 'Failed to load map data');
  } finally {
    hideLoading();
  }
}

// ==================== NEW: SATELLITE MAP MODULE ====================
let indiaAodMap = null;

function initializeSatelliteMap() {
  if (indiaAodMap) return;

  indiaAodMap = L.map('india-aod-map').setView([22.5937, 78.9629], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(indiaAodMap);

  loadSatelliteMapData();
}

async function loadSatelliteMapData() {
  showLoading();
  try {
    const res = await fetch(`${API_BASE_URL}/satellite/map`);
    if (!res.ok) throw new Error('No satellite data');
    const items = await res.json();

    items.forEach(city => {
      if (city.us_aqi == null && city.european_aqi == null) return;
      const aqi = city.us_aqi ?? city.european_aqi;
      const color = getMarkerColor(aqi);
      const cat = getAQICategory(aqi).category;

      const marker = L.circleMarker([city.lat, city.lng], {
        color: '#fff',
        fillColor: color,
        fillOpacity: 0.8,
        radius: 12,
        weight: 2
      }).addTo(indiaAodMap);

      marker.bindPopup(`
          <div style="text-align:center; color:#333;">
            <h3 style="margin:0 0 5px 0;">${city.city}</h3>
            <div style="font-size:22px; font-weight:bold; color:${color}">${Math.round(aqi)}</div>
            <div>${cat} (model)</div>
            <div style="margin-top:4px;font-size:12px;">US AQI: ${city.us_aqi ?? 'N/A'} | EU AQI: ${city.european_aqi ?? 'N/A'}</div>
          </div>
      `);
    });
  } catch (e) {
    showError('map-error', 'Failed to load satellite map data');
  } finally {
    hideLoading();
  }
}


// ==================== RANKING MODULE ====================
document.getElementById('refresh-ranking-btn').addEventListener('click', loadRankings);

async function loadRankings() {
  const list = document.getElementById('ranking-list');
  const timestampEl = document.getElementById('ranking-timestamp');

  showLoading();
  hideError('ranking-error');

  // Clear old data every time (true refresh)
  list.innerHTML = '';

  try {
    // Fetch all available cities from the API
    const response = await fetch(API_BASE_URL + '/cities/available');
    if (!response.ok) throw new Error('Failed to fetch cities');
    
    const data = await response.json();
    let results = data.cities || [];

    if (results.length === 0) {
      throw new Error('No ranking data available');
    }

    // Sort by AQI: lower is better (cleaner air)
    results.sort((a, b) => a.aqi - b.aqi);

    results.forEach((city, index) => {
      const rank = index + 1;
      const cat = getAQICategory(city.aqi);

      const item = document.createElement('div');
      item.className = 'ranking-item';

      item.innerHTML = `
            <div class="ranking-left">
                <span class="rank-number">#${rank}</span>
                <span class="city-name">${city.name}</span>
            </div>
            <div class="ranking-right">
                <span class="ranking-aqi" style="color: ${cat.color}; font-weight: bold;">${city.aqi}</span>
                <span class="ranking-category" style="color: ${cat.color}; font-size: 0.9rem;">${cat.category}</span>
            </div>
        `;

      list.appendChild(item);
    });

    // ✅ Update timestamp
    const now = new Date();
    timestampEl.textContent =
      'Last updated: ' + now.toLocaleString();

  } catch (err) {
    showError('ranking-error', 'Failed to load rankings');
    console.error(err);
  } finally {
    hideLoading();
  }
}


// ==================== ANALYTICS MODULE ====================
document.getElementById('fetch-analytics-btn').addEventListener('click', fetchAnalytics);
let analyticsChart = null;

async function fetchAnalytics() {
  const citySelect = document.getElementById('analytics-city-select');
  const city = citySelect.value;

  if (!city) {
    showError('analytics-error', 'Please select a city');
    return;
  }

  hideError('analytics-error');
  showLoading();

  try {
    const response = await fetch(API_BASE_URL + '/analytics?city=' + encodeURIComponent(city));
    if (!response.ok) throw new Error('No data available');

    const data = await response.json();
    displayAnalytics(data, city);
    document.getElementById('analytics-result').classList.remove('hidden');
  } catch (error) {
    showError('analytics-error', 'Error: ' + error.message);
    document.getElementById('analytics-result').classList.add('hidden');
  } finally {
    hideLoading();
  }
}

function displayAnalytics(data, city) {
  const aqiValues = data.aqi || [];
  const dates = data.dates || [];

  // Basic stats
  const maxAQI = Math.max(...aqiValues);
  const minAQI = Math.min(...aqiValues);
  const avgAQI = (aqiValues.reduce((a, b) => a + b, 0) / aqiValues.length).toFixed(1);
  const maxDate = dates[aqiValues.indexOf(maxAQI)];

  const insightsGrid = document.getElementById('analytics-insights');
  insightsGrid.innerHTML = `
        <div class="insight-item">
            <div class="insight-label">Maximum AQI</div>
            <div class="insight-value">${maxAQI}</div>
        </div>
        <div class="insight-item">
            <div class="insight-label">Peak Date</div>
            <div class="insight-value" style="font-size: 1.2rem;">${new Date(maxDate).toLocaleDateString()}</div>
        </div>
        <div class="insight-item">
            <div class="insight-label">Average AQI</div>
            <div class="insight-value">${avgAQI}</div>
        </div>
        <div class="insight-item">
            <div class="insight-label">Minimum AQI</div>
            <div class="insight-value">${minAQI}</div>
        </div>`;

  const ctx = document.getElementById('analytics-chart').getContext('2d');
  if (analyticsChart) analyticsChart.destroy();

  analyticsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [{
        label: `${city} AQI`,
        data: aqiValues,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: { y: { beginAtZero: true } }
    }
  });
}


// ==================== COMPARE MODULE ====================
const fetchCompareBtn = document.getElementById('fetch-compare-btn');
if (fetchCompareBtn) {
  fetchCompareBtn.addEventListener('click', fetchCompare);
}
let compareChart = null;

async function fetchCompare() {
  const city1 = document.getElementById('compare-city1-select').value;
  const city2 = document.getElementById('compare-city2-select').value;

  if (!city1 || !city2) {
    showError('compare-error', 'Please select both cities');
    return;
  }
  if (city1 === city2) {
    showError('compare-error', 'Please select different cities');
    return;
  }

  hideError('compare-error');
  showLoading();

  try {
    const response = await fetch(`${API_BASE_URL}/compare?city1=${encodeURIComponent(city1)}&city2=${encodeURIComponent(city2)}`);
    if (!response.ok) throw new Error('Comparison data not available');

    const data = await response.json();
    displayComparison(data);
    document.getElementById('compare-result').classList.remove('hidden');
  } catch (error) {
    showError('compare-error', 'Error: ' + error.message);
    document.getElementById('compare-result').classList.add('hidden');
  } finally {
    hideLoading();
  }
}

function displayComparison(data) {
  const c1 = data.city1;
  const c2 = data.city2;

  const getStats = (arr) => ({
    avg: (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1),
    max: Math.max(...arr),
    min: Math.min(...arr)
  });

  const s1 = getStats(c1.aqi);
  const s2 = getStats(c2.aqi);

  const statsContainer = document.getElementById('comparison-stats');
  statsContainer.innerHTML = `
        <div class="comparison-card">
            <h4>${c1.name}</h4>
            <div class="stat-row"><span class="stat-label">Avg AQI</span><span class="stat-value">${s1.avg}</span></div>
            <div class="stat-row"><span class="stat-label">Max AQI</span><span class="stat-value">${s1.max}</span></div>
            <div class="stat-row"><span class="stat-label">Min AQI</span><span class="stat-value">${s1.min}</span></div>
        </div>
        <div class="comparison-card">
            <h4>${c2.name}</h4>
            <div class="stat-row"><span class="stat-label">Avg AQI</span><span class="stat-value">${s2.avg}</span></div>
            <div class="stat-row"><span class="stat-label">Max AQI</span><span class="stat-value">${s2.max}</span></div>
            <div class="stat-row"><span class="stat-label">Min AQI</span><span class="stat-value">${s2.min}</span></div>
        </div>`;

  const ctx = document.getElementById('compare-chart').getContext('2d');
  if (compareChart) compareChart.destroy();

  compareChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: c1.dates.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [
        {
          label: c1.name,
          data: c1.aqi,
          borderColor: '#6366f1',
          backgroundColor: 'transparent',
          borderWidth: 3,
          tension: 0.4
        },
        {
          label: c2.name,
          data: c2.aqi,
          borderColor: '#ec4899',
          backgroundColor: 'transparent',
          borderWidth: 3,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: { y: { beginAtZero: true } }
    }
  });
}


// ==================== PREDICT MODULE ====================
document.getElementById('predict-btn').addEventListener('click', predictAQI);

async function predictAQI() {
  const inputs = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3'];
  const values = {};

  for (const id of inputs) {
    const val = parseFloat(document.getElementById(`${id}-input`).value);
    if (isNaN(val) || val < 0) {
      showError('predict-error', 'Please enter valid non-negative values for all pollutants');
      return;
    }
    values[id] = val;
  }

  hideError('predict-error');
  showLoading();

  try {
    const query = Object.keys(values).map(k => `${k}=${values[k]}`).join('&');
    const response = await fetch(`${API_BASE_URL}/predict?${query}`);
    if (!response.ok) throw new Error('Prediction failed');

    const data = await response.json();
    const result = getAQICategory(data.predicted_aqi);

    document.getElementById('predicted-aqi-value').textContent = data.predicted_aqi;
    const catEl = document.getElementById('predicted-category');
    catEl.textContent = result.category;
    catEl.className = 'predicted-category ' + result.class;
    document.getElementById('prediction-note').textContent = data.note || '';

    document.getElementById('predict-result').classList.remove('hidden');
  } catch (error) {
    showError('predict-error', error.message);
    document.getElementById('predict-result').classList.add('hidden');
  } finally {
    hideLoading();
  }
}


// ==================== NEW: ALERTS MODULE ====================
// Local storage based alert rules for browser notifications
const LOCAL_ALERTS_KEY = 'aqi_alert_rules';

function getLocalAlerts() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_ALERTS_KEY)) || [];
  } catch {
    return [];
  }
}

function setLocalAlerts(alerts) {
  localStorage.setItem(LOCAL_ALERTS_KEY, JSON.stringify(alerts));
}

// Save alert rule and send to backend
document.getElementById('save-alert-btn')?.addEventListener('click', async () => {
  const city = (document.getElementById('alert-city').value ||
    document.getElementById('live-city-input').value).trim();
  const threshold = parseFloat(document.getElementById('alert-threshold').value);
  const start = document.getElementById('alert-start').value;
  const end = document.getElementById('alert-end').value;
  const channel = document.getElementById('alert-channel').value;
  const contact = document.getElementById('alert-contact').value.trim();
  const msgEl = document.getElementById('alert-message');

  if (!city || isNaN(threshold) || !start || !end) {
    showError('alert-message', 'Fill city, threshold and time window to save alert');
    return;
  }

  hideError('alert-message');

  const rule = { city, threshold, start, end, channel, contact };

  // store locally for browser alerts
  const alerts = getLocalAlerts();
  alerts.push(rule);
  setLocalAlerts(alerts);

  // send to backend (for email/WhatsApp/Telegram)
  try {
    await fetch(`${API_BASE_URL}/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule)
    });
  } catch (e) {
    console.warn('Backend alerts API not reachable, local only');
  }

  msgEl.textContent = 'Alert saved successfully!';
  msgEl.classList.remove('hidden');
});

// Check and fire browser notifications for matching rules
function checkLocalAlerts(city, aqi) {
  if (!city || typeof aqi !== 'number') return;

  const alerts = getLocalAlerts();
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  alerts.forEach(rule => {
    if (rule.city.toLowerCase() !== city.toLowerCase()) return;
    if (aqi < rule.threshold) return;

    const [sh, sm] = rule.start.split(':').map(Number);
    const [eh, em] = rule.end.split(':').map(Number);
    const startM = sh * 60 + sm;
    const endM = eh * 60 + em;

    if (!(currentMinutes >= startM && currentMinutes <= endM)) return;

    if (rule.channel === 'browser' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(`AQI alert for ${city}`, {
          body: `AQI is ${aqi} (threshold ${rule.threshold})`
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(p => {
          if (p === 'granted') {
            new Notification(`AQI alert for ${city}`, {
              body: `AQI is ${aqi} (threshold ${rule.threshold})`
            });
          }
        });
      }
    }
  });
}


// ==================== NEW: DAILY SUMMARY MODULE ====================
document.getElementById('subscribe-digest-btn')?.addEventListener('click', async () => {
  const city = (document.getElementById('digest-city').value ||
    document.getElementById('live-city-input').value).trim();
  const time = document.getElementById('digest-time').value;
  const channel = document.getElementById('digest-channel').value;
  const contact = document.getElementById('digest-contact').value.trim();
  const msgEl = document.getElementById('digest-message');

  if (!city || !time || !contact) {
    showError('digest-message', 'Please fill city, time and contact');
    return;
  }
  hideError('digest-message');

  try {
    const res = await fetch(`${API_BASE_URL}/subscribe_daily_summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city, time, channel, contact })
    });
    if (!res.ok) throw new Error('Subscription failed');
    msgEl.textContent = 'Subscribed to daily summary successfully!';
    msgEl.classList.remove('hidden');
  } catch (e) {
    showError('digest-message', e.message || 'Subscription failed');
  }
});


// ==================== NEW: SHARE LIVE AQI MODULE ====================
document.getElementById('share-live-btn')?.addEventListener('click', () => {
  const form = document.getElementById('share-live-form');
  if (!form) return;
  form.style.display = form.style.display === 'none' || form.style.display === '' ? 'block' : 'none';
});

document.getElementById('share-live-submit')?.addEventListener('click', async () => {
  const channel = document.getElementById('share-live-channel').value;
  const contact = document.getElementById('share-live-contact').value.trim();
  const msgEl = document.getElementById('share-live-message');

  if (!contact) {
    showError('share-live-message', 'Please enter email or phone');
    return;
  }
  hideError('share-live-message');

  const city = document.getElementById('live-city-name').textContent;
  const aqi = parseInt(document.getElementById('live-aqi-value').textContent || '0', 10);
  const category = document.getElementById('live-aqi-category').textContent;
  const time = document.getElementById('live-timestamp').textContent.replace('Updated: ', '');
  const dominant = document.getElementById('live-dominant').textContent;

  const payload = { city, aqi, category, time, dominant_pollutant: dominant };

  try {
    const body = {
      section: "live",
      payload,
      channel,
      email: channel === "email" ? contact : null,
      phone: channel === "whatsapp" ? contact : null
    };
    const res = await fetch(`${API_BASE_URL}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('Failed to send');
    const data = await res.json();
    // You could download the PDF using data.pdf_base64 if you want
    msgEl.textContent = 'Report generated and sent (or ready) successfully.';
    msgEl.classList.remove('hidden');
  } catch (e) {
    showError('share-live-message', e.message || 'Failed to send');
  }
});
