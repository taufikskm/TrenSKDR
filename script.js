let dataset=[];
let chart;
let continuousChart;
let penyakitMainChart;
let penyakitChart12;
let penyakitChart4;


/* ================= SIDEBAR ================= */

const toggleBtn=document.getElementById("toggleBtn");
const sidebar=document.getElementById("sidebar");
const main=document.getElementById("main");

toggleBtn.onclick=()=>{
sidebar.classList.toggle("hide");
main.classList.toggle("full");
};



/* ================= CLEAN FUNCTION ================= */

function cleanObject(obj){

let newObj={};

Object.keys(obj).forEach(k=>{

let cleanKey =
k.replace(/\uFEFF/g,"").trim();

let value=obj[k];

if(typeof value==="string"){
value=value.replace(/\uFEFF/g,"").trim();
}

newObj[cleanKey]=value;

});

return newObj;
}


/* ================= LOAD CSV ================= */

Promise.all([
fetch("DATANASIONAL2024.csv").then(r=>r.text()),
fetch("DATANASIONAL2025.csv").then(r=>r.text()),
fetch("DATANASIONAL2026.csv").then(r=>r.text())
])
.then(([csv2024,csv2025,csv2026])=>{

let data2024 = Papa.parse(csv2024,{
header:true,
delimiter:";",
skipEmptyLines:true
}).data.map(d=>{
let row=cleanObject(d);
row.TAHUN="2024";
return row;
});

let data2025 = Papa.parse(csv2025,{
header:true,
delimiter:";",
skipEmptyLines:true
}).data.map(d=>{
let row=cleanObject(d);
row.TAHUN="2025";
return row;
});

let data2026 = Papa.parse(csv2026,{
header:true,
delimiter:";",
skipEmptyLines:true
}).data.map(d=>{
let row=cleanObject(d);
row.TAHUN="2026";
return row;
});

dataset=[...data2024,...data2025,...data2026];


console.log("DATA FINAL:",dataset);

loadFilter();
updateSummaryCards();
// Initialize charts with first disease
updateChart();

});



/* ================= FILTER ================= */

function loadFilter(){

const penyakit=[
...new Set(dataset.map(d=>d.PENYAKIT))
];

const tahun=[
...new Set(dataset.map(d=>d.TAHUN))
];

const p=document.getElementById("penyakitSelect");
const t1=document.getElementById("tahun1");
const t2=document.getElementById("tahun2");

p.innerHTML="";
t1.innerHTML="";
t2.innerHTML="";

penyakit.forEach(x=>{
p.innerHTML+=`<option>${x}</option>`;
});

tahun.forEach(x=>{
t1.innerHTML+=`<option>${x}</option>`;
t2.innerHTML+=`<option>${x}</option>`;
});

}



/* ================= SUMMARY CARDS ================= */

function updateSummaryCards(){
// Total penyakit
const totalPenyakit = [...new Set(dataset.map(d=>d.PENYAKIT))].length;
document.getElementById("totalPenyakit").textContent = totalPenyakit;

// Find top disease by total cases (exclude Total Kunjungan)
const diseaseTotals = {};
dataset.forEach(row => {
const key = row.PENYAKIT;
// Skip Total Kunjungan and similar aggregate entries
if(key && (key.toLowerCase().includes('total') || key.toLowerCase().includes('kunjungan'))){
return;
}
if(!diseaseTotals[key]) diseaseTotals[key] = 0;

// Sum all M- values
Object.keys(row).forEach(k => {
if(k.startsWith("M-")){
const val = parseFloat(row[k]) || 0;
diseaseTotals[key] += val;
}
});
});


let topDisease = "";
let topValue = 0;
Object.keys(diseaseTotals).forEach(d => {
if(diseaseTotals[d] > topValue){
topValue = diseaseTotals[d];
topDisease = d;
}
});

document.getElementById("topDisease").textContent = topDisease;
document.getElementById("topDiseaseValue").textContent = "Total: " + topValue.toLocaleString() + " kasus";

// Status Alert will be updated in updateChart() based on selected years



// Set current date
const now = new Date();
const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
document.getElementById("currentDate").textContent = now.toLocaleDateString('id-ID', options);

// Update period card
document.querySelector('.card-green .card-value').textContent = "2024 - 2026";
}




