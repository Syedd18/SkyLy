console.log("cities.js loaded");

document.addEventListener("DOMContentLoaded", () => {
    fetch("http://127.0.0.1:8055/cities")
        .then(res => res.json())
        .then(data => {
            console.log("Cities received:", data);

            const selects = document.querySelectorAll(".city-select");
            selects.forEach(select => {
                select.innerHTML = "<option value=''>Select City</option>";
                data.cities.forEach(city => {
                    const opt = document.createElement("option");
                    opt.value = city;
                    opt.textContent = city;
                    select.appendChild(opt);
                });
            });
        })
        .catch(err => {
            console.error("City load failed:", err);
        });
});