const API_BASE = "http://127.0.0.1:8055";

async function predictAQI() {
    const city = document.getElementById("citySelect").value;
    const days = document.getElementById("days").value;
    const box = document.getElementById("predictionResult");

    if (!city || !days) {
        alert("Select city and days");
        return;
    }

    box.textContent = "Predicting...";

    try {
        const res = await fetch(${API_BASE}/predict?city=${encodeURIComponent(city)}&days=${days});
        const data = await res.json();

        box.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
        box.textContent = "Prediction failed";
    }
}