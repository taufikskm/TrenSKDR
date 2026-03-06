// =====================
// CONFIGURATION & VARIABLES
// =====================
// Register Chart.js datalabels plugin
Chart.register(ChartDataLabels);

// Color definitions matching PHEOC style
const COLOR_HIGH = '#b71c1c';    // merah - tinggi
const COLOR_MEDIUM = '#fdd835';  // kuning - sedang
const COLOR_LOW = '#2e7d32';     // hijau - rendah
const COLOR_NO_DATA = '#cbd5e0'; // abu - tidak ada data

let dataset = {};
let chart;
let map;
let geoJsonLayer;
let currentPage = 'provinsi';

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
                        fillColor: COLOR_NO_DATA,
                        fillOpacity: 0.7,
                        color: '#555',
                        weight: 1
                    };
                },
                onEachFeature: function(feature, layer) {
                    const provinceName = feature.properties.PROVINSI;
                    layer.bindPopup(
                        '<div class="popup-province">' + provinceName + '</div>' +
                        '<div class="popup-cases">Klik untuk melihat detail</div>'
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
// COLOR FUNCTIONS
// =====================
function getColor(value, q1, q2, q3) {
    if (value === 0 || value === undefined) return COLOR_NO_DATA;
    if (value > q3) return COLOR_HIGH;      // tinggi (above Q3)
    if (value >= q1) return COLOR_MEDIUM;   // sedang (Q1 to Q3)
    return COLOR_LOW;                        // rendah (below Q1)
}

function getColorBreaks(values) {
    if (!values || values.length === 0) return { q1: 0, q2: 0, q3: 0 };
    
    const sorted = [...values].sort(function(a, b) { return a - b; });
    const n = sorted.length;
    
    const q1 = sorted[Math.floor(n * 0.25)];
    const q2 = sorted[Math.floor(n * 0.50)];
    const q3 = sorted[Math.floor(n * 0.75)];
    
    return { q1: q1 || 0, q2: q2 || 0, q3: q3 || 0 };
}

// =====================
// MAP UPDATE FUNCTION
// =====================
// Helper function to normalize province names for matching
function normalizeProvinceName(name) {
    if (!name) return '';
    return name.toString().toUpperCase().trim();
}

function updateMap(provinceData) {
    if (!geoJsonLayer || !map) return;
    
    // Normalize province data keys for matching
    const normalizedProvinceData = {};
    Object.keys(provinceData).forEach(function(key) {
        normalizedProvinceData[normalizeProvinceName(key)] = provinceData[key];
    });
    
    // Get values for quartile calculation
    const values = Object.values(provinceData).filter(function(v) { return v > 0; });
    const { q1, q2, q3 } = getColorBreaks(values);
    
    console.log("Map update - Q1:", q1, "Q2:", q2, "Q3:", q3);
    
    geoJsonLayer.eachLayer(function(layer) {
        const provinceName = layer.feature.properties.PROVINSI;
        const normalizedName = normalizeProvinceName(provinceName);
        const value = normalizedProvinceData[normalizedName] || 0;
        
        const fillColor = getColor(value, q1, q2, q3);
        
        layer.setStyle({
            fillColor: fillColor,
            weight: 1,
            color: '#555',
            fillOpacity: 0.7
        });
        
        // Calculate percentage
        const total = Object.values(provinceData).reduce(function(a, b) { return a + b; }, 0);
        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
        
        // Update popup content
        layer.bindPopup(
            '<div class="popup-province">' + provinceName + '</div>' +
            '<div class="popup-cases">' + value.toLocaleString() + ' kasus (' + percentage + '%)</div>'
        );
        
        // Add tooltip
        layer.bindTooltip(
            '<b>' + provinceName + '</b><br>Kasus: ' + value.toLocaleString(),
            { direction: 'top', sticky: true }
        );
    });
}

// =====================
// LOAD DATA FROM API
// =====================
console.log("Memuat data provinsi...");

// Store raw data with minggu info for filtering
let rawData = [];

// Load province data - use kasus_provinsi table
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
        
        // Store raw data for minggu filtering
        rawData = apiData;
        
        // Group data by penyakit and tahun
        const groupedData = {};
        apiData.forEach(function(row) {
            if (!row.provinsi || !row.penyakit || row.tahun === undefined) return;
            
            const penyakit = row.penyakit;
            const tahun = row.tahun.toString();
            const province = row.provinsi;
            const kasus = parseFloat(row.jumlah_kasus) || 0;
            
            // Normalize province name for consistent matching (uppercase, trimmed)
            const normalizedProvince = province.toString().toUpperCase().trim();
            
            if (!groupedData[penyakit]) groupedData[penyakit] = {};
            if (!groupedData[penyakit][tahun]) groupedData[penyakit][tahun] = {};
            if (!groupedData[penyakit][tahun][normalizedProvince]) groupedData[penyakit][tahun][normalizedProvince] = 0;
            
            groupedData[penyakit][tahun][normalizedProvince] += kasus;
        });
        
        dataset = groupedData;
        
        console.log("Data loaded:", Object.keys(dataset));
        
        loadFilter();
        initMap();
        
        // Note: We don't call updateAll() on initial load anymore
        // because filters default to "Pilih" - user must select values first
    })
    .catch(function(error) {
        console.error("Error:", error);
        alert("Gagal terhubung ke database.");
    });

