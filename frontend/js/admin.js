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
    if (acc.severity === 'high') color = '#ef4444'; // red

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

function updateAdminUI() {
  renderAdminTable();
  renderAdminMarkers();
  renderAdminAnalytics();
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

// BootSequence
fetchAdminStats();
fetchAccidentsData();

// ------------------------------------------------
// EMERGENCY CORRIDOR LOGIC
// ------------------------------------------------
let isEmergencyMode = false;
let emergencyRouteLayer = null;

window.toggleEmergencyMode = function() {
  const btn = document.getElementById('emergencyToggleBtn');
  isEmergencyMode = !isEmergencyMode;

  if (isEmergencyMode) {
    btn.classList.remove('btn-outline-danger');
    btn.classList.add('btn-danger');
    btn.innerHTML = `<i class="bi bi-shield-fill-exclamation"></i> Emergency Corridor Active`;
    
    // Simulate a route line between two points near center
    const center = adminMap.getCenter();
    const latlngs = [
      [center.lat - 0.05, center.lng - 0.05],
      [center.lat, center.lng],
      [center.lat + 0.05, center.lng + 0.05]
    ];
    
    emergencyRouteLayer = L.polyline(latlngs, {
      color: 'red',
      weight: 6,
      opacity: 0.8,
      dashArray: '10, 10'
    }).addTo(adminMap);

    adminMap.fitBounds(emergencyRouteLayer.getBounds());
    showRealTimeToast("Emergency Corridor Activated. All signals cleared.");
  } else {
    btn.classList.remove('btn-danger');
    btn.classList.add('btn-outline-danger');
    btn.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i> Activate Emergency Corridor`;
    
    if (emergencyRouteLayer) {
      adminMap.removeLayer(emergencyRouteLayer);
      emergencyRouteLayer = null;
    }
    showRealTimeToast("Emergency Corridor Deactivated. Normal traffic resumed.");
  }
};