/* ================= MAIN CHART ================= */

function updateChart(){

const penyakit=
document.getElementById("penyakitSelect").value;

const tahun1=
document.getElementById("tahun1").value;

const tahun2=
document.getElementById("tahun2").value;


/* minggu otomatis */
const minggu=Object.keys(dataset[0])
.filter(k=>k.startsWith("M-"))
.sort((a,b)=>{
const numA = parseInt(a.replace("M-",""));
const numB = parseInt(b.replace("M-",""));
return numA - numB;
});

const row1=dataset.find(d=>
d.PENYAKIT===penyakit &&
d.TAHUN===tahun1
);

const row2=dataset.find(d=>
d.PENYAKIT===penyakit &&
d.TAHUN===tahun2
);

console.log(row1,row2);

const data1 = minggu.map(m=>{
let v=row1?.[m];
return (v===undefined || v==="") ? null : Number(v);
});

const data2 = minggu.map(m=>{
let v=row2?.[m];
return (v===undefined || v==="") ? null : Number(v);
});

if(chart) chart.destroy();

// Build datasets array - only show one dataset if years are the same
const datasets = [];
datasets.push({
label:`${penyakit} ${tahun1}`,
data:data1,
borderColor:'#3182ce',
backgroundColor:'rgba(49,130,206,0.1)',
borderWidth:3,
tension:0.3,
pointRadius:4,
pointHoverRadius:7
});
// Only add second dataset if years are different
if(tahun1 !== tahun2){
datasets.push({
label:`${penyakit} ${tahun2}`,
data:data2,
borderColor:'#dd6b20',
backgroundColor:'rgba(221,107,32,0.1)',
borderWidth:3,
tension:0.3,
pointRadius:4,
pointHoverRadius:7
});
}

chart=new Chart(document.getElementById("chart"),{

type:"line",

data:{
labels:minggu,
datasets:datasets
},


options:{
responsive:true,
maintainAspectRatio:false,
interaction:{mode:'nearest', intersect:true, axis:'xy'},
plugins:{
legend:{
position:'top',
labels:{
usePointStyle:true,
padding:20,
font:{size:13}
}
},
tooltip:{
enabled:true,
mode:'nearest',
intersect:true,
axis:'xy',
animation:false,
backgroundColor:'rgba(45,55,72,0.9)',
titleFont:{size:14},
bodyFont:{size:13},
padding:12,
cornerRadius:8,
callbacks:{
title:function(context){
return 'Minggu ' + context[0].label;
},
label:function(context){
return context.dataset.label + ': ' + context.parsed.y.toLocaleString() + ' kasus';
}
}
}

},

scales:{
x:{
grid:{display:false},
ticks:{
autoSkip:false,
maxRotation:90,
minRotation:90,
font:{size:11}
}
},
y:{
beginAtZero:true,
grid:{color:'#e2e8f0'},
ticks:{
font:{size:11},
callback:function(value){
return value.toLocaleString();
}
}
}
},
elements:{
point:{
radius:4,
hoverRadius:7,
hitRadius:5
}
}
}

});

// Update main chart title dynamically
const mainChartTitle = document.getElementById("mainChartTitle");
let yearText = tahun1;
if(tahun1 !== tahun2){
yearText = tahun1 + " & " + tahun2;
}
mainChartTitle.textContent = `📈 Grafik ${penyakit} Tahun ${yearText}`;

// Update continuous chart
updateContinuousChart(penyakit, tahun1, tahun2, minggu);

// Update secondary charts with same data
updateSecondaryCharts(data1, data2, minggu, tahun1, tahun2, penyakit);

// Update data table
updateDataTable(data1, data2, minggu, tahun1, tahun2);

// Update Status Alert based on selected years and disease
updateAlertStatus(tahun1, tahun2, penyakit);

}


/* ================= CONTINUOUS CHART ================= */