// =====================
// LOAD FILTER DROPDOWNS
// =====================
function loadFilter() {
    const penyakit = Object.keys(dataset).sort(function(a, b) { return a.localeCompare(b); });
    const tahunSet = new Set();
    
    Object.keys(dataset).forEach(function(p) {
        Object.keys(dataset[p]).forEach(function(t) { 
            tahunSet.add(t);
        });
    });
    
    // Sort years in descending order (latest year first)
    const tahun = [...tahunSet].sort(function(a, b) { return b - a; });

    const p = document.getElementById("penyakitSelect");
    const t = document.getElementById("tahunSelect");
    
    if (!p || !t) return;
    
    // Add "Pilih" as default option first for Penyakit
    p.innerHTML = "<option value=''>Pilih</option>";
    penyakit.forEach(function(x) { 
        p.innerHTML += "<option value='" + x + "'>" + x + "</option>"; 
    });
    // Set default to "Pilih" (empty value)
    p.value = "";
    
    // Add "Pilih" as option first for Tahun, then populate all years
    t.innerHTML = "<option value=''>Pilih</option>";
    tahun.forEach(function(x) { 
        t.innerHTML += "<option value='" + x + "'>" + x + "</option>"; 
    });
    // Set default to latest year (first year in sorted list)
    if (tahun.length > 0) {
        t.value = tahun[0];
    }
    
    // Load minggu options based on selected year
    loadMingguOptions();
}

// =====================
// LOAD MINGGU OPTIONS
// =====================
function loadMingguOptions() {
    const tahun = document.getElementById("tahunSelect").value;
    const penyakit = document.getElementById("penyakitSelect").value;
    const m = document.getElementById("mingguSelect");
    
    if (!m || !tahun || !penyakit) return;
    
    // Get available minggu for selected disease and year from rawData
    const availableMinggu = new Set();
    
    rawData.forEach(function(row) {
        if (row.penyakit === penyakit && row.tahun.toString() === tahun) {
            if (row.minggu) {
                availableMinggu.add(parseInt(row.minggu));
            }
        }
    });
    
    const mingguList = [...availableMinggu].sort(function(a, b) { return a - b; });
    
    // Build options: "Pilih" first (default), then M1 to latest
    m.innerHTML = "<option value=''>Pilih</option>";
    
    mingguList.forEach(function(minggu) {
        m.innerHTML += "<option value='" + minggu + "'>M" + minggu + "</option>";
    });
    
    // Set default to "Pilih" (empty value = total 1 year)
    m.value = "";
}

// =====================
// UPDATE ALL (MAIN FUNCTION)
// =====================
function updateAll() {
    const penyakit = document.getElementById("penyakitSelect").value;
    const tahun = document.getElementById("tahunSelect").value;
    const minggu = document.getElementById("mingguSelect").value;
    
    // If either "Pilih" is selected (empty value), clear the display
    if (!penyakit || !tahun) {
        // Clear map, chart, table, and KPI
        clearDisplay();
        return;
    }
    
    let provinceData = {};
    
    if (minggu === "" || minggu === null) {
        // "Pilih" selected - show total from week 1 to latest (current behavior)
        provinceData = dataset[penyakit] && dataset[penyakit][tahun] ? dataset[penyakit][tahun] : {};
    } else {
        // Specific week selected - filter data for that week only
        const selectedMinggu = parseInt(minggu);
        provinceData = getProvinceDataForWeek(penyakit, tahun, selectedMinggu);
    }
    
    // Update map
    updateMap(provinceData);
    
    // Update chart
    updateChart(provinceData);
    
    // Update table
    updateTable(provinceData);
    
    // Update KPI
    updateKPI(provinceData, tahun);
}

