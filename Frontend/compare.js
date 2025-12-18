const API_BASE = "http://127.0.0.1:8055";

async function compareAQI() {
    const c1 = document.getElementById("citySelect1").value;
    const c2 = document.getElementById("citySelect2").value;
    const box = document.getElementById("compareResult");

    if (!c1 || !c2) {
        alert("Select both cities");
        return;
    }

    box.textContent = "Comparing...";

    try {
        const res = await fetch(${API_BASE}/compare?city1=${encodeURIComponent(c1)}&city2=${encodeURIComponent(c2)});
        const data = await res.json();

        box.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
        box.textContent = "Comparison failed";
    }
}