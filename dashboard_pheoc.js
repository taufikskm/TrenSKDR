
// =====================
// PHEOC MONITORING LEVEL DASHBOARD
// =====================
// Register Chart.js datalabels plugin
Chart.register(ChartDataLabels);

// PHEOC Level Colors
const PHEOC_COLORS = {
    green: '#48bb78',
    yellow: '#ecc94b',
    orange: '#ed8936',
    red: '#f56565'
};

// PHEOC Level Thresholds (cases)
// Green: < yellowThreshold
// Yellow: >= yellowThreshold && < orangeThreshold
// Orange: >= orangeThreshold && < redThreshold
// Red: >= redThreshold
const DEFAULT_THRESHOLDS = {
    yellow: 100,
    orange: 500,
    red: 1000
};

const DENGUE_THRESHOLDS = {
    yellow: 50,
    orange: 200,
    red: 500
};

let dataset = {};
let map;
let geoJsonLayer;
let pheocChart;

// =====================
// SIDEBAR TOGGLE
// =====================
document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.getElementById('toggleBtn');
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('main');
    
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('hide');
            main.classList.toggle('full');
        });
    }
    
    // Set current date
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.textContent = now.toLocaleDateString('id-ID', options);
    }
});

// =====================
// LOAD DATA FROM API
// =====================
console.log("Memuat data PHEOC...");

fetch("./api/kasus_provinsi.php?t=" + new Date().getTime())
    .then(function(response) { return response.json(); })
    .then(function(apiResult) {
        if (!apiResult.success) {
            alert("Gagal memuat data: " + apiResult.message);
            return;
        }
        
        const apiData = apiResult.data;
        if (!apiData || apiData.length === 0) {
            alert("Tidak ada data di database.");
            return;
        }
        
        // Group data by penyakit and tahun
        const groupedData = {};
        apiData.forEach(function(row) {
            if (!row.provinsi || !row.penyakit || row.tahun === undefined) return;
            
            const penyakit = row.penyakit;
            const tahun = row.tahun.toString();
            const province = row.provinsi;
            const kasus = parseFloat(row.jumlah_kasus) || 0;
            
            if (!groupedData[penyakit]) groupedData[penyakit] = {};
            if (!groupedData[penyakit][tahun]) groupedData[penyakit][tahun] = {};
            if (!groupedData[penyakit][tahun][province]) groupedData[penyakit][tahun][province] = 0;
            
            groupedData[penyakit][tahun][province] += kasus;
        });
        
        dataset = groupedData;
        
        console.log("Data loaded:", Object.keys(dataset));
        
        loadFilter();
        initMap();
        
        // Initial update
        if (document.getElementById("penyakitSelect").options.length > 0) {
            updateAll();
        }
    })
    .catch(function(error) {
        console.error("Error:", error);
        alert("Gagal terhubung ke database.");
    });

// =====================
// LOAD FILTER DROPDOWNS
// =====================
function loadFilter() {
    const penyakit = Object.keys(dataset);
    const tahunSet = new Set();
    
    Object.keys(dataset).forEach(function(p) {
        Object.keys(dataset[p]).forEach(function(t) { 
            tahunSet.add(t);
        });
    });
    
    const tahun = [...tahunSet].sort().reverse();

    const p = document.getElementById("penyakitSelect");
    const t = document.getElementById("tahunSelect");
    
    if (!p || !t) return;
    
    p.innerHTML = "";
    t.innerHTML = "";

    penyakit.forEach(function(x) { 
        p.innerHTML += "<option value='" + x + "'>" + x + "</option>"; 
    });
    
    tahun.forEach(function(x) { 
        t.innerHTML += "<option value='" + x + "'>" + x + "</option>"; 
    });
    
    // Set default to latest year
    t.value = tahun[0];
}

// =====================
// MAP INITIALIZATION
// =====================
function initMap() {
    console.log("Initializing Leaflet map...");
    
    // Initialize map centered on Indonesia
    map = L.map('indonesiaMap').setView([-2.5, 118], 5);
    
    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Load GeoJSON data
    fetch('./api/indonesia_provinces.geojson')
        .then(function(response) { return response.json(); })
        .then(function(geojson) {
            console.log("GeoJSON loaded:", geojson.features.length, "provinces");
            
            geoJsonLayer = L.geoJSON(geojson, {
                style: function(feature) {
                    return {
                        fillColor: '#cbd5e0',
                        fillOpacity: 0.7,
                        color: '#555',
                        weight: 1
                    };
                },
                onEachFeature: function(feature, layer) {
                    const provinceName = feature.properties.name;
                    layer.bindPopup(
                        '<div style="font-weight:bold; color:#1a365d; font-size:16px;">' + provinceName + '</div>' +
                        '<div style="color:#718096; font-size:12px;">Klik untuk melihat level</div>'
                    );
                    
                    layer.on({
                        mouseover: function(e) {
                            layer.setStyle({
                                weight: 3,
                                color: '#666',
                                fillOpacity: 0.9
                            });
                        },
                        mouseout: function(e) {
                            geoJsonLayer.resetStyle(layer);
                        }
                    });
                }
            }).addTo(map);
            
            console.log("Map initialized successfully");
        })
        .catch(function(error) {
            console.error("Error loading GeoJSON:", error);
        });
}

