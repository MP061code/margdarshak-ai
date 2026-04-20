// ------------------------------------------------
// RBAC SECURITY ENFORCEMENT
// ------------------------------------------------
const token = localStorage.getItem('token');
const userRole = localStorage.getItem('role');

// Strict check: if no token OR not admin, eject.
if (!token || userRole !== 'admin') {
  window.location.href = '../login.html';
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
    if(acc.severity === 'medium') badgeClass = 'text-bg-warning';
    if(acc.severity === 'high') badgeClass = 'text-bg-danger';

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
    if(acc.severity === 'medium') color = '#eab308'; // yellow
    if(acc.severity === 'high') color = '#ef4444'; // red

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

function updateAdminUI() {
  renderAdminTable();
  renderAdminMarkers();
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
window.deleteAccident = async function(id) {
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
const socket = io('http://localhost:5000'); 

socket.on('newAccident', (newAcc) => {
  // Intercept real-time broadcast and inject to top of local state
  accidentsData.unshift(newAcc);
  updateAdminUI();
  fetchAdminStats(); // Refresh stats from socket trigger
});

// BootSequence
fetchAdminStats();
fetchAccidentsData();
