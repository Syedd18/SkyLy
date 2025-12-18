const API_BASE = "http://127.0.0.1:8055";

async function getLiveAQI() {
    const city = document.getElementById("citySelect").value;
    const box = document.getElementById("resultBox");

    if (!city) {
        alert("Please select a city");
        return;
    }

    box.textContent = "Loading live AQI...";

    try {
        const res = await fetch(${API_BASE}/live/aqi?city=${encodeURIComponent(city)});
        const data = await res.json();

        if (data.detail) {
            box.textContent = data.detail;
            return;
        }

        box.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
        box.textContent = "Failed to fetch live AQI";
    }
}