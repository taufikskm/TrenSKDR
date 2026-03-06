let dataset = [];
let chart;
let continuousChart;
let penyakitMainChart;
let penyakitChart12;
let penyakitChart4;

/* ================= SIDEBAR ================= */
const toggleBtn = document.getElementById("toggleBtn");
const sidebar = document.getElementById("sidebar");
const main = document.getElementById("main");

toggleBtn.onclick = function() {
    sidebar.classList.toggle("hide");
    main.classList.toggle("full");
};

/* ================= CLEAN FUNCTION ================= */
function cleanObject(obj) {
    let newObj = {};
    Object.keys(obj).forEach(function(k) {
        let cleanKey = k.replace(/\uFEFF/g, "").trim();
        let value = obj[k];
        if (typeof value === "string") {
            value = value.replace(/\uFEFF/g, "").trim();
        }
        newObj[cleanKey] = value;
    });
    return newObj;
}

/* ================= LOAD DATA FROM DATABASE API ================= */
console.log("Memuat data dari database...");

fetch("api/kasus_mingguan.php")
    .then(function(response) {
        console.log("Response status:", response.status);
        return response.json();
    })
    .then(function(apiResult) {
        console.log("API Result:", apiResult);
        
        if (!apiResult.success) {
            console.error("API Error:", apiResult.message);
            alert("Gagal memuat data dari database: " + apiResult.message);
            return;
        }
        
        const apiData = apiResult.data;
        console.log("API Data count:", apiData ? apiData.length : 0);
        
        if (!apiData || apiData.length === 0) {
            console.error("No data returned from API");
            alert("Tidak ada data di database. Silakan tambah data terlebih dahulu.");
            return;
        }
        
        // Transform API data to match existing dashboard structure
        const groupedData = {};
        
        apiData.forEach(function(row) {
            if (!row.nama_penyakit || row.tahun === undefined || row.minggu === undefined) {
                console.warn("Skipping invalid row:", row);
                return;
            }
            
            const key = row.nama_penyakit + "_" + row.tahun;
            if (!groupedData[key]) {
                groupedData[key] = {
                    PENYAKIT: row.nama_penyakit,
                    TAHUN: row.tahun.toString()
                };
            }
            groupedData[key]["M-" + row.minggu] = parseFloat(row.jumlah_kasus) || 0;
        });
        
        dataset = Object.values(groupedData);
        
        console.log("DATA FINAL (dari database):", dataset);
        console.log("Total records:", dataset.length);

        if (dataset.length === 0) {
            alert("Data tidak valid setelah transformasi.");
            return;
        }

        loadFilter();
        updateSummaryCards();
        updateChart();
        
        console.log("Dashboard berhasil dimuat!");
    })
    .catch(function(error) {
        console.error("Error fetching data:", error);
        alert("Gagal terhubung ke database. Pastikan server XAMPP berjalan dan database tersedia.\nError: " + error.message);
    });

/* ================= FILTER ================= */
function loadFilter() {
    const penyakit = [...new Set(dataset.map(function(d) { return d.PENYAKIT; }))];
    const tahun = [...new Set(dataset.map(function(d) { return d.TAHUN; }))];

    const p = document.getElementById("penyakitSelect");
    const t1 = document.getElementById("tahun1");
    const t2 = document.getElementById("tahun2");

    p.innerHTML = "";
    t1.innerHTML = "";
    t2.innerHTML = "";

    penyakit.forEach(function(x) {
        p.innerHTML += "<option>" + x + "</option>";
    });

    tahun.forEach(function(x) {
        t1.innerHTML += "<option>" + x + "</option>";
        t2.innerHTML += "<option>" + x + "</option>";
    });

    t1.value = "2026";
    t2.value = "2026";
}