// =====================
// CLEAR DISPLAY
// =====================
function clearDisplay() {
    // Clear map (reset to no data color)
    if (geoJsonLayer) {
        geoJsonLayer.eachLayer(function(layer) {
            layer.setStyle({
                fillColor: COLOR_NO_DATA,
                weight: 1,
                color: '#555',
                fillOpacity: 0.7
            });
            layer.bindPopup(
                '<div class="popup-province">' + layer.feature.properties.PROVINSI + '</div>' +
                '<div class="popup-cases">Pilih filter untuk melihat data</div>'
            );
        });
    }
    
    // Clear chart
    if (chart) {
        chart.destroy();
        chart = null;
    }
    
    // Clear table
    const tbody = document.getElementById("tableBody");
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Pilih penyakit dan tahun untuk melihat data</td></tr>';
    }
    
    // Clear KPI
    const totalProvinsi = document.getElementById("totalProvinsi");
    const selectedYear = document.getElementById("selectedYear");
    const topProvinsi = document.getElementById("topProvinsi");
    const topProvinsiValue = document.getElementById("topProvinsiValue");
    const lowProvinsi = document.getElementById("lowProvinsi");
    const lowProvinsiValue = document.getElementById("lowProvinsiValue");
    
    if (totalProvinsi) totalProvinsi.textContent = "-";
    if (selectedYear) selectedYear.textContent = "-";
    if (topProvinsi) topProvinsi.textContent = "-";
    if (topProvinsiValue) topProvinsiValue.textContent = "-";
    if (lowProvinsi) lowProvinsi.textContent = "-";
    if (lowProvinsiValue) lowProvinsiValue.textContent = "-";
}

// =====================
// GET PROVINCE DATA FOR SPECIFIC WEEK
// =====================
function getProvinceDataForWeek(penyakit, tahun, minggu) {
    const result = {};
    
    rawData.forEach(function(row) {
        if (row.penyakit === penyakit && 
            row.tahun.toString() === tahun && 
            parseInt(row.minggu) === minggu) {
            
            const province = row.provinsi;
            const normalizedProvince = province.toString().toUpperCase().trim();
            const kasus = parseFloat(row.jumlah_kasus) || 0;
            
            result[normalizedProvince] = kasus;
        }
    });
    
    return result;
}

// =====================
// MAIN CHART
// =====================
function updateChart(provinceData) {
    // Sort provinces by value
    const sortedProvinces = Object.keys(provinceData).sort(function(a, b) { 
        return provinceData[b] - provinceData[a]; 
    });
    
    const labels = sortedProvinces;
    const values = sortedProvinces.map(function(p) { return provinceData[p]; });
    
    // Calculate quartiles for colour grading (same as map)
    const valuesForQuartile = Object.values(provinceData).filter(function(v) { return v > 0; });
    const { q1, q2, q3 } = getColorBreaks(valuesForQuartile);
    
    // Color based on quartiles (same as map)
    const colors = sortedProvinces.map(function(p) {
        const value = provinceData[p];
        return getColor(value, q1, q2, q3);
    });
    
    if (chart) chart.destroy();
    
    const ctx = document.getElementById('chart');
    const chartContainer = document.getElementById('chartContainer');
    if (!ctx) return;
    
    // Calculate dynamic height based on number of provinces
    // Each bar is approximately 25-35px tall, plus header/padding
    const numProvinces = sortedProvinces.length;
    const barHeight = 30; // height per bar
    const headerHeight = 80; // chart header and padding
    let dynamicHeight = Math.max(400, (numProvinces * barHeight) + headerHeight);
    
    // Set the chart container height
    if (chartContainer) {
        chartContainer.style.height = dynamicHeight + 'px';
    }
    
    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Jumlah Kasus',
                data: values,
                backgroundColor: colors,
                borderColor: '#ffffff',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                datalabels: {
                    anchor: 'end',
                    align: 'end',
                    color: '#333',
                    font: { size: 10 },
                    formatter: function(value) {
                        return value.toLocaleString();
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: '#e2e8f0' },
                    title: {
                        display: true,
                        text: 'Jumlah Kasus'
                    }
                },
                y: {
                    grid: { display: false },
                    ticks: { font: { size: 11 } }
                }
            }
        }
    });
}

