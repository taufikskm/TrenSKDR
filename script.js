let dataset=[];
let chart;
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
fetch("DATANASIONAL2025.csv").then(r=>r.text()),
fetch("DATANASIONAL2026.csv").then(r=>r.text())
])
.then(([csv2025,csv2026])=>{

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

dataset=[...data2025,...data2026];

console.log("DATA FINAL:",dataset);

loadFilter();
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
borderWidth:3,
tension:0.3
});
// Only add second dataset if years are different
if(tahun1 !== tahun2){
datasets.push({
label:`${penyakit} ${tahun2}`,
data:data2,
borderWidth:3,
tension:0.3
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
interaction:{mode:'nearest', intersect:true, axis:'xy'},
plugins:{
legend:{position:'top'},
tooltip:{
enabled:true,
mode:'nearest',
intersect:true,
axis:'xy',
animation:false,
callbacks:{
title:function(context){
return context[0].label;
},
label:function(context){
return context.dataset.label + ': ' + context.parsed.y;
}
}
}

},

scales:{
x:{
ticks:{
autoSkip:false,
maxRotation:90,
minRotation:90
}
},
y:{
beginAtZero:true
}
},
elements:{
point:{
radius:5,
hoverRadius:8,
hitRadius:5
}
}
}


});

// Update secondary charts with same data
updateSecondaryCharts(data1, data2, minggu, tahun1, tahun2, penyakit);

}



/* ================= SECONDARY CHARTS ================= */

function updateSecondaryCharts(data1, data2, minggu, tahun1, tahun2, penyakit){
// Update title based on selected years
let titleText;
if(tahun1 === tahun2){
titleText = "TREN " + penyakit.toUpperCase() + " BERDASARKAN SKDR TAHUN " + tahun1;
} else {
titleText = "TREN " + penyakit.toUpperCase() + " BERDASARKAN SKDR TAHUN " + tahun1 + " DAN " + tahun2;
}
document.getElementById("secondaryTitle").textContent = titleText;

// Update legend visibility based on selected years
const legend2025 = document.getElementById("legend2025");
const legend2026 = document.getElementById("legend2026");

if(tahun1 === tahun2){
// Same year selected - show only that year's legend
if(tahun1 === "2025"){
legend2025.style.display = "inline";
legend2026.style.display = "none";
} else {
legend2025.style.display = "none";
legend2026.style.display = "inline";
}
} else {
// Different years selected - show both legends
legend2025.style.display = "inline";
legend2026.style.display = "inline";
}


// Get last 12 and 4 weeks data from first dataset (tahun1)
const last12 = data1.slice(-12);
const last4 = data1.slice(-4);

// Build secondary chart datasets - only show one if years are same
const secondaryDatasets = [];
secondaryDatasets.push({
label: tahun1,
data: data1,
borderColor: "#b6c300",
borderWidth: 4,
tension: 0.3
});
if(tahun1 !== tahun2){
secondaryDatasets.push({
label: tahun2,
data: data2,
borderColor: "#0b7d77",
borderWidth: 4,
tension: 0.3,
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
interaction:{mode:'nearest', intersect:true, axis:'xy'},
plugins: { 
legend: { display: false },
tooltip:{
enabled:true,
mode:'nearest',
intersect:true,
axis:'xy',
animation:false
}
},
scales: {
x: {
ticks: {
autoSkip: false,
maxRotation: 90,
minRotation: 90
}
},
y: { beginAtZero: true }
},
elements:{
point:{
radius:5,
hoverRadius:8,
hitRadius:5
}
}
}


});

// Create 12 weeks mini chart
if(penyakitChart12) penyakitChart12.destroy();

penyakitChart12 = new Chart(document.getElementById("penyakitChart12"), {
type: "line",
data: {
labels: last12.map((_,i) => "M-" + (data1.length - 12 + i + 1)),
datasets: [{
data: last12,
borderColor: "#58b7c0",
borderWidth: 4,
tension: 0.4,
pointRadius: 5,
pointBackgroundColor: "#58b7c0",
pointHoverRadius: 8,
pointHitRadius: 10
}]
},
options: {
responsive: true,
interaction:{mode:'nearest', intersect:true, axis:'xy'},
plugins: { 
legend: { display: false },
tooltip:{
enabled:true,
mode:'nearest',
intersect:true,
axis:'xy',
animation:false
}
},
scales: { 
x: { 
display: true,
ticks: { font: { size: 10 } }
}, 
y: { display: false } 
},
elements:{
point:{
radius:5,
hoverRadius:8,
hitRadius:5
}
}
}

});

// Create 4 weeks mini chart
if(penyakitChart4) penyakitChart4.destroy();

penyakitChart4 = new Chart(document.getElementById("penyakitChart4"), {
type: "line",
data: {
labels: last4.map((_,i) => "M-" + (data1.length - 4 + i + 1)),
datasets: [{
data: last4,
borderColor: "#59c17a",
borderWidth: 4,
tension: 0.4,
pointRadius: 6,
pointBackgroundColor: "#59c17a",
pointHoverRadius: 9,
pointHitRadius: 12
}]
},
options: {
responsive: true,
interaction:{mode:'nearest', intersect:true, axis:'xy'},
plugins: { 
legend: { display: false },
tooltip:{
enabled:true,
mode:'nearest',
intersect:true,
axis:'xy',
animation:false
}
},
scales: { 
x: { 
display: true,
ticks: { font: { size: 10 } }
}, 
y: { display: false } 
},
elements:{
point:{
radius:6,
hoverRadius:9,
hitRadius:6
}
}
}

});
}