/* ================= SUMMARY CARDS ================= */
function updateSummaryCards() {
    const totalPenyakit = [...new Set(dataset.map(function(d) { return d.PENYAKIT; }))].length;
    document.getElementById("totalPenyakit").textContent = totalPenyakit;

    const diseaseTotals = {};
    dataset.forEach(function(row) {
        const key = row.PENYAKIT;
        if (key && (key.toLowerCase().includes('total') || key.toLowerCase().includes('kunjungan'))) {
            return;
        }
        if (!diseaseTotals[key]) diseaseTotals[key] = 0;

        Object.keys(row).forEach(function(k) {
            if (k.startsWith("M-")) {
                const val = parseFloat(row[k]) || 0;
                diseaseTotals[key] += val;
            }
        });
    });

    let topDisease = "";
    let topValue = 0;
    Object.keys(diseaseTotals).forEach(function(d) {
        if (diseaseTotals[d] > topValue) {
            topValue = diseaseTotals[d];
            topDisease = d;
        }
    });

    document.getElementById("topDisease").textContent = topDisease;
    document.getElementById("topDiseaseValue").textContent = "Total: " + topValue.toLocaleString() + " kasus";

    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById("currentDate").textContent = now.toLocaleDateString('id-ID', options);

    document.querySelector('.card-green .card-value').textContent = "2024 - 2026";
}

/* ================= MAIN CHART ================= */
function updateChart() {
    const penyakit = document.getElementById("penyakitSelect").value;
    const tahun1 = document.getElementById("tahun1").value;
    const tahun2 = document.getElementById("tahun2").value;

    // Always use 53 weeks as x-axis for main chart
    const minggu = [];
    for (let i = 1; i <= 53; i++) {
        minggu.push("M-" + i);
    }

    const row1 = dataset.find(function(d) {
        return d.PENYAKIT === penyakit && d.TAHUN === tahun1;
    });

    const row2 = dataset.find(function(d) {
        return d.PENYAKIT === penyakit && d.TAHUN === tahun2;
    });

    console.log(row1, row2);

    const data1 = minggu.map(function(m) {
        let v = row1 ? row1[m] : undefined;
        return (v === undefined || v === "") ? null : Number(v);
    });

    const data2 = minggu.map(function(m) {
        let v = row2 ? row2[m] : undefined;
        return (v === undefined || v === "") ? null : Number(v);
    });

    if (chart) chart.destroy();

    const datasets = [];
    datasets.push({
        label: penyakit + " " + tahun1,
        data: data1,
        borderColor: '#3182ce',
        backgroundColor: 'rgba(49, 130, 206, 0.1)',
        borderWidth: 3,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 7
    });
    
    if (tahun1 !== tahun2) {
        datasets.push({
            label: penyakit + " " + tahun2,
            data: data2,
            borderColor: '#dd6b20',
            backgroundColor: 'rgba(221, 107, 32, 0.1)',
            borderWidth: 3,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 7
        });
    }

    chart = new Chart(document.getElementById("chart"), {
        type: "line",
        data: {
            labels: minggu,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'nearest', intersect: true, axis: 'xy' },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: { size: 13 }
                    }
                },
                tooltip: {
                    enabled: true,
                    mode: 'nearest',
                    intersect: true,
                    axis: 'xy',
                    animation: false,
                    backgroundColor: 'rgba(45, 55, 72, 0.9)',
                    titleFont: { size: 14 },
                    bodyFont: { size: 13 },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        title: function(context) {
                            return 'Minggu ' + context[0].label;
                        },
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toLocaleString() + ' kasus';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        autoSkip: false,
                        maxRotation: 90,
                        minRotation: 90,
                        font: { size: 11 }
                    }
                },
                y: {
                    beginAtZero: false,
                    grid: { color: '#e2e8f0' },
                    ticks: {
                        font: { size: 11 },
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    }
                }
            },
            elements: {
                point: {
                    radius: 4,
                    hoverRadius: 7,
                    hitRadius: 5
                }
            }
        }
    });

    const mainChartTitle = document.getElementById("mainChartTitle");
    let yearText = tahun1;
    if (tahun1 !== tahun2) {
        yearText = tahun1 + " & " + tahun2;
    }
    mainChartTitle.textContent = "📈 Tren " + penyakit + " Tahun " + yearText;

    updateContinuousChart(penyakit, tahun1, tahun2, minggu);
    updateSecondaryCharts(data1, data2, minggu, tahun1, tahun2, penyakit);
    updateDataTable(data1, data2, minggu, tahun1, tahun2);
    updateAlertStatus(tahun1, tahun2, penyakit);
}