// =====================
// GET PHEOC LEVEL
// =====================
function getPheocLevel(cases, thresholds) {
    if (cases >= thresholds.red) return 'red';
    if (cases >= thresholds.orange) return 'orange';
    if (cases >= thresholds.yellow) return 'yellow';
    return 'green';
}

function getPheocLevelName(level) {
    const names = {
        green: 'Normal',
        yellow: 'Waspada',
        orange: 'Siaga',
        red: 'Darurat'
    };
    return names[level] || 'Unknown';
}

// =====================
// UPDATE ALL
// =====================
function updateAll() {
    const penyakit = document.getElementById("penyakitSelect").value;
    const tahun = document.getElementById("tahunSelect").value;
    
    if (!penyakit || !tahun) return;
    
    const thresholds = DEFAULT_THRESHOLDS;
    const provinceData = dataset[penyakit] && dataset[penyakit][tahun] ? dataset[penyakit][tahun] : {};
    
    // Calculate PHEOC levels for each province
    const provinceLevels = [];
    Object.keys(provinceData).forEach(function(province) {
        const cases = provinceData[province];
        const level = getPheocLevel(cases, thresholds);
        provinceLevels.push({
            province: province,
            cases: cases,
            level: level
        });
    });
    
    // Sort by cases (highest first)
    provinceLevels.sort(function(a, b) { return b.cases - a.cases; });
    
    // Update map
    updateMap(provinceData, thresholds);
    
    // Update summary cards
    updateSummary(provinceLevels);
    
    // Update province cards
    updateProvinceCards(provinceLevels);
    
    // Update chart
    updateChart(provinceLevels);
}

// =====================
// UPDATE MAP
// =====================
function updateMap(provinceData, thresholds) {
    if (!geoJsonLayer || !map) return;
    
    geoJsonLayer.eachLayer(function(layer) {
        const provinceName = layer.feature.properties.name;
        const cases = provinceData[provinceName] || 0;
        const level = getPheocLevel(cases, thresholds);
        
        const fillColor = PHEOC_COLORS[level];
        
        layer.setStyle({
            fillColor: fillColor,
            weight: 1,
            color: '#555',
            fillOpacity: 0.7
        });
        
        // Update popup
        const levelName = getPheocLevelName(level);
        layer.bindPopup(
            '<div style="font-weight:bold; color:#1a365d; font-size:16px;">' + provinceName + '</div>' +
            '<div style="margin-top:8px; color:#2d3748;">Kasus: <strong>' + cases.toLocaleString() + '</strong></div>' +
            '<div style="margin-top:5px;"><span class="pheoc-level level-' + level + '">' + levelName + '</span></div>'
        );
    });
}

// =====================
// UPDATE SUMMARY CARDS
// =====================
function updateSummary(provinceLevels) {
    const counts = {
        green: 0,
        yellow: 0,
        orange: 0,
        red: 0
    };
    
    provinceLevels.forEach(function(p) {
        counts[p.level]++;
    });
    
    document.getElementById('countGreen').textContent = counts.green;
    document.getElementById('countYellow').textContent = counts.yellow;
    document.getElementById('countOrange').textContent = counts.orange;
    document.getElementById('countRed').textContent = counts.red;
}

// =====================
// UPDATE PROVINCE CARDS
// =====================
function updateProvinceCards(provinceLevels) {
    const grid = document.getElementById('provinceGrid');
    if (!grid) return;
    
    let html = '';
    
    provinceLevels.forEach(function(p, index) {
        const rankClass = index < 3 ? 'top-3' : '';
        const levelName = getPheocLevelName(p.level);
        
        html += '<div class="province-card">' +
            '<div class="province-rank ' + rankClass + '">' + (index + 1) + '</div>' +
            '<div class="province-info">' +
            '<h4>' + p.province + '</h4>' +
            '<p>' + p.cases.toLocaleString() + ' kasus</p>' +
            '</div>' +
            '<span class="pheoc-level level-' + p.level + '">' + levelName + '</span>' +
            '</div>';
    });
    
    grid.innerHTML = html;
}

// =====================
// UPDATE CHART
// =====================
function updateChart(provinceLevels) {
    const counts = {
        green: 0,
        yellow: 0,
        orange: 0,
        red: 0
    };
    
    provinceLevels.forEach(function(p) {
        counts[p.level]++;
    });
    
    if (pheocChart) pheocChart.destroy();
    
    const ctx = document.getElementById('pheocChart');
    if (!ctx) return;
    
    pheocChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Normal (Green)', 'Waspada (Yellow)', 'Siaga (Orange)', 'Darurat (Red)'],
            datasets: [{
                data: [counts.green, counts.yellow, counts.orange, counts.red],
                backgroundColor: [
                    PHEOC_COLORS.green,
                    PHEOC_COLORS.yellow,
                    PHEOC_COLORS.orange,
                    PHEOC_COLORS.red
                ],
                borderColor: '#ffffff',
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        font: { size: 14 }
                    }
                },
                datalabels: {
                    color: '#fff',
                    font: { size: 14, weight: 'bold' },
                    formatter: function(value) {
                        return value > 0 ? value : '';
                    }
                }
            }
        }
    });
}


