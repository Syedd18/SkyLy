// ==================== CONFIGURATION ====================
// API_BASE_URL is defined in script.js

// Load cities for compare dropdowns (called from script.js)
async function loadCompareCities() {
    try {
        const response = await fetch(API_BASE_URL + '/cities');
        const cities = await response.json();
        
        // Populate compare-city1 through compare-city5
        for (let i = 1; i <= 5; i++) {
            const select = document.getElementById(`compare-city${i}`);
            if (!select) continue;
            
            // Clear existing options except first
            while (select.options.length > 1) {
                select.remove(1);
            }
            
            cities.forEach(city => {
                const option = document.createElement('option');
                option.value = city;
                option.textContent = city;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading compare cities:', error);
    }
}

// ==================== DASHBOARD FUNCTIONS ====================
async function loadDashboard() {
    if (!currentUser || !authToken) {
        document.getElementById('favorites-list').innerHTML = '<p class="empty-state">Login to save your favorite cities</p>';
        return;
    }
    
    try {
        const favorites = await getFavorites();
        const favoritesList = document.getElementById('favorites-list');
        
        if (favorites.length === 0) {
            favoritesList.innerHTML = '<p class="empty-state">No favorite cities yet. Add some from the Live AQI section!</p>';
        } else {
            favoritesList.innerHTML = favorites.map(fav => {
                const aqiCat = getAQICategory(fav.aqi);
                return `
                <div class="favorite-item">
                    <div class="favorite-info">
                        <i class="fas fa-city"></i>
                        <div>
                            <h4>${fav.city}</h4>
                            <span class="aqi-badge ${aqiCat.class}" style="background: ${aqiCat.bgColor}; color: ${aqiCat.color}; border: 1px solid ${aqiCat.borderColor};">${fav.aqi || 'N/A'}</span>
                        </div>
                    </div>
                    <button class="btn-icon-small" onclick="removeFavoriteAndReload('${fav.city}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                `;
            }).join('');
            
            // Update stats
            document.getElementById('stat-cities').textContent = favorites.length;
            document.getElementById('stat-good').textContent = favorites.filter(f => f.aqi && f.aqi <= 50).length;
            document.getElementById('stat-bad').textContent = favorites.filter(f => f.aqi && f.aqi > 150).length;
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

async function removeFavoriteAndReload(cityName) {
    const success = await removeFavorite(cityName);
    if (success) {
        loadDashboard();
    }
}

// ==================== HISTORICAL ANALYSIS ====================
let historicalCity = null;
let yearlyChart = null;

async function fetchHistoricalData() {
    const citySelect = document.getElementById('historical-city-select');
    const city = citySelect.value;
    
    if (!city) {
        showError('historical-error', 'Please select a city');
        return;
    }
    
    historicalCity = city;
    hideError('historical-error');
    
    try {
        // Fetch yearly comparison
        const yearlyResponse = await fetch(`${API_BASE_URL}/api/historical/yearly-comparison/${encodeURIComponent(city)}`);
        if (yearlyResponse.ok) {
            const yearlyData = await yearlyResponse.json();
            renderYearlyChart(yearlyData);
        }
        
        // Fetch seasonal trends
        const seasonalResponse = await fetch(`${API_BASE_URL}/api/historical/seasonal-trends/${encodeURIComponent(city)}`);
        if (seasonalResponse.ok) {
            const seasonalData = await seasonalResponse.json();
            renderSeasonalData(seasonalData);
        }
        
        // Fetch best/worst times
        const timesResponse = await fetch(`${API_BASE_URL}/api/historical/best-worst-times/${encodeURIComponent(city)}`);
        if (timesResponse.ok) {
            const timesData = await timesResponse.json();
            renderBestWorstTimes(timesData);
        }
        
        document.getElementById('historical-result').classList.remove('hidden');
    } catch (error) {
        showError('historical-error', 'Failed to fetch historical data');
    }
}

function renderYearlyChart(data) {
    const ctx = document.getElementById('yearly-chart');
    if (!ctx) return;
    
    const years = Object.keys(data.yearly_averages);
    const aqiValues = Object.values(data.yearly_averages);
    
    if (yearlyChart) {
        yearlyChart.destroy();
    }
    
    yearlyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [{
                label: 'Average AQI',
                data: aqiValues,
                borderColor: '#06b6d4',
                backgroundColor: 'rgba(6, 182, 212, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {color: '#f0f9ff'}
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {color: 'rgba(255,255,255,0.1)'},
                    ticks: {color: '#94a3b8'}
                },
                x: {
                    grid: {color: 'rgba(255,255,255,0.1)'},
                    ticks: {color: '#94a3b8'}
                }
            }
        }
    });
}

function renderSeasonalData(data) {
    const seasons = data.seasonal_trends;
    
    if (seasons.Winter) {
        document.getElementById('winter-data').querySelector('.insight-value').textContent = Math.round(seasons.Winter.mean);
    }
    if (seasons.Spring) {
        document.getElementById('spring-data').querySelector('.insight-value').textContent = Math.round(seasons.Spring.mean);
    }
    if (seasons.Summer) {
        document.getElementById('summer-data').querySelector('.insight-value').textContent = Math.round(seasons.Summer.mean);
    }
    if (seasons.Autumn) {
        document.getElementById('autumn-data').querySelector('.insight-value').textContent = Math.round(seasons.Autumn.mean);
    }
}

function renderBestWorstTimes(data) {
    const bestMonthsList = document.getElementById('best-months-list');
    const worstMonthsList = document.getElementById('worst-months-list');
    
    bestMonthsList.innerHTML = data.best_months.map((month, idx) => `
        <div class="month-item">
            <span class="rank">#${idx + 1}</span>
            <span class="month-name">${month.month_name}</span>
            <span class="aqi-value aqi-good">${Math.round(month.aqi)}</span>
        </div>
    `).join('');
    
    worstMonthsList.innerHTML = data.worst_months.reverse().map((month, idx) => `
        <div class="month-item">
            <span class="rank">#${idx + 1}</span>
            <span class="month-name">${month.month_name}</span>
            <span class="aqi-value aqi-unhealthy">${Math.round(month.aqi)}</span>
        </div>
    `).join('');
}

// ==================== LOCATION-BASED SERVICES ====================
let userLocation = null;

async function detectLocation() {
    const statusEl = document.getElementById('location-status');
    
    if (!navigator.geolocation) {
        statusEl.textContent = 'Geolocation not supported by your browser';
        return;
    }
    
    statusEl.textContent = 'Detecting location...';
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            statusEl.textContent = `Location detected: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`;
            showNotification('Location detected successfully!', 'success');
        },
        (error) => {
            statusEl.textContent = 'Failed to detect location. Please enable location services.';
            showNotification('Location detection failed', 'error');
        }
    );
}

async function findNearbyStations() {
    if (!userLocation) {
        showNotification('Please detect your location first', 'warning');
        return;
    }
    
    const radius = document.getElementById('radius-input').value;
    hideError('location-error');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/location/nearby-stations?lat=${userLocation.lat}&lng=${userLocation.lng}&radius_km=${radius}`);
        
        if (!response.ok) throw new Error('Failed to fetch nearby stations');
        
        const data = await response.json();
        displayLocationResults(data.nearby_stations, 'Nearby Stations');
    } catch (error) {
        showError('location-error', 'Failed to fetch nearby stations');
    }
}

async function findSafeZones() {
    const threshold = document.getElementById('threshold-input').value;
    hideError('location-error');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/location/safe-zones?threshold=${threshold}`);
        
        if (!response.ok) throw new Error('Failed to fetch safe zones');
        
        const data = await response.json();
        displayLocationResults(data.safe_zones, 'Safe Zones (AQI < ' + threshold + ')');
    } catch (error) {
        showError('location-error', 'Failed to fetch safe zones');
    }
}