// =====================
// TABLE
// =====================
let currentTableData = [];

function updateTable(provinceData) {
    const tbody = document.getElementById("tableBody");
    if (!tbody) return;
    
    // Sort provinces by value
    const sortedProvinces = Object.keys(provinceData).sort(function(a, b) { 
        return provinceData[b] - provinceData[a]; 
    });
    
    const total = Object.values(provinceData).reduce(function(a, b) { return a + b; }, 0);
    
    currentTableData = sortedProvinces.map(function(p, i) {
        return { 
            rank: i + 1, 
            province: p, 
            value: provinceData[p], 
            percentage: total > 0 ? (provinceData[p] / total * 100).toFixed(1) : 0 
        };
    });
    
    tbody.innerHTML = "";
    
    if (sortedProvinces.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Tidak ada data</td></tr>';
        return;
    }
    
    // Show all rows
    currentTableData.forEach(function(item) {
        let rowColor = '';
        if (item.rank === 1) rowColor = 'color: #c53030; font-weight: 700;';
        else if (item.rank === 2) rowColor = 'color: #dd6b20; font-weight: 600;';
        else if (item.rank === 3) rowColor = 'color: #d69e2e; font-weight: 600;';
        
        tbody.innerHTML += '<tr>' +
            '<td style="' + rowColor + '">' + item.rank + '</td>' +
            '<td>' + item.province + '</td>' +
            '<td>' + item.value.toLocaleString() + '</td>' +
            '<td>' + item.percentage + '%</td>' +
        '</tr>';
    });
}

// =====================
// KPI
// =====================
function updateKPI(provinceData, tahun) {
    const values = Object.values(provinceData);
    const total = values.reduce(function(a, b) { return a + b; }, 0);
    
    // Sort to find highest and lowest
    const sorted = Object.keys(provinceData).sort(function(a, b) {
        return provinceData[b] - provinceData[a];
    });
    
    const highest = sorted.length > 0 ? sorted[0] : '-';
    const lowest = sorted.length > 0 ? sorted[sorted.length - 1] : '-';
    const highestValue = sorted.length > 0 ? provinceData[highest] : 0;
    const lowestValue = sorted.length > 0 ? provinceData[lowest] : 0;
    
    // Update KPI elements
    const totalProvinsi = document.getElementById("totalProvinsi");
    const selectedYear = document.getElementById("selectedYear");
    const topProvinsi = document.getElementById("topProvinsi");
    const topProvinsiValue = document.getElementById("topProvinsiValue");
    const lowProvinsi = document.getElementById("lowProvinsi");
    const lowProvinsiValue = document.getElementById("lowProvinsiValue");
    
    if (totalProvinsi) totalProvinsi.textContent = sorted.length;
    if (selectedYear) selectedYear.textContent = tahun;
    if (topProvinsi) topProvinsi.textContent = highest;
    if (topProvinsiValue) topProvinsiValue.textContent = highestValue.toLocaleString() + ' kasus';
    if (lowProvinsi) lowProvinsi.textContent = lowest;
    if (lowProvinsiValue) lowProvinsiValue.textContent = lowestValue.toLocaleString() + ' kasus';
}

// =====================
// EXPORT CSV
// =====================
function exportToCSV() {
    if (currentTableData.length === 0) {
        alert('Tidak ada data untuk diexport');
        return;
    }
    
    const penyakit = document.getElementById("penyakitSelect").value;
    const tahun = document.getElementById("tahunSelect").value;
    
    let csvContent = "Rank,Provinsi,Total Kasus,Persentase (%)\n";
    
    currentTableData.forEach(function(item) {
        csvContent += item.rank + "," + item.province + "," + item.value + "," + item.percentage + "\n";
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "data_kasus_" + penyakit.replace(/[^a-zA-Z0-9]/g, "_") + "_" + tahun + ".csv";
    link.click();
}

// =====================
// COPY CHART TO CLIPBOARD
// =====================
function copyChartToClipboard() {
    const canvas = document.getElementById('chart');
    if (!canvas) {
        alert('Tidak ada chart untuk disalin');
        return;
    }
    
    canvas.toBlob(function(blob) {
        const item = new ClipboardItem({ "image/png": blob });
        navigator.clipboard.write([item]).then(function() {
            alert('Chart berhasil disalin ke clipboard!');
        }).catch(function(err) {
            console.error('Gagal menyalin chart:', err);
            alert('Gagal menyalin chart ke clipboard');
        });
    });
}

