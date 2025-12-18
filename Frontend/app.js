const API = "http://127.0.0.1:8055";

let analyticsChart = null;
let compareChart = null;

/* ---------- LOAD CITIES ---------- */
async function loadCities() {
  try {
    const res = await fetch(${API}/cities);
    const cities = await res.json();

    ["liveCity", "city1", "city2"].forEach(id => {
      const select = document.getElementById(id);
      select.innerHTML = "";
      cities.forEach(city => {
        const opt = document.createElement("option");
        opt.value = city;
        opt.textContent = city;
        select.appendChild(opt);
      });
    });

  } catch (err) {
    console.error("Failed to load cities", err);
  }
}

/* ---------- LIVE AQI ---------- */
async function getLiveAQI() {
  const city = document.getElementById("liveCity").value;
  const res = await fetch(${API}/live_aqi?city=${city});
  const data = await res.json();

  document.getElementById("liveOutput").innerHTML = `
    AQI: <b>${data.aqi}</b><br>
    Dominant Pollutant: ${data.dominant_pollutant}<br>
    Time: ${data.time}
  `;
}

/* ---------- PREDICTION ---------- */
async function predictAQI() {
  const pm25 = Number(document.getElementById("pm25").value);
  const pm10 = Number(document.getElementById("pm10").value);

  const res = await fetch(${API}/predict, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pm25, pm10 })
  });

  const data = await res.json();
  document.getElementById("predictOutput").innerHTML =
    Predicted AQI: <b>${data.predicted_aqi}</b>;
}

/* ---------- ANALYTICS ---------- */
async function loadAnalytics() {
  const res = await fetch(${API}/analytics);
  const data = await res.json();

  if (analyticsChart) analyticsChart.destroy();

  analyticsChart = new Chart(
    document.getElementById("analyticsChart"),
    {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [{
          label: "AQI Trend",
          data: data.values
        }]
      }
    }
  );
}

/* ---------- COMPARISON ---------- */
async function compareCities() {
  const c1 = document.getElementById("city1").value;
  const c2 = document.getElementById("city2").value;

  const res = await fetch(${API}/compare?city1=${c1}&city2=${c2});
  const data = await res.json();

  if (compareChart) compareChart.destroy();

  compareChart = new Chart(
    document.getElementById("compareChart"),
    {
      type: "bar",
      data: {
        labels: [c1, c2],
        datasets: [{
          label: "AQI",
          data: [data[c1], data[c2]]
        }]
      }
    }
  );
}

/* ---------- EVENTS ---------- */
document.getElementById("liveBtn").onclick = getLiveAQI;
document.getElementById("predictBtn").onclick = predictAQI;
document.getElementById("analyticsBtn").onclick = loadAnalytics;
document.getElementById("compareBtn").onclick = compareCities;

loadCities();