function displayLocationResults(results, title) {
    const resultContainer = document.getElementById('location-result');
    const resultTitle = document.getElementById('location-result-title');
    const resultList = document.getElementById('location-result-list');
    
    resultTitle.innerHTML = `<i class="fas fa-list"></i> ${title}`;
    
    if (results.length === 0) {
        resultList.innerHTML = '<p class="empty-state">No results found</p>';
    } else {
        resultList.innerHTML = results.map((item, idx) => {
            const aqiCategory = getAQICategory(item.aqi);
            const displayName = item.station_name || item.city;
            
            return `
            <div class="ranking-item">
                <div class="rank-badge">${idx + 1}</div>
                <div class="city-info">
                    <h4>${displayName}</h4>
                    ${item.distance_km ? `<p><i class="fas fa-location-arrow"></i> ${item.distance_km} km away</p>` : ''}
                    ${item.lat && item.lng ? `<p style="font-size: 0.8rem; opacity: 0.7;"><i class="fas fa-map-marker-alt"></i> ${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}</p>` : ''}
                </div>
                <div class="aqi-info">
                    <div class="aqi-badge-large" style="background: ${aqiCategory.bgColor}; color: ${aqiCategory.color}; border: 2px solid ${aqiCategory.borderColor}; font-weight: bold;">${item.aqi || 'N/A'}</div>
                    <div style="font-size: 0.85rem; color: ${aqiCategory.color}; margin-top: 0.3rem; font-weight: 600;">${aqiCategory.category}</div>
                </div>
            </div>
            `;
        }).join('');
    }
    
    resultContainer.classList.remove('hidden');
}