/* ================= CONTINUOUS CHART ================= */
function updateContinuousChart(penyakit, tahun1, tahun2, minggu) {
    let year1 = parseInt(tahun1);
    let year2 = parseInt(tahun2);

    let startYear = tahun1;
    let endYear = tahun2;
    if (year1 > year2) {
        startYear = tahun2;
        endYear = tahun1;
    }

    const continuousChartTitle = document.getElementById("continuousChartTitle");
    if (startYear === endYear) {
        continuousChartTitle.textContent = "📊 Tren " + penyakit + " Tahun " + startYear;
    } else {
        continuousChartTitle.textContent = "📊 Tren " + penyakit + " (" + startYear + " - " + endYear + ")";
    }

    let continuousData = [];
    let continuousLabels = [];

    if (startYear === endYear) {
        const row = dataset.find(function(d) { return d.PENYAKIT === penyakit && d.TAHUN === startYear; });
        if (row) {
            minggu.forEach(function(m) {
                const val = row[m];
                if (val !== undefined && val !== "") {
                    continuousData.push(Number(val));
                    continuousLabels.push(m + " " + startYear);
                }
            });
        }
    } else {
        const row1 = dataset.find(function(d) { return d.PENYAKIT === penyakit && d.TAHUN === startYear; });
        if (row1) {
            minggu.forEach(function(m) {
                const val = row1[m];
                if (val !== undefined && val !== "") {
                    continuousData.push(Number(val));
                    continuousLabels.push(m + " " + startYear);
                }
            });
        }

        const row2 = dataset.find(function(d) { return d.PENYAKIT === penyakit && d.TAHUN === endYear; });
        if (row2) {
            let lastValidIndex = -1;
            for (let i = minggu.length - 1; i >= 0; i--) {
                const val = row2[minggu[i]];
                if (val !== undefined && val !== "") {
                    lastValidIndex = i;
                    break;
                }
            }

            for (let i = 0; i <= lastValidIndex; i++) {
                const val = row2[minggu[i]];
                if (val !== undefined && val !== "") {
                    continuousData.push(Number(val));
                    continuousLabels.push(minggu[i] + " " + endYear);
                }
            }
        }
    }

    if (continuousChart) continuousChart.destroy();

    continuousChart = new Chart(document.getElementById("continuousChart"), {
        type: "line",
        data: {
            labels: continuousLabels,
            datasets: [{
                label: penyakit + " (" + startYear + " - " + endYear + ")",
                data: continuousData,
                borderColor: '#38a169',
                backgroundColor: 'rgba(56, 161, 105, 0.1)',
                borderWidth: 3,
                tension: 0.3,
                pointRadius: 3,
                pointHoverRadius: 6,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'nearest', intersect: true, axis: 'xy' },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: { size: 13 }
                    }
                },
                tooltip: {
                    enabled: true,
                    mode: 'nearest',
                    intersect: true,
                    animation: false,
                    backgroundColor: 'rgba(45, 55, 72, 0.9)',
                    titleFont: { size: 14 },
                    bodyFont: { size: 13 },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        title: function(context) {
                            return context[0].label;
                        },
                        label: function(context) {
                            return context.parsed.y.toLocaleString() + ' kasus';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        autoSkip: true,
                        maxRotation: 90,
                        minRotation: 90,
                        font: { size: 10 },
                        maxTicksLimit: 52
                    }
                },
                y: {
                    beginAtZero: false,
                    grid: { color: '#e2e8f0' },
                    ticks: {
                        font: { size: 11 },
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    }
                }
            },
            elements: {
                point: {
                    radius: 3,
                    hoverRadius: 6
                }
            }
        }
    });
}

