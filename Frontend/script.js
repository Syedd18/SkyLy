// ==================== CONFIGURATION ====================
const API_BASE_URL = 'http://localhost:8055'; // Change this to your backend URL

// ==================== UTILITY FUNCTIONS ====================

// Show/Hide Loading Overlay
function showLoading() {
    document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
}

// Show/Hide Error Messages
function showError(elementId, message) {
    const errorEl = document.getElementById(elementId);
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
}

function hideError(elementId) {
    document.getElementById(elementId).classList.add('hidden');
}

// Get AQI Category and Color
function getAQICategory(aqi) {
    if (aqi <= 50) return { category: 'Good', class: 'aqi-good' };
    if (aqi <= 100) return { category: 'Moderate', class: 'aqi-moderate' };
    if (aqi <= 150) return { category: 'Unhealthy for Sensitive Groups', class: 'aqi-unhealthy-sensitive' };
    if (aqi <= 200) return { category: 'Unhealthy', class: 'aqi-unhealthy' };
    if (aqi <= 300) return { category: 'Very Unhealthy', class: 'aqi-very-unhealthy' };
    return { category: 'Hazardous', class: 'aqi-hazardous' };
}

// ==================== NAVIGATION ====================
document.addEventListener('DOMContentLoaded', function () {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');

    navLinks.forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetSection = this.getAttribute('data-section');

            navLinks.forEach(function (l) {
                l.classList.remove('active');
            });
            this.classList.add('active');

            sections.forEach(function (s) {
                s.classList.remove('active');
            });
            document.getElementById(targetSection).classList.add('active');

            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    loadCities();
});

// ==================== LOAD CITIES ====================
async function loadCities() {
    try {
        const response = await fetch(API_BASE_URL + '/cities');
        const cities = await response.json();

        const selects = [
            'analytics-city-select',
            'compare-city1-select',
            'compare-city2-select'
        ];

        selects.forEach(function (selectId) {
            const select = document.getElementById(selectId);
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
    if (e.key === 'Enter') {
        fetchLiveAQI();
    }
});

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

        if (!response.ok) {
            throw new Error('City not found or API error');
        }

        const data = await response.json();
        displayLiveAQI(data);
        document.getElementById('live-result').classList.remove('hidden');
    } catch (error) {
        showError('live-error', 'Error: ' + error.message + '. Please check the city name and try again.');
        document.getElementById('live-result').classList.add('hidden');
    } finally {
        hideLoading();
    }
}

function displayLiveAQI(data) {
    document.getElementById('live-city-name').textContent = data.city || 'Unknown';
    document.getElementById('live-timestamp').textContent = 'Updated: ' + (data.time || 'N/A');

    const aqi = data.aqi || 0;
    const result = getAQICategory(aqi);
    const category = result.category;
    const categoryClass = result.class;

    document.getElementById('live-aqi-value').textContent = aqi;

    const categoryEl = document.getElementById('live-aqi-category');
    categoryEl.textContent = category;
    categoryEl.className = 'aqi-category ' + categoryClass;

    document.getElementById('live-dominant').textContent = data.dominant_pollutant || 'N/A';

    const pollutantsGrid = document.getElementById('pollutants-grid');
    pollutantsGrid.innerHTML = '';

    const components = data.components || {};
    const pollutantNames = {
        pm25: 'PM2.5',
        pm10: 'PM10',
        no2: 'NO₂',
        so2: 'SO₂',
        co: 'CO',
        o3: 'O₃',
        t: 'Temperature',
        h: 'Humidity',
        p: 'Pressure',
        w: 'Wind'
    };

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

        if (!response.ok) {
            throw new Error('No data available for this city');
        }

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

    if (aqiValues.length === 0) {
        showError('analytics-error', 'No data available');
        return;
    }

    const maxAQI = Math.max.apply(null, aqiValues);
    const maxIndex = aqiValues.indexOf(maxAQI);
    const maxDate = dates[maxIndex] ? new Date(dates[maxIndex]).toLocaleDateString() : 'N/A';
    const avgAQI = (aqiValues.reduce(function (a, b) { return a + b; }, 0) / aqiValues.length).toFixed(1);
    const minAQI = Math.min.apply(null, aqiValues);

    const insightsGrid = document.getElementById('analytics-insights');
    insightsGrid.innerHTML =
        '<div class="insight-item">' +
            '<div class="insight-label">Maximum AQI</div>' +
            '<div class="insight-value">' + maxAQI + '</div>' +
        '</div>' +
        '<div class="insight-item">' +
            '<div class="insight-label">Peak Date</div>' +
            '<div class="insight-value" style="font-size: 1.2rem;">' + maxDate + '</div>' +
        '</div>' +
        '<div class="insight-item">' +
            '<div class="insight-label">Average AQI</div>' +
            '<div class="insight-value">' + avgAQI + '</div>' +
        '</div>' +
        '<div class="insight-item">' +
            '<div class="insight-label">Minimum AQI</div>' +
            '<div class="insight-value">' + minAQI + '</div>' +
        '</div>';

    const ctx = document.getElementById('analytics-chart').getContext('2d');

    if (analyticsChart) {
        analyticsChart.destroy();
    }

    analyticsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates.map(function (d) {
                return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }),
            datasets: [
                {
                    label: city + ' AQI',
                    data: aqiValues,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 2,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'AQI Value' }
                },
                x: {
                    title: { display: true, text: 'Date' },
                    ticks: { maxTicksLimit: 12 }
                }
            }
        }
    });
}