// ==================== MULTI-CITY COMPARISON ====================
async function compareMultiCities() {
    const cities = [];
    for (let i = 1; i <= 5; i++) {
        const select = document.getElementById(`compare-city${i}`);
        if (select && select.value) {
            cities.push(select.value);
        }
    }
    
    if (cities.length < 2) {
        showError('compare-error', 'Please select at least 2 cities');
        return;
    }
    
    hideError('compare-error');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/compare/multi-city`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(cities)
        });
        
        if (!response.ok) throw new Error('Comparison failed');
        
        const data = await response.json();
        renderMultiCityComparison(data.comparison);
    } catch (error) {
        showError('compare-error', 'Failed to compare cities');
    }
}

function renderMultiCityComparison(comparison) {
    const grid = document.getElementById('comparison-grid');
    
    grid.innerHTML = comparison.map(city => {
        const aqiCat = getAQICategory(city.aqi);
        return `
        <div class="comparison-card-multi">
            <h3>${city.city}</h3>
            <div class="aqi-badge-xlarge ${aqiCat.class}" style="background: ${aqiCat.bgColor}; color: ${aqiCat.color}; border: 2px solid ${aqiCat.borderColor}; font-weight: bold;">
                ${city.aqi || 'N/A'}
            </div>
            <p class="category-text" style="color: ${aqiCat.color}; font-weight: 600;">${city.category || aqiCat.category}</p>
            ${city.pm25 ? `<p><strong>PM2.5:</strong> ${city.pm25}</p>` : ''}
            ${city.pm10 ? `<p><strong>PM10:</strong> ${city.pm10}</p>` : ''}
        </div>
        `;
    }).join('');
    
    document.getElementById('multi-compare-result').classList.remove('hidden');
}

async function fetchMigrationAdvisor() {
    const citySelect = document.getElementById('migration-city-select');
    const city = citySelect.value;
    
    if (!city) {
        showError('compare-error', 'Please select your current city');
        return;
    }
    
    hideError('compare-error');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/compare/migration-advisor?current_city=${encodeURIComponent(city)}`);
        
        if (!response.ok) throw new Error('Failed to fetch recommendations');
        
        const data = await response.json();
        renderMigrationRecommendations(data);
    } catch (error) {
        showError('compare-error', 'Failed to fetch migration recommendations');
    }
}

function renderMigrationRecommendations(data) {
    const list = document.getElementById('migration-list');
    
    list.innerHTML = data.recommendations.map((rec, idx) => {
        const aqiCat = getAQICategory(rec.aqi);
        return `
        <div class="ranking-item">
            <div class="rank-badge">${idx + 1}</div>
            <div class="city-info">
                <h4>${rec.city}</h4>
                <p><i class="fas fa-arrow-up"></i> ${rec.improvement_percent}% improvement (${rec.improvement} points better)</p>
            </div>
            <div class="aqi-badge-large ${aqiCat.class}" style="background: ${aqiCat.bgColor}; color: ${aqiCat.color}; border: 2px solid ${aqiCat.borderColor}; font-weight: bold;">${rec.aqi}</div>
        </div>
        `;
    }).join('');
    
    document.getElementById('migration-result').classList.remove('hidden');
}

// ==================== CHATBOT ====================
async function sendChatMessage(message) {
    const messagesContainer = document.getElementById('chatbot-messages');
    console.log('Sending chatbot message:', message);
    console.log('API_BASE_URL:', typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'UNDEFINED');
    
    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'chatbot-message user';
    userMsg.innerHTML = `<div class="message-content">${message}</div>`;
    messagesContainer.appendChild(userMsg);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    try {
        const url = `${API_BASE_URL}/api/chatbot/query`;
        console.log('Fetching:', url);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ query: message })
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error('Chatbot request failed');
        }
        
        const data = await response.json();
        console.log('Chatbot response data:', data);
        
        // Add bot response
        const botMsg = document.createElement('div');
        botMsg.className = 'chatbot-message bot';
        botMsg.innerHTML = `
            <i class="fas fa-robot"></i>
            <div class="message-content">${data.response}</div>
        `;
        messagesContainer.appendChild(botMsg);
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (error) {
        console.error('Chatbot error:', error);
        const botMsg = document.createElement('div');
        botMsg.className = 'chatbot-message bot error';
        botMsg.innerHTML = `
            <i class="fas fa-robot"></i>
            <div class="message-content">Sorry, I encountered an error: ${error.message}</div>
        `;
        messagesContainer.appendChild(botMsg);
    }
}