/* ================= STATUS ALERT ================= */
function updateAlertStatus(tahun1, tahun2, penyakit) {
    let totalLast4Weeks = 0;
    let totalPrev4Weeks = 0;

    const selectedData = dataset.filter(function(row) {
        return row.PENYAKIT === penyakit && (row.TAHUN === tahun1 || row.TAHUN === tahun2);
    });

    selectedData.forEach(function(row) {
        const mingguKeys = Object.keys(row).filter(function(k) { return k.startsWith("M-"); }).sort();
        const last4 = mingguKeys.slice(-4);
        const prev4 = mingguKeys.slice(-8, -4);

        let rowLast4 = 0;
        let rowPrev4 = 0;

        last4.forEach(function(m) {
            rowLast4 += parseFloat(row[m]) || 0;
        });
        prev4.forEach(function(m) {
            rowPrev4 += parseFloat(row[m]) || 0;
        });

        totalLast4Weeks += rowLast4;
        totalPrev4Weeks += rowPrev4;
    });

    let alertStatus = "Aman";
    let alertLevel = "Level: Low";
    let alertClass = "card-green";

    if (totalPrev4Weeks > 0) {
        const increase = ((totalLast4Weeks - totalPrev4Weeks) / totalPrev4Weeks) * 100;
        if (increase > 50) {
            alertStatus = "Bahaya";
            alertLevel = "Level: High";
            alertClass = "card-red";
        } else if (increase > 20) {
            alertStatus = "Waspada";
            alertLevel = "Level: Moderate";
            alertClass = "card-orange";
        } else if (increase < -20) {
            alertStatus = "Membaik";
            alertLevel = "Level: Good";
            alertClass = "card-blue";
        }
    }

    const alertCard = document.getElementById('alertCard');
    alertCard.className = "card " + alertClass;
    document.getElementById('alertStatus').textContent = alertStatus;
    document.getElementById('alertLevel').textContent = alertLevel + " | " + penyakit;
}

