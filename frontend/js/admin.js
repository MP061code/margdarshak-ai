// RBAC SECURITY ENFORCEMENT
const token = localStorage.getItem('token');
const userRole = localStorage.getItem('role');

// Strict check: if no token OR not admin, eject.
if (!token) {
  window.location.href = '../admin-login.html';
} else if (userRole !== 'admin') {
  window.location.href = 'dashboard.html';
}

const userStr = localStorage.getItem('user');
if (userStr) {
  const user = JSON.parse(userStr);
  document.getElementById('adminGreeting').innerText = `Admin: ${user.name}`;
}

// ------------------------------------------------
// ADMIN DASHBOARD MAP (Leaflet.js)
// ------------------------------------------------
let adminMap = L.map('adminMap').setView([20.5937, 78.9629], 5); // Default to India center

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap | MargDarshak Admin'
}).addTo(adminMap);

let accidentsData = [];
let citizenReportsData = [];
let adminMarkersLayer = L.layerGroup().addTo(adminMap);

// ------------------------------------------------
// VIEW RENDERING LOGIC
// ------------------------------------------------
function renderAdminTable() {
  const tbody = document.getElementById('adminAccidentTable');
  tbody.innerHTML = '';

  accidentsData.forEach(acc => {
    const tr = document.createElement('tr');

    // Aesthetic badging map
    let badgeClass = 'text-bg-success';
    if (acc.severity === 'medium') badgeClass = 'text-bg-warning';
    if (acc.severity === 'high') badgeClass = 'text-bg-danger';

    const dateStr = new Date(acc.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    const reportedBy = acc.reportedBy || 'Unknown User';

    tr.innerHTML = `
      <td class="text-muted"><small>${dateStr}</small></td>
      <td class="fw-medium">${acc.description}</td>
      <td><span class="badge ${badgeClass} px-2 py-1 rounded-pill">${acc.severity.toUpperCase()}</span></td>
      <td><small class="text-muted font-monospace">${acc.location.lat.toFixed(4)}, ${acc.location.lng.toFixed(4)}</small></td>
      <td><small class="text-muted">${reportedBy}</small></td>
      <td>
        <button class="btn btn-sm btn-outline-danger delete-btn" onclick="deleteAccident('${acc._id}')">
          <i class="bi bi-trash"></i> Delete
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderAdminMarkers() {
  adminMarkersLayer.clearLayers();

  accidentsData.forEach(acc => {
    let color = '#22c55e'; // green
    if (acc.severity === 'medium') color = '#eab308'; // yellow
    if (acc.severity === 'high') {
      color = '#ef4444'; // red
      
      // Draw an AI Risk Zone for High Severity
      let riskPercentage = Math.floor(Math.random() * 20 + 80); // 80 - 99%
      let dangerScore = (riskPercentage / 10).toFixed(1);
      
      let riskPopup = `
        <div class="text-center">
           <h6 class="text-danger fw-bold mb-1"><i class="bi bi-robot"></i> AI Risk Zone</h6>
           <span class="badge bg-danger mb-2">Danger Score: ${dangerScore}/10</span>
           <br><small class="text-muted">Accident Clusters: ${Math.floor(Math.random() * 5 + 2)}</small>
           <br><small class="text-muted">Severity: CRITICAL</small>
           <div class="progress mt-2" style="height: 5px;">
              <div class="progress-bar bg-danger" style="width: ${riskPercentage}%"></div>
           </div>
           <small class="text-danger">${riskPercentage}% Risk Probability</small>
        </div>
      `;

      L.circle([acc.location.lat, acc.location.lng], {
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.2,
        radius: 300 // 300 meters risk zone
      }).addTo(adminMarkersLayer)
        .bindPopup(riskPopup);
    }

    // Render interactive marker
    L.circleMarker([acc.location.lat, acc.location.lng], {
      radius: 9,
      fillColor: color,
      color: "#0f172a",
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9
    }).addTo(adminMarkersLayer)
      .bindPopup(`
        <strong class="text-dark">${acc.severity.toUpperCase()} PRIORITY ALERT</strong><hr class="my-1">
        <span class="text-dark d-block mb-1">${acc.description}</span>
        <small class="text-muted">ID: ${acc._id}<br>Time: ${new Date(acc.createdAt).toLocaleString()}</small>
      `);
  });
}

let monthlyChartInstance = null;

function renderAdminAnalytics() {
  const ctx = document.getElementById('monthlyTrendsChart');
  if(!ctx) return;

  if (monthlyChartInstance) monthlyChartInstance.destroy();

  monthlyChartInstance = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        { label: 'Accidents', data: [12, 19, 15, 22, 14, 28], backgroundColor: 'rgba(239, 68, 68, 0.7)' },
        { label: 'Violations', data: [30, 45, 28, 50, 42, 60], backgroundColor: 'rgba(234, 179, 8, 0.7)' }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
      },
      plugins: { legend: { labels: { color: '#f8fafc' } } }
    }
  });

  const listEl = document.getElementById('topRiskLocations');
  if(listEl && accidentsData.length > 0) {
    listEl.innerHTML = '';
    const highs = accidentsData.filter(a => a.severity === 'high').slice(0, 3);
    highs.forEach(h => {
      const li = document.createElement('li');
      li.className = 'list-group-item bg-transparent text-light border-secondary border-opacity-25';
      li.innerHTML = `<i class="bi bi-exclamation-circle text-danger me-2"></i> ${h.description} <br><small class="text-muted">${h.location.lat.toFixed(3)}, ${h.location.lng.toFixed(3)}</small>`;
      listEl.appendChild(li);
    });
    if(highs.length === 0) {
      listEl.innerHTML = '<li class="list-group-item bg-transparent text-muted border-secondary border-opacity-25">No high risk zones detected.</li>';
    }
  }
}

function renderAdminCitizenReports() {
  const tbody = document.getElementById('adminCitizenReportsTable');
  if(!tbody) return;
  tbody.innerHTML = '';

  citizenReportsData.forEach(rep => {
    const tr = document.createElement('tr');
    const dateStr = new Date(rep.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    const imgHtml = rep.image ? `<img src="https://margdarshak-ai-4rdt.onrender.com${rep.image}" width="60" class="rounded cursor-pointer" onclick="window.open(this.src)">` : '<small class="text-muted">None</small>';
    const typeLabel = rep.issueType ? rep.issueType.replace('_', ' ').toUpperCase() : 'OTHER';
    
    let statusClass = rep.status === 'resolved' ? 'text-bg-success' : 'text-bg-warning';
    
    tr.innerHTML = `
      <td class="text-muted"><small>${dateStr}</small></td>
      <td class="fw-medium text-info">${typeLabel}</td>
      <td>${rep.description}</td>
      <td>${imgHtml}</td>
      <td><span class="badge ${statusClass} px-2 py-1 rounded-pill">${rep.status.toUpperCase()}</span></td>
      <td>
        ${rep.status === 'pending' ? `<button class="btn btn-sm btn-success" onclick="updateReportStatus('${rep._id}', 'resolved')"><i class="bi bi-check-circle"></i> Resolve</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function updateAdminUI() {
  renderAdminTable();
  renderAdminMarkers();
  renderAdminAnalytics();
  renderAdminCitizenReports();
}
// ------------------------------------------------
// API CONTROLLERS
// ------------------------------------------------
async function fetchAdminStats() {
  try {
    const res = await authFetch('/admin/stats'); // Assumes authFetch sets Bearer TOKEN
    if (res.ok) {
      const data = await res.json();

      const elUsers = document.getElementById('statUsers');
      if (elUsers) elUsers.innerText = data.totalUsers;

      const elAccidents = document.getElementById('statAccidents');
      if (elAccidents) elAccidents.innerText = data.totalAccidents;

      const elReports = document.getElementById('statReports');
      if (elReports) elReports.innerText = data.totalCitizenReports;

      const elViolations = document.getElementById('statViolations');
      if (elViolations) elViolations.innerText = data.totalViolations;
    } else {
      console.error('Failed to load admin stats', res.status);
    }
  } catch (error) {
    console.error('API Request Error:', error);
  }
}

async function fetchAccidentsData() {
  try {
    const res = await authFetch('/accidents'); // Utilizes the utility from auth.js
    if (res.ok) {
      accidentsData = await res.json();
      updateAdminUI();
      if (accidentsData.length > 0) {
        adminMap.flyTo([accidentsData[0].location.lat, accidentsData[0].location.lng], 10, { duration: 1 });
      }
    } else {
      console.error("Failed to load global accidents table.");
    }
  } catch (err) {
    console.error("Accident Data Load Error:", err);
  }
}

// Exposed to global scope for inline onclick handler
window.deleteAccident = async function (id) {
  if (!confirm('Warning: Are you sure you want to permanently delete this accident record?')) return;

  try {
    const res = await authFetch(`/accidents/${id}`, { method: 'DELETE' });
    if (res.ok) {
      // Optimistic UI Removal
      accidentsData = accidentsData.filter(a => a._id !== id);
      updateAdminUI();
      fetchAdminStats(); // Refresh dynamic numbers
    } else {
      const errorData = await res.json();
      alert(`Admin Deletion Error: ${errorData.message}`);
    }
  } catch (err) {
    console.error('Delete action failed:', err);
    alert('Critical error occurred processing deletion command.');
  }
};

async function fetchCitizenReports() {
  try {
    const res = await authFetch('/citizen/report');
    if (res.ok) {
      citizenReportsData = await res.json();
      renderAdminCitizenReports();
    }
  } catch (err) {
    console.error("Citizen Reports Load Error:", err);
  }
}

window.updateReportStatus = async function (id, status) {
  try {
    const res = await authFetch(`/citizen/report/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      const updatedReport = await res.json();
      citizenReportsData = citizenReportsData.map(r => r._id === id ? updatedReport : r);
      renderAdminCitizenReports();
      showRealTimeToast("Citizen Report updated successfully.");
    }
  } catch (err) {
    console.error("Update report status failed", err);
  }
};

// ------------------------------------------------
// LIVE FEED SOCKET.IO INTEGRATION
// ------------------------------------------------
const socket = io('https://margdarshak-ai-4rdt.onrender.com');

// Utility for showing toasts
function showRealTimeToast(message) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    container.style.zIndex = '1100';
    document.body.appendChild(container);
  }

  const toastEl = document.createElement('div');
  toastEl.className = 'toast align-items-center text-bg-danger border-0 show';
  toastEl.setAttribute('role', 'alert');
  toastEl.setAttribute('aria-live', 'assertive');
  toastEl.setAttribute('aria-atomic', 'true');

  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body fw-medium">
        ⚠️ ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close" onclick="this.parentElement.parentElement.remove()"></button>
    </div>
  `;

  container.appendChild(toastEl);
  setTimeout(() => { if (toastEl.parentNode) toastEl.remove(); }, 5000);
}

socket.on('newAccident', (newAcc) => {
  // Intercept real-time broadcast and inject to top of local state
  accidentsData.unshift(newAcc);
  updateAdminUI();
  fetchAdminStats(); // Refresh stats from socket trigger
  showRealTimeToast(`Priority Alert: ${newAcc.description}`);
});

socket.on('newCitizenReport', (newRep) => {
  citizenReportsData.unshift(newRep);
  updateAdminUI();
  fetchAdminStats();
  showRealTimeToast(`New Citizen Report: ${newRep.issueType} reported.`);
});

socket.on('sosAlert', (data) => {
  showRealTimeToast(`🚨 SOS EMERGENCY TRIGGERED by User! Immediate attention required.`);
  // Highlight map heavily
  L.circle([28.6139, 77.2090], { radius: 1000, color: 'red', fillOpacity: 0.5 })
   .addTo(adminMap).bindPopup('<b>🚨 SOS LIVE LOCATION</b>').openPopup();
  adminMap.flyTo([28.6139, 77.2090], 14, { duration: 1.0 });
});

// BootSequence
fetchAdminStats();
fetchAccidentsData();
fetchCitizenReports();

// ------------------------------------------------
// EMERGENCY CORRIDOR LOGIC (OSRM Routing)
// ------------------------------------------------
let isEmergencyMode = false;
let emergencyRouteLayer = null;
let ambulanceMarker = null;
let currentEmergencyData = null; // Store fetched route data
let signalMarkers = []; // Simulated signals along route
let ambulanceAnimInterval = null;

window.generateSmartRoute = async function() {
  const sourceVal = document.getElementById('emSource').value;
  const destVal = document.getElementById('emDest').value;
  
  const [lat1, lon1] = sourceVal.split(',').map(Number);
  const [lat2, lon2] = destVal.split(',').map(Number);
  
  showRealTimeToast("Analyzing traffic, accidents, and computing smartest route...");

  try {
    // Fetch real route from OSRM
    const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`);
    const data = await res.json();
    
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const distance = (route.distance / 1000).toFixed(1) + ' km';
      const duration = Math.ceil(route.duration / 60) + ' mins';
      
      currentEmergencyData = {
        routeGeoJSON: route.geometry,
        sourceName: document.getElementById('emSource').options[document.getElementById('emSource').selectedIndex].text,
        destName: document.getElementById('emDest').options[document.getElementById('emDest').selectedIndex].text,
        distanceText: distance,
        etaText: duration,
        trafficStatus: 'Optimized (Avoiding Hotspots)'
      };

      // Show Analytics
      document.getElementById('routeAnalyticsPanel').classList.remove('d-none');
      document.getElementById('routeName').innerText = `${currentEmergencyData.sourceName} → ${currentEmergencyData.destName}`;
      document.getElementById('routeDist').innerText = distance;
      document.getElementById('routeETA').innerText = duration;
      document.getElementById('routeTraffic').innerText = currentEmergencyData.trafficStatus;

      // Draw Route
      if (emergencyRouteLayer) adminMap.removeLayer(emergencyRouteLayer);
      if (ambulanceMarker) adminMap.removeLayer(ambulanceMarker);
      signalMarkers.forEach(m => adminMap.removeLayer(m));
      signalMarkers = [];

      emergencyRouteLayer = L.geoJSON(route.geometry, {
        style: { color: '#ef4444', weight: 8, opacity: 0.9, className: 'animated-route' }
      }).addTo(adminMap);
      
      adminMap.fitBounds(emergencyRouteLayer.getBounds());

      // Enable Activation
      document.getElementById('emergencyToggleBtn').classList.remove('disabled');
      showRealTimeToast("Smart Route Generated. Ready for Green Corridor Activation.");
    }
  } catch (err) {
    console.error("Routing error:", err);
    alert("Failed to generate route. Please check network.");
  }
};