// ==================== HELPER FUNCTIONS ====================
function getAQICategory(aqi) {
    if (!aqi || aqi === 'N/A') return {
        category: 'Unknown',
        class: 'aqi-unknown',
        color: '#6b7280',
        bgColor: 'rgba(107, 114, 128, 0.15)',
        borderColor: 'rgba(107, 114, 128, 0.4)'
    };
    
    if (aqi <= 50) return {
        category: 'Good',
        class: 'aqi-good',
        color: '#10b981',
        bgColor: 'rgba(16, 185, 129, 0.15)',
        borderColor: 'rgba(16, 185, 129, 0.4)'
    };
    
    if (aqi <= 100) return {
        category: 'Moderate',
        class: 'aqi-moderate',
        color: '#f59e0b',
        bgColor: 'rgba(245, 158, 11, 0.15)',
        borderColor: 'rgba(245, 158, 11, 0.4)'
    };
    
    if (aqi <= 150) return {
        category: 'Unhealthy for Sensitive',
        class: 'aqi-unhealthy-sensitive',
        color: '#f97316',
        bgColor: 'rgba(249, 115, 22, 0.15)',
        borderColor: 'rgba(249, 115, 22, 0.4)'
    };
    
    if (aqi <= 200) return {
        category: 'Unhealthy',
        class: 'aqi-unhealthy',
        color: '#ef4444',
        bgColor: 'rgba(239, 68, 68, 0.15)',
        borderColor: 'rgba(239, 68, 68, 0.4)'
    };
    
    if (aqi <= 300) return {
        category: 'Very Unhealthy',
        class: 'aqi-very-unhealthy',
        color: '#a855f7',
        bgColor: 'rgba(168, 85, 247, 0.15)',
        borderColor: 'rgba(168, 85, 247, 0.4)'
    };
    
    return {
        category: 'Hazardous',
        class: 'aqi-hazardous',
        color: '#dc2626',
        bgColor: 'rgba(220, 38, 38, 0.15)',
        borderColor: 'rgba(220, 38, 38, 0.5)'
    };
}

function showError(elementId, message) {
    const errorEl = document.getElementById(elementId);
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    }
}

function hideError(elementId) {
    const errorEl = document.getElementById(elementId);
    if (errorEl) {
        errorEl.classList.add('hidden');
    }
}

// ==================== EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize city selects for historical and comparison
    populateCitySelects();
    
    // Historical analysis
    const fetchHistoricalBtn = document.getElementById('fetch-historical-btn');
    if (fetchHistoricalBtn) {
        fetchHistoricalBtn.addEventListener('click', fetchHistoricalData);
    }
    
    // Historical tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const tabName = btn.dataset.tab;
            document.querySelector(`.tab-content[data-tab="${tabName}"]`).classList.add('active');
        });
    });
    
    // Location services
    const detectLocationBtn = document.getElementById('detect-location-btn');
    if (detectLocationBtn) {
        detectLocationBtn.addEventListener('click', detectLocation);
    }
    
    const findNearbyBtn = document.getElementById('find-nearby-btn');
    if (findNearbyBtn) {
        findNearbyBtn.addEventListener('click', findNearbyStations);
    }
    
    const findSafeZonesBtn = document.getElementById('find-safe-zones-btn');
    if (findSafeZonesBtn) {
        findSafeZonesBtn.addEventListener('click', findSafeZones);
    }
    
    // Multi-city comparison
    const fetchMultiCompareBtn = document.getElementById('fetch-multi-compare-btn');
    if (fetchMultiCompareBtn) {
        fetchMultiCompareBtn.addEventListener('click', compareMultiCities);
    }
    
    // Migration advisor
    const fetchMigrationBtn = document.getElementById('fetch-migration-btn');
    if (fetchMigrationBtn) {
        fetchMigrationBtn.addEventListener('click', fetchMigrationAdvisor);
    }
    
    // Chatbot
    const chatbotToggle = document.getElementById('chatbot-toggle');
    const chatbotWidget = document.getElementById('chatbot-widget');
    const chatbotClose = document.getElementById('chatbot-close');
    const chatbotForm = document.getElementById('chatbot-form');
    const chatbotInput = document.getElementById('chatbot-input');
    
    if (chatbotToggle) {
        chatbotToggle.addEventListener('click', () => {
            chatbotWidget.classList.toggle('hidden');
        });
    }
    
    if (chatbotClose) {
        chatbotClose.addEventListener('click', () => {
            chatbotWidget.classList.add('hidden');
        });
    }
    
    if (chatbotForm) {
        chatbotForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const message = chatbotInput.value.trim();
            if (message) {
                sendChatMessage(message);
                chatbotInput.value = '';
            }
        });
    }
});

// Populate city selects
function populateCitySelects() {
    const selects = [
        'historical-city-select',
        'migration-city-select',
        'compare-city1',
        'compare-city2',
        'compare-city3',
        'compare-city4',
        'compare-city5'
    ];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select && INDIAN_CITIES) {
            INDIAN_CITIES.forEach(city => {
                const option = document.createElement('option');
                option.value = city.name;
                option.textContent = city.name;
                select.appendChild(option);
            });
        }
    });
}