/* ================= SECONDARY CHARTS ================= */
function updateSecondaryCharts(data1, data2, minggu, tahun1, tahun2, penyakit) {
    let titleText;
    if (tahun1 === tahun2) {
        titleText = "TREN " + penyakit.toUpperCase() + " TAHUN " + tahun1;
    } else {
        titleText = "TREN " + penyakit.toUpperCase() + " TAHUN " + tahun1 + " & " + tahun2;
    }
    document.getElementById("secondaryTitle").textContent = titleText;

    const legend2024 = document.getElementById("legend2024");
    const legend2025 = document.getElementById("legend2025");
    const legend2026 = document.getElementById("legend2026");

    legend2024.style.display = "none";
    legend2025.style.display = "none";
    legend2026.style.display = "none";

    if (tahun1 === tahun2) {
        if (tahun1 === "2024") {
            legend2024.style.display = "inline";
        } else if (tahun1 === "2025") {
            legend2025.style.display = "inline";
        } else {
            legend2026.style.display = "inline";
        }
    } else {
        if (tahun1 === "2024" || tahun2 === "2024") {
            legend2024.style.display = "inline";
        }
        if (tahun1 === "2025" || tahun2 === "2025") {
            legend2025.style.display = "inline";
        }
        if (tahun1 === "2026" || tahun2 === "2026") {
            legend2026.style.display = "inline";
        }
    }

    const year1 = parseInt(tahun1);
    const year2 = parseInt(tahun2);
    const newerYear = year2 >= year1 ? tahun2 : tahun1;
    const olderYear = year2 >= year1 ? tahun1 : tahun2;
    const newerData = year2 >= year1 ? data2 : data1;
    const olderData = year2 >= year1 ? data1 : data2;

    let lastValidIndexNewer = -1;
    let lastValidIndexOlder = -1;

    for (let i = newerData.length - 1; i >= 0; i--) {
        if (newerData[i] !== null && newerData[i] !== undefined) {
            lastValidIndexNewer = i;
            break;
        }
    }

    for (let i = olderData.length - 1; i >= 0; i--) {
        if (olderData[i] !== null && olderData[i] !== undefined) {
            lastValidIndexOlder = i;
            break;
        }
    }

    const last12 = [];
    const last12Labels = [];
    let weeksNeeded = 12;
    let currentIndex = lastValidIndexNewer;

    while (weeksNeeded > 0 && currentIndex >= 0) {
        if (newerData[currentIndex] !== null && newerData[currentIndex] !== undefined) {
            last12.unshift(newerData[currentIndex]);
            last12Labels.unshift(minggu[currentIndex]);
            weeksNeeded--;
        }
        currentIndex--;
    }

    if (weeksNeeded > 0) {
        currentIndex = lastValidIndexOlder;
        while (weeksNeeded > 0 && currentIndex >= 0) {
            if (olderData[currentIndex] !== null && olderData[currentIndex] !== undefined) {
                last12.unshift(olderData[currentIndex]);
                last12Labels.unshift(minggu[currentIndex]);
                weeksNeeded--;
            }
            currentIndex--;
        }
    }

    const last4 = [];
    const last4Labels = [];
    weeksNeeded = 4;
    currentIndex = lastValidIndexNewer;

    while (weeksNeeded > 0 && currentIndex >= 0) {
        if (newerData[currentIndex] !== null && newerData[currentIndex] !== undefined) {
            last4.unshift(newerData[currentIndex]);
            last4Labels.unshift(minggu[currentIndex]);
            weeksNeeded--;
        }
        currentIndex--;
    }

    if (weeksNeeded > 0) {
        currentIndex = lastValidIndexOlder;
        while (weeksNeeded > 0 && currentIndex >= 0) {
            if (olderData[currentIndex] !== null && olderData[currentIndex] !== undefined) {
                last4.unshift(olderData[currentIndex]);
                last4Labels.unshift(minggu[currentIndex]);
                weeksNeeded--;
            }
            currentIndex--;
        }
    }

    const secondaryDatasets = [];
    secondaryDatasets.push({
        label: tahun1,
        data: data1,
        borderColor: "#b6c300",
        backgroundColor: "rgba(182, 195, 0, 0.1)",
        borderWidth: 3,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 6
    });
    if (tahun1 !== tahun2) {
        secondaryDatasets.push({
            label: tahun2,
            data: data2,
            borderColor: "#0b7d77",
            backgroundColor: "rgba(11, 125, 119, 0.1)",
            borderWidth: 3,
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 6,
            spanGaps: false
        });
    }

    // Create chartCopy - copy of main chart
    if (penyakitMainChart) penyakitMainChart.destroy();

    const chartCopyDatasets = [];
    chartCopyDatasets.push({
        label: penyakit + " " + tahun1,
        data: data1,
        borderColor: '#3182ce',
        backgroundColor: 'rgba(49, 130, 206, 0.1)',
        borderWidth: 3,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 7
    });
    
    if (tahun1 !== tahun2) {
        chartCopyDatasets.push({
            label: penyakit + " " + tahun2,
            data: data2,
            borderColor: '#dd6b20',
            backgroundColor: 'rgba(221, 107, 32, 0.1)',
            borderWidth: 3,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 7
        });
    }

    penyakitMainChart = new Chart(document.getElementById("chartCopy"), {
        type: "line",
        data: {
            labels: minggu,
            datasets: chartCopyDatasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'nearest', intersect: true, axis: 'xy' },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: { size: 13 }
                    }
                },
                tooltip: {
                    enabled: true,
                    mode: 'nearest',
                    intersect: true,
                    axis: 'xy',
                    animation: false,
                    backgroundColor: 'rgba(45, 55, 72, 0.9)',
                    titleFont: { size: 14 },
                    bodyFont: { size: 13 },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        title: function(context) {
                            return 'Minggu ' + context[0].label;
                        },
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toLocaleString() + ' kasus';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        autoSkip: false,
                        maxRotation: 90,
                        minRotation: 90,
                        font: { size: 11 }
                    }
                },
                y: {
                    beginAtZero: false,
                    grid: { color: '#e2e8f0' },
                    ticks: {
                        font: { size: 11 },
                        callback: function(value) {
                            return Math.round(value).toLocaleString();
                        }
                    }
                }
            },
            elements: {
                point: {
                    radius: 4,
                    hoverRadius: 7,
                    hitRadius: 5
                }
            }
        }
    });

    if (penyakitChart12) penyakitChart12.destroy();

    penyakitChart12 = new Chart(document.getElementById("penyakitChart12"), {
        type: "line",
        data: {
            labels: last12Labels,
            datasets: [{
                data: last12,
                borderColor: "#58b7c0",
                backgroundColor: "rgba(88, 183, 192, 0.1)",
                borderWidth: 3,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: "#58b7c0",
                pointHoverRadius: 7,
                pointHitRadius: 8,
                fill: true,
                spanGaps: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'nearest', intersect: true, axis: 'xy' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    mode: 'nearest',
                    intersect: true,
                    axis: 'xy',
                    animation: false,
                    backgroundColor: 'rgba(45, 55, 72, 0.9)',
                    titleFont: { size: 12 },
                    bodyFont: { size: 11 },
                    padding: 8,
                    cornerRadius: 6,
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y.toLocaleString() + ' kasus';
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: { display: false },
                    ticks: { font: { size: 9 } },
                    beginAtZero: false
                },
                y: { display: false }
            },
            elements: {
                point: {
                    radius: 4,
                    hoverRadius: 7,
                    hitRadius: 8
                }
            }
        }
    });

    if (penyakitChart4) penyakitChart4.destroy();

    penyakitChart4 = new Chart(document.getElementById("penyakitChart4"), {
        type: "line",
        data: {
            labels: last4Labels,
            datasets: [{
                data: last4,
                borderColor: "#59c17a",
                backgroundColor: "rgba(89, 193, 122, 0.1)",
                borderWidth: 3,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: "#59c17a",
                pointHoverRadius: 8,
                pointHitRadius: 10,
                fill: true,
                spanGaps: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'nearest', intersect: true, axis: 'xy' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    mode: 'nearest',
                    intersect: true,
                    axis: 'xy',
                    animation: false,
                    backgroundColor: 'rgba(45, 55, 72, 0.9)',
                    titleFont: { size: 12 },
                    bodyFont: { size: 11 },
                    padding: 8,
                    cornerRadius: 6,
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y.toLocaleString() + ' kasus';
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: { display: false },
                    ticks: { font: { size: 10 } },
                    beginAtZero: false
                },
                y: { display: false }
            },
            elements: {
                point: {
                    radius: 5,
                    hoverRadius: 8,
                    hitRadius: 10
                }
            }
        }
    });
}