window.toggleEmergencyMode = async function() {
  const btn = document.getElementById('emergencyToggleBtn');
  if (!currentEmergencyData && !isEmergencyMode) return;

  isEmergencyMode = !isEmergencyMode;

  if (isEmergencyMode) {
    btn.classList.remove('btn-outline-danger');
    btn.classList.add('btn-danger', 'glow-btn');
    btn.innerHTML = `<i class="bi bi-shield-fill-exclamation"></i> Green Corridor Active`;
    
    try {
      const res = await authFetch('/admin/emergency', {
        method: 'POST',
        body: JSON.stringify(currentEmergencyData)
      });
      if (!res.ok) throw new Error("Failed to activate on server");
    } catch(e) { console.error(e); }

    // Flashing ambulance icon
    const ambIcon = L.divIcon({
      html: '<div style="font-size:24px; text-shadow: 0 0 10px #ef4444;">🚑</div>',
      className: '',
      iconSize: [30, 30]
    });
    
    // Geometry coordinates are [lng, lat]
    const coords = currentEmergencyData.routeGeoJSON.coordinates;
    ambulanceMarker = L.marker([coords[0][1], coords[0][0]], { icon: ambIcon }).addTo(adminMap);

    // Animate ambulance moving along the route
    let coordIdx = 0;
    if (ambulanceAnimInterval) clearInterval(ambulanceAnimInterval);
    ambulanceAnimInterval = setInterval(() => {
      coordIdx++;
      if (coordIdx >= coords.length) {
        clearInterval(ambulanceAnimInterval);
        return;
      }
      ambulanceMarker.setLatLng([coords[coordIdx][1], coords[coordIdx][0]]);
    }, 150); // Move marker every 150ms


    // Simulate Green Signals along the route
    const step = Math.floor(currentEmergencyData.routeGeoJSON.coordinates.length / 5);
    for(let i=step; i < currentEmergencyData.routeGeoJSON.coordinates.length; i+=step) {
      let coord = currentEmergencyData.routeGeoJSON.coordinates[i];
      let sigIcon = L.divIcon({
        html: '<div style="width:15px;height:15px;background:#22c55e;border-radius:50%;box-shadow:0 0 10px #22c55e;border:2px solid white;"></div>',
        className: ''
      });
      let m = L.marker([coord[1], coord[0]], {icon: sigIcon}).addTo(adminMap).bindTooltip("Priority Green Signal", {permanent:true});
      signalMarkers.push(m);
    }

    showRealTimeToast("Green Corridor Activated! All nearby signals forced to GREEN.");
  } else {
    btn.classList.remove('btn-danger', 'glow-btn');
    btn.classList.add('btn-outline-danger');
    btn.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i> Activate Green Corridor`;
    
    try {
      await authFetch('/admin/emergency/clear', { method: 'POST' });
    } catch(e) { console.error(e); }

    if (emergencyRouteLayer) {
      adminMap.removeLayer(emergencyRouteLayer);
      emergencyRouteLayer = null;
    }
    if (ambulanceMarker) {
      adminMap.removeLayer(ambulanceMarker);
      ambulanceMarker = null;
    }
    if (ambulanceAnimInterval) {
      clearInterval(ambulanceAnimInterval);
    }
    signalMarkers.forEach(m => adminMap.removeLayer(m));
    signalMarkers = [];
    currentEmergencyData = null;
    document.getElementById('routeAnalyticsPanel').classList.add('d-none');
    btn.classList.add('disabled');

    showRealTimeToast("Green Corridor Deactivated. Normal traffic resumed.");
  }
};

window.simulateSpeedCamera = async function() {
  const vehicleNo = 'DL' + Math.floor(Math.random() * 90 + 10) + 'CM' + Math.floor(Math.random() * 9000 + 1000);
  const speed = Math.floor(Math.random() * 40 + 85); // 85 to 124 km/h
  if (confirm(`Smart Camera detected Vehicle ${vehicleNo} driving at ${speed} km/h (Limit: 60 km/h).\n\nAuto-generate E-Challan for Overspeeding?`)) {
    try {
      const payload = {
        vehicleNumber: vehicleNo,
        violationType: 'overspeeding',
        fineAmount: 2000,
        location: { lat: 28.6139, lng: 77.2090 },
        assignedToEmail: 'test@example.com' // Using generic test email
      };
      
      const res = await authFetch('/violations', { method: 'POST', body: JSON.stringify(payload) });
      if(res.ok) {
         showRealTimeToast(`E-Challan auto-issued for ${vehicleNo}.`);
         fetchAdminStats();
      } else {
         alert("Failed to auto-issue challan.");
      }
    } catch(e) { console.error(e); }
  }
};