// ==================== COMPARE MODULE ====================
document.getElementById('fetch-compare-btn').addEventListener('click', fetchCompare);

let compareChart = null;

async function fetchCompare() {
    const city1Select = document.getElementById('compare-city1-select');
    const city2Select = document.getElementById('compare-city2-select');
    const city1 = city1Select.value;
    const city2 = city2Select.value;

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
        const url = API_BASE_URL +
            '/compare?city1=' + encodeURIComponent(city1) +
            '&city2=' + encodeURIComponent(city2);

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Comparison data not available');
        }

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
    const city1Data = data.city1;
    const city2Data = data.city2;

    const city1Avg = (city1Data.aqi.reduce(function (a, b) { return a + b; }, 0) / city1Data.aqi.length).toFixed(1);
    const city2Avg = (city2Data.aqi.reduce(function (a, b) { return a + b; }, 0) / city2Data.aqi.length).toFixed(1);
    const city1Max = Math.max.apply(null, city1Data.aqi);
    const city2Max = Math.max.apply(null, city2Data.aqi);
    const city1Min = Math.min.apply(null, city1Data.aqi);
    const city2Min = Math.min.apply(null, city2Data.aqi);

    const statsContainer = document.getElementById('comparison-stats');
    statsContainer.innerHTML =
        '<div class="comparison-card">' +
            '<h4>' + city1Data.name + '</h4>' +
            '<div class="stat-row">' +
                '<span class="stat-label">Average AQI</span>' +
                '<span class="stat-value">' + city1Avg + '</span>' +
            '</div>' +
            '<div class="stat-row">' +
                '<span class="stat-label">Maximum AQI</span>' +
                '<span class="stat-value">' + city1Max + '</span>' +
            '</div>' +
            '<div class="stat-row">' +
                '<span class="stat-label">Minimum AQI</span>' +
                '<span class="stat-value">' + city1Min + '</span>' +
            '</div>' +
        '</div>' +
        '<div class="comparison-card">' +
            '<h4>' + city2Data.name + '</h4>' +
            '<div class="stat-row">' +
                '<span class="stat-label">Average AQI</span>' +
                '<span class="stat-value">' + city2Avg + '</span>' +
            '</div>' +
            '<div class="stat-row">' +
                '<span class="stat-label">Maximum AQI</span>' +
                '<span class="stat-value">' + city2Max + '</span>' +
            '</div>' +
            '<div class="stat-row">' +
                '<span class="stat-label">Minimum AQI</span>' +
                '<span class="stat-value">' + city2Min + '</span>' +
            '</div>' +
        '</div>';

    const ctx = document.getElementById('compare-chart').getContext('2d');

    if (compareChart) {
        compareChart.destroy();
    }

    compareChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: city1Data.dates.map(function (d) {
                return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }),
            datasets: [
                {
                    label: city1Data.name,
                    data: city1Data.aqi,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 2,
                    pointHoverRadius: 6
                },
                {
                    label: city2Data.name,
                    data: city2Data.aqi,
                    borderColor: '#764ba2',
                    backgroundColor: 'rgba(118, 75, 162, 0.1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 2,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'AQI Value' }
                },
                x: {
                    title: { display: true, text: 'Date' },
                    ticks: { maxTicksLimit: 12 }
                }
            }
        }
    });
}

// ==================== PREDICT MODULE ====================
document.getElementById('predict-btn').addEventListener('click', predictAQI);

async function predictAQI() {
    const pm25 = parseFloat(document.getElementById('pm25-input').value);
    const pm10 = parseFloat(document.getElementById('pm10-input').value);
    const no2 = parseFloat(document.getElementById('no2-input').value);
    const so2 = parseFloat(document.getElementById('so2-input').value);
    const co = parseFloat(document.getElementById('co-input').value);
    const o3 = parseFloat(document.getElementById('o3-input').value);

    if (isNaN(pm25) || isNaN(pm10) || isNaN(no2) || isNaN(so2) || isNaN(co) || isNaN(o3)) {
        showError('predict-error', 'Please fill in all pollutant values');
        return;
    }

    if (pm25 < 0 || pm10 < 0 || no2 < 0 || so2 < 0 || co < 0 || o3 < 0) {
        showError('predict-error', 'Pollutant values must be non-negative');
        return;
    }

    hideError('predict-error');
    showLoading();

    try {
        const url = API_BASE_URL +
            '/predict?pm25=' + pm25 +
            '&pm10=' + pm10 +
            '&no2=' + no2 +
            '&so2=' + so2 +
            '&co=' + co +
            '&o3=' + o3;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Prediction failed');
        }

        const data = await response.json();
        displayPrediction(data);
        document.getElementById('predict-result').classList.remove('hidden');
    } catch (error) {
        showError('predict-error', 'Error: ' + error.message);
        document.getElementById('predict-result').classList.add('hidden');
    } finally {
        hideLoading();
    }
}

function displayPrediction(data) {
    const predictedAQI = data.predicted_aqi;
    const result = getAQICategory(predictedAQI);
    const category = result.category;
    const categoryClass = result.class;

    document.getElementById('predicted-aqi-value').textContent = predictedAQI;

    const categoryEl = document.getElementById('predicted-category');
    categoryEl.textContent = category;
    categoryEl.className = 'predicted-category ' + categoryClass;

    const noteEl = document.getElementById('prediction-note');
    if (data.note) {
        noteEl.textContent = data.note;
    } else {
        noteEl.textContent = 'Prediction based on XGBoost Machine Learning model trained on historical AQI data.';
    }
}