/* ================= DATA TABLE ================= */
function updateDataTable(data1, data2, minggu, tahun1, tahun2) {
    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = "";

    const tableHeaders = document.querySelectorAll("#dataTable th");
    if (tableHeaders.length >= 3) {
        tableHeaders[1].textContent = tahun1;
        tableHeaders[2].textContent = tahun2;
    }

    const year1 = parseInt(tahun1);
    const year2 = parseInt(tahun2);
    const newerYear = year2 >= year1 ? tahun2 : tahun1;
    const newerData = year2 >= year1 ? data2 : data1;
    const olderData = year2 >= year1 ? data1 : data2;

    let lastValidIndex = -1;

    for (let i = newerData.length - 1; i >= 0; i--) {
        if (newerData[i] !== null && newerData[i] !== undefined) {
            lastValidIndex = i;
            break;
        }
    }

    if (lastValidIndex === -1) {
        for (let i = olderData.length - 1; i >= 0; i--) {
            if (olderData[i] !== null && olderData[i] !== undefined) {
                lastValidIndex = i;
                break;
            }
        }
    }

    if (lastValidIndex === -1) {
        lastValidIndex = minggu.length - 1;
    }

    const startIndex = Math.max(0, lastValidIndex - 7);
    const displayWeeks = minggu.slice(startIndex, lastValidIndex + 1);
    const reversedWeeks = [...displayWeeks].reverse();

    reversedWeeks.forEach(function(week) {
        const actualIndex = minggu.indexOf(week);
        const val1 = data1[actualIndex];
        const val2 = data2[actualIndex];

        if ((val1 === null || val1 === undefined) && (val2 === null || val2 === undefined)) {
            return;
        }

        const numVal1 = val1 !== null && val1 !== undefined ? val1 : 0;
        const numVal2 = val2 !== null && val2 !== undefined ? val2 : 0;
        const selisih = numVal2 - numVal1;

        let trend = "";
        let trendClass = "";
        if (selisih > 0) {
            trend = "↑ " + Math.abs(selisih).toLocaleString();
            trendClass = "trend-up";
        } else if (selisih < 0) {
            trend = "↓ " + Math.abs(selisih).toLocaleString();
            trendClass = "trend-down";
        } else {
            trend = "→ Sama";
            trendClass = "trend-same";
        }

        const row = "<tr>" +
            "<td><strong>" + week + "</strong></td>" +
            "<td>" + (val1 !== null && val1 !== undefined ? val1.toLocaleString() : '-') + "</td>" +
            "<td>" + (val2 !== null && val2 !== undefined ? val2.toLocaleString() : '-') + "</td>" +
            "<td>" + (selisih !== 0 ? selisih.toLocaleString() : '-') + "</td>" +
            "<td class=\"" + trendClass + "\">" + trend + "</td>" +
            "</tr>";
        tbody.innerHTML += row;
    });
}
