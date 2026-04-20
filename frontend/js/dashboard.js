// Protect the route
const token = localStorage.getItem('token');
if (!token) {
  // Try relative path or absolute path for redirect depending on how this is served.
  window.location.href = '../login.html';
}

const userStr = localStorage.getItem('user');
if (userStr) {
  const user = JSON.parse(userStr);
  document.getElementById('userGreeting').innerText = `Welcome, ${user.name}`;
}

// ------------------------------------------------
// MAP SYSTEM INITIALIZATION (LEAFLET.JS)
// ------------------------------------------------
let map = L.map('map').setView([28.6139, 77.2090], 11); // Default center (New Delhi)

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap | MargDarshak AI'
}).addTo(map);

// Map State
let accidentsData = [];
let markersLayer = L.layerGroup().addTo(map);
let heatLayer = null;

// Chart State
let chartInstance = null;
const ctx = document.getElementById('severityChart').getContext('2d');

// Modal Elements
const reportModal = new bootstrap.Modal(document.getElementById('reportModal'));
const latInput = document.getElementById('reportLat');
const lngInput = document.getElementById('reportLng');
const descInput = document.getElementById('reportDesc');
const severityInput = document.getElementById('reportSeverity');

// ------------------------------------------------
// RENDER FUNCTIONS
// ------------------------------------------------
function renderTable() {
  const tbody = document.getElementById('accidentTableBody');
  tbody.innerHTML = '';
  
  accidentsData.forEach(acc => {
    const tr = document.createElement('tr');
    
    // Determine badge class
    let badgeClass = 'text-bg-success';
    if(acc.severity === 'medium') badgeClass = 'text-bg-warning';
    if(acc.severity === 'high') badgeClass = 'text-bg-danger';

    const dateStr = new Date(acc.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

    tr.innerHTML = `
      <td class="text-muted">${dateStr}</td>
      <td class="fw-medium">${acc.description}</td>
      <td><span class="badge ${badgeClass} px-2 py-1 rounded-pill">${acc.severity.toUpperCase()}</span></td>
      <td><small class="text-muted">L: ${acc.location.lat.toFixed(3)}, ${acc.location.lng.toFixed(3)}</small></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderMarkers() {
  markersLayer.clearLayers();
  
  accidentsData.forEach(acc => {
    let color = '#22c55e'; // green
    if(acc.severity === 'medium') color = '#eab308'; // yellow
    if(acc.severity === 'high') color = '#ef4444'; // red

    // Simple circle markers
    L.circleMarker([acc.location.lat, acc.location.lng], {
      radius: 8,
      fillColor: color,
      color: "#0f172a",
      weight: 1,
      opacity: 1,
      fillOpacity: 0.9
    }).addTo(markersLayer)
      .bindPopup(`<strong class="text-dark">${acc.severity.toUpperCase()} ALERT</strong><br><span class="text-dark">${acc.description}</span>`);
  });
}

function processHeatmap() {
  if (heatLayer) {
    map.removeLayer(heatLayer);
  }
  
  // Prepare heat points
  const heatPoints = accidentsData.map(acc => {
    let intensity = 0.3; // Default for low
    if (acc.severity === 'medium') intensity = 0.6;
    if (acc.severity === 'high') intensity = 1.0;
    return [acc.location.lat, acc.location.lng, intensity];
  });

  // Adding Leaflet Heat layer (plugin loaded in HTML)
  heatLayer = L.heatLayer(heatPoints, {
    radius: 30,
    blur: 20,
    maxZoom: 14,
    gradient: {0.4: 'blue', 0.6: 'cyan', 0.8: 'yellow', 1.0: 'red'}
  }).addTo(map);
}

function renderChart() {
  const counts = { low: 0, medium: 0, high: 0 };
  accidentsData.forEach(acc => {
    if (counts[acc.severity] !== undefined) counts[acc.severity]++;
  });

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Low', 'Medium', 'High'],
      datasets: [{
        data: [counts.low, counts.medium, counts.high],
        backgroundColor: ['#22c55e', '#eab308', '#ef4444'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      cutout: '70%',
      plugins: {
        legend: { position: 'bottom', labels: { color: '#f8fafc', padding: 20 } }
      }
    }
  });
}

function updateUI() {
  renderTable();
  renderMarkers();
  processHeatmap();
  renderChart();
}

// ------------------------------------------------
// API INTEGRATION
// ------------------------------------------------

// Fetch all accidents and update UI
async function fetchAccidents() {
  try {
    const res = await authFetch('/accidents'); // uses generic authFetch defined in auth.js
    if (res.ok) {
      accidentsData = await res.json();
      updateUI();
      
      // Auto-recenter to the most recent accident
      if (accidentsData.length > 0) {
        map.flyTo([accidentsData[0].location.lat, accidentsData[0].location.lng], 12, { duration: 1 });
      }
    }
  } catch (err) {
    console.error("Failed to load accidents", err);
  }
}

// Report new accident via Form Submission
document.getElementById('reportAccidentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('submitReportBtn');
  btn.disabled = true;
  btn.innerText = 'Broadcasting...';

  const payload = {
    lat: parseFloat(latInput.value),
    lng: parseFloat(lngInput.value),
    description: descInput.value,
    severity: severityInput.value
  };

  try {
    const res = await authFetch('/accidents/report', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      reportModal.hide();
      // NOTE: Data is added to state via Socket.io event listener shortly after
    } else {
      alert("Error reporting accident.");
    }
  } catch (err) {
    console.error("Submit report error", err);
  } finally {
    btn.disabled = false;
    btn.innerText = 'Broadcast Event';
  }
});

// ------------------------------------------------
// MAP CLICK TO REPORT
// ------------------------------------------------
map.on('click', function(e) {
  const { lat, lng } = e.latlng;
  
  // Set hidden inputs
  latInput.value = lat;
  lngInput.value = lng;
  // Reset fields
  descInput.value = '';
  severityInput.value = 'low';
  
  // Show Modal
  reportModal.show();
});

// ------------------------------------------------
// REAL TIME UPDATE (SOCKET.IO)
// ------------------------------------------------
const socket = io('http://localhost:5000'); 

socket.on('newAccident', (newAcc) => {
  // Prepend to array
  accidentsData.unshift(newAcc);
  
  // Triggers updates for map, table, chart
  updateUI();
});

// Start initialization
fetchAccidents();

// ------------------------------------------------
// SMART MODULES: AQI & TRAFFIC PREDICTION
// ------------------------------------------------
async function initSmartFeatures() {
  const trafficCtx = document.getElementById('trafficChart').getContext('2d');
  new Chart(trafficCtx, {
    type: 'line',
    data: {
      labels: ['Morning', 'Afternoon', 'Evening', 'Night'],
      datasets: [{ label: 'Traffic Density (%)', data: [85, 45, 90, 20], borderColor: '#3b82f6', fill: true, backgroundColor: 'rgba(59,130,246,0.2)', tension: 0.4 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false} }, scales: { y: { display: false }, x: { display:false } } }
  });

  try {
    const res = await fetch('https://api.openweathermap.org/data/2.5/air_pollution?lat=28.6139&lon=77.2090&appid=8a7ac727de90ebfd25b7dca68ee91000');
    const data = await res.json();
    let aqiMap = {1:50, 2:100, 3:150, 4:250, 5:350};
    let aqiValue = aqiMap[data.list[0].main.aqi] || Math.floor(Math.random() * 100 + 150);
    
    document.getElementById('aqiDisplay').innerText = aqiValue;
    if (aqiValue > 200) {
      document.getElementById('aqiDisplay').classList.add('text-danger', 'fw-bold');
      document.getElementById('aqiStatus').innerText = "⚠️ WARNING: Hazardous";
      alert("WARNING: Hazardous AQI Level detected (> 200) in operational zone.");
    } else {
      document.getElementById('aqiStatus').innerText = "Healthy Conditions";
    }
  } catch(e) {
    document.getElementById('aqiDisplay').innerText = "180";
    document.getElementById('aqiStatus').innerText = "Simulated Active";
  }
}
initSmartFeatures();
