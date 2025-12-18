const API_BASE = "http://127.0.0.1:8055";

async function loadAnalytics() {
    const city = document.getElementById("citySelect").value;
    const container = document.getElementById("chartContainer");

    if (!city) {
        alert("Please select a city");
        return;
    }

    container.textContent = "Loading analytics...";

    try {
        const res = await fetch(${API_BASE}/analytics?city=${encodeURIComponent(city)});
        const data = await res.json();

        container.innerHTML = `
            <p><b>City:</b> ${data.city}</p>
            <p><b>Min AQI:</b> ${data.min_aqi}</p>
            <p><b>Max AQI:</b> ${data.max_aqi}</p>
            <p><b>Average AQI:</b> ${data.avg_aqi}</p>
            <p><b>Total Records:</b> ${data.records}</p>
        `;
    } catch (err) {
        container.textContent = "Analytics failed";
    }
}