function updateContinuousChart(penyakit, tahun1, tahun2, minggu){
// Build continuous data from tahun1 to tahun2
const year1 = parseInt(tahun1);
const year2 = parseInt(tahun2);

let continuousData = [];
let continuousLabels = [];

// If same year, just use that year's data
if(tahun1 === tahun2){
const row = dataset.find(d=> d.PENYAKIT===penyakit && d.TAHUN===tahun1);
if(row){
minggu.forEach(m=>{
const val = row[m];
if(val !== undefined && val !== ""){
continuousData.push(Number(val));
continuousLabels.push(`${m} ${tahun1}`);
}
});
}
} else {
// If different years, combine data from both years
// First get data from tahun1 (all weeks)
const row1 = dataset.find(d=> d.PENYAKIT===penyakit && d.TAHUN===tahun1);
if(row1){
minggu.forEach(m=>{
const val = row1[m];
if(val !== undefined && val !== ""){
continuousData.push(Number(val));
continuousLabels.push(`${m} ${tahun1}`);
}
});
}

// Then get data from tahun2 (up to last available week)
const row2 = dataset.find(d=> d.PENYAKIT===penyakit && d.TAHUN===tahun2);
if(row2){
// Find last valid week in tahun2
let lastValidIndex = -1;
for(let i = minggu.length - 1; i >= 0; i--){
const val = row2[minggu[i]];
if(val !== undefined && val !== ""){
lastValidIndex = i;
break;
}
}

// Add data from tahun2
for(let i = 0; i <= lastValidIndex; i++){
const val = row2[minggu[i]];
if(val !== undefined && val !== ""){
continuousData.push(Number(val));
continuousLabels.push(`${minggu[i]} ${tahun2}`);
}
}
}
}

if(continuousChart) continuousChart.destroy();

continuousChart = new Chart(document.getElementById("continuousChart"), {
type: "line",
data: {
labels: continuousLabels,
datasets: [{
label: `${penyakit} (${tahun1} → ${tahun2})`,
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
interaction: {mode: 'nearest', intersect: true, axis: 'xy'},
plugins: {
legend: {
position: 'top',
labels: {
usePointStyle: true,
padding: 20,
font: {size: 13}
}
},
tooltip: {
enabled: true,
mode: 'nearest',
intersect: true,
animation: false,
backgroundColor: 'rgba(45,55,72,0.9)',
titleFont: {size: 14},
bodyFont: {size: 13},
padding: 12,
cornerRadius: 8,
callbacks: {
title: function(context){
return context[0].label;
},
label: function(context){
return context.parsed.y.toLocaleString() + ' kasus';
}
}
}
},
scales: {
x: {
grid: {display: false},
ticks: {
autoSkip: true,
maxRotation: 90,
minRotation: 90,
font: {size: 10},
maxTicksLimit: 52
}
},
y: {
beginAtZero: true,
grid: {color: '#e2e8f0'},
ticks: {
font: {size: 11},
callback: function(value){
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

function updateAlertStatus(tahun1, tahun2, penyakit){
// Calculate Status Alert based on selected years and disease
// Compare last 4 weeks vs previous 4 weeks for selected disease and years

let totalLast4Weeks = 0;
let totalPrev4Weeks = 0;
let count = 0;

// Get data for selected disease and years
const selectedData = dataset.filter(row => 
row.PENYAKIT === penyakit && 
(row.TAHUN === tahun1 || row.TAHUN === tahun2)
);

selectedData.forEach(row => {
const mingguKeys = Object.keys(row).filter(k => k.startsWith("M-")).sort();
const last4 = mingguKeys.slice(-4);
const prev4 = mingguKeys.slice(-8, -4);

let rowLast4 = 0;
let rowPrev4 = 0;

last4.forEach(m => {
rowLast4 += parseFloat(row[m]) || 0;
});
prev4.forEach(m => {
rowPrev4 += parseFloat(row[m]) || 0;
});

totalLast4Weeks += rowLast4;
totalPrev4Weeks += rowPrev4;
count++;
});

let alertStatus = "Aman";
let alertLevel = "Level: Low";
let alertClass = "card-green";

if(totalPrev4Weeks > 0){
const increase = ((totalLast4Weeks - totalPrev4Weeks) / totalPrev4Weeks) * 100;
if(increase > 50){
alertStatus = "Bahaya";
alertLevel = "Level: High";
alertClass = "card-red";
} else if(increase > 20){
alertStatus = "Waspada";
alertLevel = "Level: Moderate";
alertClass = "card-orange";
} else if(increase < -20){
alertStatus = "Membaik";
alertLevel = "Level: Good";
alertClass = "card-blue";
}
}

// Update alert card
const alertCard = document.getElementById('alertCard');
alertCard.className = "card " + alertClass;
document.getElementById('alertStatus').textContent = alertStatus;
document.getElementById('alertLevel').textContent = alertLevel + " | " + penyakit;
}



/* ================= SECONDARY CHARTS ================= */

function updateSecondaryCharts(data1, data2, minggu, tahun1, tahun2, penyakit){
// Update title based on selected years
let titleText;
if(tahun1 === tahun2){
titleText = "TREN " + penyakit.toUpperCase() + " TAHUN " + tahun1;
} else {
titleText = "TREN " + penyakit.toUpperCase() + " TAHUN " + tahun1 + " & " + tahun2;
}
document.getElementById("secondaryTitle").textContent = titleText;

// Update legend visibility based on selected years
const legend2024 = document.getElementById("legend2024");
const legend2025 = document.getElementById("legend2025");
const legend2026 = document.getElementById("legend2026");

// Hide all first
legend2024.style.display = "none";
legend2025.style.display = "none";
legend2026.style.display = "none";

if(tahun1 === tahun2){
// Same year selected - show only that year's legend
if(tahun1 === "2024"){
legend2024.style.display = "inline";
} else if(tahun1 === "2025"){
legend2025.style.display = "inline";
} else {
legend2026.style.display = "inline";
}
} else {
// Different years selected - show both selected years
if(tahun1 === "2024" || tahun2 === "2024"){
legend2024.style.display = "inline";
}
if(tahun1 === "2025" || tahun2 === "2025"){
legend2025.style.display = "inline";
}
if(tahun1 === "2026" || tahun2 === "2026"){
legend2026.style.display = "inline";
}
}

// Determine which year is more recent
const year1 = parseInt(tahun1);
const year2 = parseInt(tahun2);
const newerYear = year2 >= year1 ? tahun2 : tahun1;
const olderYear = year2 >= year1 ? tahun1 : tahun2;
const newerData = year2 >= year1 ? data2 : data1;
const olderData = year2 >= year1 ? data1 : data2;

// Find the last valid week starting from the most recent year first
let lastValidIndexNewer = -1;
let lastValidIndexOlder = -1;

// Check newer year first
for(let i = newerData.length - 1; i >= 0; i--){
if(newerData[i] !== null && newerData[i] !== undefined){
lastValidIndexNewer = i;
break;
}
}

// Check older year
for(let i = olderData.length - 1; i >= 0; i--){
if(olderData[i] !== null && olderData[i] !== undefined){
lastValidIndexOlder = i;
break;
}
}

// Build combined 12 weeks data from both years if needed
const last12 = [];
const last12Labels = [];
let weeksNeeded = 12;
let currentIndex = lastValidIndexNewer;

// First, take weeks from newer year (working backwards)
while(weeksNeeded > 0 && currentIndex >= 0){
if(newerData[currentIndex] !== null && newerData[currentIndex] !== undefined){
last12.unshift(newerData[currentIndex]);
last12Labels.unshift(minggu[currentIndex]);
weeksNeeded--;
}
currentIndex--;
}

// If still need more weeks, take from older year
if(weeksNeeded > 0){
currentIndex = lastValidIndexOlder;
while(weeksNeeded > 0 && currentIndex >= 0){
if(olderData[currentIndex] !== null && olderData[currentIndex] !== undefined){
last12.unshift(olderData[currentIndex]);
last12Labels.unshift(minggu[currentIndex]);
weeksNeeded--;
}
currentIndex--;
}
}

// Build combined 4 weeks data from both years if needed
const last4 = [];
const last4Labels = [];
weeksNeeded = 4;
currentIndex = lastValidIndexNewer;

// First, take weeks from newer year (working backwards)
while(weeksNeeded > 0 && currentIndex >= 0){
if(newerData[currentIndex] !== null && newerData[currentIndex] !== undefined){
last4.unshift(newerData[currentIndex]);
last4Labels.unshift(minggu[currentIndex]);
weeksNeeded--;
}
currentIndex--;
}

// If still need more weeks, take from older year
if(weeksNeeded > 0){
currentIndex = lastValidIndexOlder;
while(weeksNeeded > 0 && currentIndex >= 0){
if(olderData[currentIndex] !== null && olderData[currentIndex] !== undefined){
last4.unshift(olderData[currentIndex]);
last4Labels.unshift(minggu[currentIndex]);
weeksNeeded--;
}
currentIndex--;
}
}


// Build secondary chart datasets - only show one if years are same
const secondaryDatasets = [];
secondaryDatasets.push({
label: tahun1,
data: data1,
borderColor: "#b6c300",
backgroundColor: "rgba(182,195,0,0.1)",
borderWidth: 3,
tension: 0.3,
pointRadius: 3,
pointHoverRadius: 6
});
if(tahun1 !== tahun2){
secondaryDatasets.push({
label: tahun2,
data: data2,
borderColor: "#0b7d77",
backgroundColor: "rgba(11,125,119,0.1)",
borderWidth: 3,
tension: 0.3,
pointRadius: 3,
pointHoverRadius: 6,
spanGaps: false
});
}

// Create main secondary chart (same data as top chart, different style)
if(penyakitMainChart) penyakitMainChart.destroy();

penyakitMainChart = new Chart(document.getElementById("penyakitMainChart"), {
type: "line",
data: {
labels: minggu,
datasets: secondaryDatasets
},

options: {
responsive: true,
maintainAspectRatio:false,
interaction:{mode:'nearest', intersect:true, axis:'xy'},
plugins: { 
legend: { display: false },
tooltip:{
enabled:true,
mode:'nearest',
intersect:true,
axis:'xy',
animation:false,
backgroundColor:'rgba(45,55,72,0.9)',
titleFont:{size:13},
bodyFont:{size:12},
padding:10,
cornerRadius:6
}
},
scales: {
x: {
grid:{display:false},
ticks: {
autoSkip: false,
maxRotation: 90,
minRotation: 90,
font:{size:10}
}
},
y: { 
beginAtZero: true,
grid:{color:'#e2e8f0'},
ticks:{font:{size:10}}
}
},
elements:{
point:{
radius:3,
hoverRadius:6,
hitRadius:5
}
}
}

});

// Create 12 weeks mini chart - using data from last valid index
if(penyakitChart12) penyakitChart12.destroy();

penyakitChart12 = new Chart(document.getElementById("penyakitChart12"), {
type: "line",
data: {
labels: last12Labels,
datasets: [{
data: last12,
borderColor: "#58b7c0",
backgroundColor: "rgba(88,183,192,0.1)",
borderWidth: 3,
tension: 0.4,
pointRadius: 4,
pointBackgroundColor: "#58b7c0",
pointHoverRadius: 7,
pointHitRadius: 8,
fill:true,
spanGaps: true
}]
},
options: {
responsive: true,
maintainAspectRatio:false,
interaction:{mode:'nearest', intersect:true, axis:'xy'},
plugins: { 
legend: { display: false },
tooltip:{
enabled:true,
mode:'nearest',
intersect:true,
axis:'xy',
animation:false,
backgroundColor:'rgba(45,55,72,0.9)',
titleFont:{size:12},
bodyFont:{size:11},
padding:8,
cornerRadius:6,
callbacks:{
label:function(context){
return context.parsed.y.toLocaleString() + ' kasus';
}
}
}
},
scales: { 
x: { 
display: true,
grid:{display:false},
ticks: { font: { size: 9 } }
}, 
y: { display: false } 
},
elements:{
point:{
radius:4,
hoverRadius:7,
hitRadius:8
}
}
}
});

// Create 4 weeks mini chart - using data from last valid index
if(penyakitChart4) penyakitChart4.destroy();

penyakitChart4 = new Chart(document.getElementById("penyakitChart4"), {
type: "line",
data: {
labels: last4Labels,
datasets: [{
data: last4,
borderColor: "#59c17a",
backgroundColor: "rgba(89,193,122,0.1)",
borderWidth: 3,
tension: 0.4,
pointRadius: 5,
pointBackgroundColor: "#59c17a",
pointHoverRadius: 8,
pointHitRadius: 10,
fill:true,
spanGaps: true
}]
},
options: {
responsive: true,
maintainAspectRatio:false,
interaction:{mode:'nearest', intersect:true, axis:'xy'},
plugins: { 
legend: { display: false },
tooltip:{
enabled:true,
mode:'nearest',
intersect:true,
axis:'xy',
animation:false,
backgroundColor:'rgba(45,55,72,0.9)',
titleFont:{size:12},
bodyFont:{size:11},
padding:8,
cornerRadius:6,
callbacks:{
label:function(context){
return context.parsed.y.toLocaleString() + ' kasus';
}
}
}
},
scales: { 
x: { 
display: true,
grid:{display:false},
ticks: { font: { size: 10 } }
}, 
y: { display: false } 
},
elements:{
point:{
radius:5,
hoverRadius:8,
hitRadius:10
}
}
}
});
}



/* ================= DATA TABLE ================= */

function updateDataTable(data1, data2, minggu, tahun1, tahun2){
const tbody = document.getElementById("tableBody");
tbody.innerHTML = "";

// Determine which year is more recent (tahun2 is usually the newer year)
const year1 = parseInt(tahun1);
const year2 = parseInt(tahun2);
const newerYear = year2 >= year1 ? tahun2 : tahun1;
const olderYear = year2 >= year1 ? tahun1 : tahun2;
const newerData = year2 >= year1 ? data2 : data1;
const olderData = year2 >= year1 ? data1 : data2;

// Find the last valid week starting from the most recent year first
let lastValidIndex = -1;
let sourceYear = "";

// Check newer year first
for(let i = newerData.length - 1; i >= 0; i--){
if(newerData[i] !== null && newerData[i] !== undefined){
lastValidIndex = i;
sourceYear = newerYear;
break;
}
}

// If no valid data in newer year, check older year
if(lastValidIndex === -1){
for(let i = olderData.length - 1; i >= 0; i--){
if(olderData[i] !== null && olderData[i] !== undefined){
lastValidIndex = i;
sourceYear = olderYear;
break;
}
}
}

// If still no valid data, use the last week of newer year
if(lastValidIndex === -1){
lastValidIndex = minggu.length - 1;
sourceYear = newerYear;
}

// Get last 8 weeks for display (starting from last valid week)
const startIndex = Math.max(0, lastValidIndex - 7);
const displayWeeks = minggu.slice(startIndex, lastValidIndex + 1);

// Reverse to show newest first
const reversedWeeks = [...displayWeeks].reverse();

reversedWeeks.forEach((week) => {
const actualIndex = minggu.indexOf(week);
const val1 = data1[actualIndex];
const val2 = data2[actualIndex];

// Skip if both values are null/undefined
if((val1 === null || val1 === undefined) && (val2 === null || val2 === undefined)){
return;
}

const numVal1 = val1 !== null && val1 !== undefined ? val1 : 0;
const numVal2 = val2 !== null && val2 !== undefined ? val2 : 0;
const selisih = numVal2 - numVal1;

let trend = "";
let trendClass = "";
if(selisih > 0){
trend = "↑ " + Math.abs(selisih).toLocaleString();
trendClass = "trend-up";
} else if(selisih < 0){
trend = "↓ " + Math.abs(selisih).toLocaleString();
trendClass = "trend-down";
} else {
trend = "→ Sama";
trendClass = "trend-same";
}

const row = `
<tr>
<td><strong>${week}</strong></td>
<td>${val1 !== null && val1 !== undefined ? val1.toLocaleString() : '-'}</td>
<td>${val2 !== null && val2 !== undefined ? val2.toLocaleString() : '-'}</td>
<td>${selisih !== 0 ? selisih.toLocaleString() : '-'}</td>
<td class="${trendClass}">${trend}</td>
</tr>
`;
tbody.innerHTML += row;
});
}
