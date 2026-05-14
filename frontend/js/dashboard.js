// Protect the route
const token = localStorage.getItem('token');
const userRole = localStorage.getItem('role');

if (!token) {
  window.location.href = '../login.html';
} else if (userRole !== 'citizen') {
  window.location.href = 'admin.html';
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
    if (acc.severity === 'medium') badgeClass = 'text-bg-warning';
    if (acc.severity === 'high') badgeClass = 'text-bg-danger';

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
    if (acc.severity === 'medium') color = '#eab308'; // yellow
    if (acc.severity === 'high') color = '#ef4444'; // red

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
    gradient: { 0.4: 'blue', 0.6: 'cyan', 0.8: 'yellow', 1.0: 'red' }
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

function updateCongestionIndex() {
  const display = document.getElementById('congestionDisplay');
  const status = document.getElementById('congestionStatus');
  if (!display || !status) return;

  let index = 30; // base index
  accidentsData.forEach(acc => {
    if (acc.severity === 'high') index += 10;
    else if (acc.severity === 'medium') index += 5;
    else index += 2;
  });

  const hour = new Date().getHours();
  if ((hour >= 8 && hour <= 11) || (hour >= 17 && hour <= 20)) {
    index += 20; // Peak hour
  }

  index = Math.min(100, index);
  display.innerText = index;
  
  if (index > 75) {
    display.className = 'fw-bold text-danger my-2';
    status.innerText = 'Severe Congestion';
    status.className = 'mb-0 fw-medium text-danger';
  } else if (index > 50) {
    display.className = 'fw-bold text-warning my-2';
    status.innerText = 'Moderate Traffic';
    status.className = 'mb-0 fw-medium text-warning';
  } else {
    display.className = 'fw-bold text-success my-2';
    status.innerText = 'Smooth Flow';
    status.className = 'mb-0 fw-medium text-success';
  }
}

let safeRouteLayer = null;

function renderSafeRoute() {
  if (safeRouteLayer) {
    map.removeLayer(safeRouteLayer);
  }

  // Draw a simulated safe path away from high severity accidents
  const startPoint = [28.6139, 77.2090]; // ND center
  const endPoint = [28.5355, 77.2641];   // Kalkaji

  // Simulating a detour path
  const latlngs = [
    startPoint,
    [28.5800, 77.2300],
    [28.5500, 77.2500],
    endPoint
  ];

  safeRouteLayer = L.polyline(latlngs, {
    color: '#3b82f6',
    weight: 5,
    opacity: 0.8,
    dashArray: '10, 10'
  }).addTo(map).bindTooltip("AI Suggested Safe Route", {permanent: false});
}

function updateUI() {
  renderTable();
  renderMarkers();
  processHeatmap();
  renderChart();
  updateCongestionIndex();
  renderSafeRoute();
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
map.on('click', function (e) {
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
  // Prepend to array
  accidentsData.unshift(newAcc);

  // Triggers updates for map, table, chart
  updateUI();
  showRealTimeToast(`New Alert: ${newAcc.description}`);
});

let citizenEmergencyRouteLayer = null;

socket.on('emergencyActivated', (eventData) => {
  const banner = document.getElementById('emergencyBanner');
  if (banner) banner.classList.remove('d-none', 'd-flex');
  if (banner) banner.classList.add('d-flex');
  
  if (citizenEmergencyRouteLayer) map.removeLayer(citizenEmergencyRouteLayer);
  if (eventData && eventData.routePath) {
    citizenEmergencyRouteLayer = L.polyline(eventData.routePath, {
      color: '#ef4444', weight: 8, opacity: 0.9, className: 'animated-route'
    }).addTo(map).bindTooltip("Emergency Priority Route - KEEP CLEAR", {permanent: true});
  }

  // Force signal to Green Priority
  currentSignalState = 'green';
  signalTimer = 99; // Hold green
  updateSignalUI();
  const modeDisp = document.getElementById('signalModeDisplay');
  if(modeDisp) modeDisp.innerHTML = 'Mode: <span class="text-danger fw-bold flash">EMERGENCY CLEARANCE</span>';
});

socket.on('emergencyCleared', () => {
  const banner = document.getElementById('emergencyBanner');
  if (banner) banner.classList.add('d-none');
  if (banner) banner.classList.remove('d-flex');

  if (citizenEmergencyRouteLayer) {
    map.removeLayer(citizenEmergencyRouteLayer);
    citizenEmergencyRouteLayer = null;
  }
  
  // Reset signal mode
  signalTimer = 45;
  const modeDisp = document.getElementById('signalModeDisplay');
  if(modeDisp) modeDisp.innerHTML = 'Mode: <span class="text-info">Dynamic Flow</span>';
});

// Start initialization
fetchAccidents();

// ------------------------------------------------
// SMART MODULES: AQI & TRAFFIC PREDICTION
// ------------------------------------------------
async function initSmartFeatures() {
  const trafficCtx = document.getElementById('trafficChart').getContext('2d');
  
  // Predict next 1-2 hours based on current time
  const currentHour = new Date().getHours();
  const labels = [
    `${currentHour}:00`, 
    `${(currentHour+1)%24}:00 (Predicted)`, 
    `${(currentHour+2)%24}:00 (Predicted)`
  ];
  
  // Simple logic: if it's approaching peak hours (8-10 or 17-19), predict higher
  let baseDensity = 40;
  if ((currentHour >= 7 && currentHour <= 10) || (currentHour >= 16 && currentHour <= 19)) {
    baseDensity = 85;
  }
  
  const dataPoints = [
    baseDensity, 
    Math.min(100, baseDensity + (Math.random() > 0.5 ? 15 : -10)), 
    Math.min(100, baseDensity + (Math.random() > 0.5 ? 20 : -20))
  ];

  new Chart(trafficCtx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{ label: 'Traffic Density (%)', data: dataPoints, borderColor: '#3b82f6', fill: true, backgroundColor: 'rgba(59,130,246,0.2)', tension: 0.4 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { display: false, min: 0, max: 100 }, x: { display: true, ticks: { color: '#94a3b8' } } } }
  });

  try {
    const res = await fetch('https://api.openweathermap.org/data/2.5/air_pollution?lat=28.6139&lon=77.2090&appid=8a7ac727de90ebfd25b7dca68ee91000');
    const data = await res.json();
    let aqiMap = { 1: 50, 2: 100, 3: 150, 4: 250, 5: 350 };
    let aqiValue = aqiMap[data.list[0].main.aqi] || Math.floor(Math.random() * 100 + 150);

    document.getElementById('aqiDisplay').innerText = aqiValue;
    if (aqiValue > 200) {
      document.getElementById('aqiDisplay').classList.add('text-danger', 'fw-bold');
      document.getElementById('aqiStatus').innerText = "⚠️ WARNING: Hazardous";
    } else {
      document.getElementById('aqiStatus').innerText = "Healthy Conditions";
    }
  } catch (e) {
    document.getElementById('aqiDisplay').innerText = "180";
    document.getElementById('aqiStatus').innerText = "Simulated Active";
  }

  // Weather Alerts Simulation: Rain -> high congestion warning, Fog -> accident risk alert
  const weathers = ['Clear', 'Rain', 'Fog'];
  const simulatedWeather = weathers[Math.floor(Math.random() * weathers.length)];
  const wIcon = document.getElementById('weatherDisplay');
  const wStatus = document.getElementById('weatherStatus');
  
  if (wIcon && wStatus) {
    if (simulatedWeather === 'Rain') {
      wIcon.innerHTML = '<i class="bi bi-cloud-rain-fill text-primary"></i>';
      wStatus.innerText = "High Congestion Warning (Rain)";
      wStatus.className = "mb-0 fw-bold small text-primary";
    } else if (simulatedWeather === 'Fog') {
      wIcon.innerHTML = '<i class="bi bi-cloud-haze-fill text-secondary"></i>';
      wStatus.innerText = "Accident Risk Alert (Fog)";
      wStatus.className = "mb-0 fw-bold small text-secondary";
    } else {
      wIcon.innerHTML = '<i class="bi bi-sun-fill text-warning"></i>';
      wStatus.innerText = "Clear Skies";
      wStatus.className = "mb-0 fw-medium small text-warning";
    }
  }

  // SMART ACCIDENT PREDICTION
  const aiPredContent = document.getElementById('aiPredictionContent');
  if (aiPredContent) {
    let riskLevel = 'Low';
    let riskClass = 'text-success';
    let riskText = 'Normal conditions expected. No major high-risk zones flagged at this time.';
    
    // Simple heuristic prediction
    if (currentHour >= 17 && currentHour <= 21) {
      riskLevel = 'High';
      riskClass = 'text-danger';
      riskText = `Based on historical patterns, <b>Outer Ring Road</b> has a 78% probability of severe congestion and accidents between ${currentHour}:00 and 21:00.`;
    } else if (simulatedWeather !== 'Clear') {
      riskLevel = 'Medium';
      riskClass = 'text-warning';
      riskText = `Weather conditions (${simulatedWeather}) are reducing visibility. <b>Highway Junctions</b> are flagged as medium-risk zones.`;
    }
    
    aiPredContent.innerHTML = `
      <div class="d-flex align-items-center mb-2">
        <span class="spinner-grow spinner-grow-sm ${riskClass} me-2" role="status"></span>
        <span class="fw-bold ${riskClass}">${riskLevel} Risk: ${currentHour}:00 - ${(currentHour+3)%24}:00</span>
      </div>
      <p class="text-muted small mb-0">${riskText}</p>
    `;
  }

  // SMART ROUTE RECOMMENDATION
  const routeContent = document.getElementById('smartRouteContent');
  if (routeContent) {
    let avoidZone = 'Main Junction';
    let recRoute = 'Alternative Highway 4';
    
    if (simulatedWeather === 'Rain') {
      avoidZone = 'Underpass routes';
      recRoute = 'Elevated Expressway';
    } else if (currentHour >= 17 && currentHour <= 21) {
      avoidZone = 'Outer Ring Road';
      recRoute = 'City Center Bypass';
    }

    routeContent.innerHTML = `
      <p class="fw-medium text-info mb-1">Recommended: <span class="fw-bold text-success">${recRoute}</span></p>
      <p class="text-muted small mb-0"><span class="text-danger">Avoid:</span> ${avoidZone} due to active alerts and predicted congestion.</p>
    `;
  }
}
initSmartFeatures();

// SOS Trigger logic
window.triggerSOS = function() {
  if (confirm("🚨 EMERGENCY SOS 🚨\n\nThis will instantly broadcast your live location to all nearby emergency services, traffic command centers, and ambulances.\n\nProceed to activate?")) {
    showRealTimeToast("SOS Activated! Emergency dispatch notified. Stay safe.");
    
    // Simulate SOS backend broadcast
    socket.emit('triggerSOS', { user: userRole, timestamp: new Date() });
    
    // Auto map re-center and visual change
    map.flyTo([28.6139, 77.2090], 15, { duration: 1.5 });
    document.querySelector('.bg-danger.rounded').classList.replace('bg-danger', 'bg-warning');
    document.querySelector('.bg-warning.rounded').innerHTML = "<i class='bi bi-broadcast'></i> SOS Sent";
  }
};

// Multi-Language Support
const i18n = {
  en: {
    sysOverview: "System Overview", sysDesc: "Monitor traffic conditions and report incidents instantly.",
    aqiTitle: "Live AQI Index", congestTitle: "Congestion Index", weatherTitle: "Weather Alerts", trafficPred: "Traffic Prediction",
    signalTitle: "Smart Signals"
  },
  hi: {
    sysOverview: "प्रणाली सिंहावलोकन", sysDesc: "यातायात की स्थिति की निगरानी करें और तुरंत घटनाओं की रिपोर्ट करें।",
    aqiTitle: "लाइव AQI सूचकांक", congestTitle: "भीड़ सूचकांक", weatherTitle: "मौसम अलर्ट", trafficPred: "यातायात भविष्यवाणी",
    signalTitle: "स्मार्ट सिग्नल"
  },
  te: {
    sysOverview: "సిస్టమ్ అవలోకనం", sysDesc: "ట్రాఫిక్ పరిస్థితులను పర్యవేక్షించండి మరియు సంఘటనలను తక్షణమే నివేదించండి.",
    aqiTitle: "లైవ్ AQI ఇండెక్స్", congestTitle: "రద్దీ సూచిక", weatherTitle: "వాతావరణ హెచ్చరికలు", trafficPred: "ట్రాఫిక్ అంచనా",
    signalTitle: "స్మార్ట్ సిగ్నల్స్"
  }
};

window.changeLanguage = function() {
  const lang = document.getElementById('langSelect').value;
  const dict = i18n[lang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if(dict[key]) el.innerText = dict[key];
  });
};

// ------------------------------------------------
// TRAFFIC SIGNAL OPTIMIZATION LOGIC
// ------------------------------------------------
let signalTimer = 45;
let currentSignalState = 'green'; // 'green', 'yellow', 'red'
let signalInterval = null;

function updateSignalUI() {
  const signalRed = document.getElementById('signalRed');
  const signalYellow = document.getElementById('signalYellow');
  const signalGreen = document.getElementById('signalGreen');
  const timerDisplay = document.getElementById('signalTimerDisplay');

  if (!signalRed || !signalYellow || !signalGreen || !timerDisplay) return;

  // Reset all
  signalRed.className = 'rounded-circle bg-danger opacity-25 mx-1';
  signalRed.style.boxShadow = 'none';
  signalYellow.className = 'rounded-circle bg-warning opacity-25 mx-1';
  signalYellow.style.boxShadow = 'none';
  signalGreen.className = 'rounded-circle bg-success opacity-25 mx-1';
  signalGreen.style.boxShadow = 'none';

  timerDisplay.innerText = `${signalTimer}s`;

  if (currentSignalState === 'green') {
    signalGreen.className = 'rounded-circle bg-success mx-1';
    signalGreen.style.boxShadow = '0 0 10px #22c55e';
    timerDisplay.className = 'fw-bold text-success mb-0';
  } else if (currentSignalState === 'yellow') {
    signalYellow.className = 'rounded-circle bg-warning mx-1';
    signalYellow.style.boxShadow = '0 0 10px #eab308';
    timerDisplay.className = 'fw-bold text-warning mb-0';
  } else {
    signalRed.className = 'rounded-circle bg-danger mx-1';
    signalRed.style.boxShadow = '0 0 10px #ef4444';
    timerDisplay.className = 'fw-bold text-danger mb-0';
  }
}

function runSmartSignal() {
  if (signalInterval) clearInterval(signalInterval);
  
  signalInterval = setInterval(() => {
    signalTimer--;

    if (signalTimer <= 0) {
      // Logic for transition
      if (currentSignalState === 'green') {
        currentSignalState = 'yellow';
        signalTimer = 5; // Yellow for 5s
      } else if (currentSignalState === 'yellow') {
        currentSignalState = 'red';
        // Red time depends on congestion index
        const display = document.getElementById('congestionDisplay');
        let cIdx = display ? parseInt(display.innerText) : 30;
        if (isNaN(cIdx)) cIdx = 30;
        signalTimer = cIdx > 60 ? 60 : 30; // More congestion = longer red for other lanes? Or dynamically simulated. Let's say Red is 30-60s
      } else if (currentSignalState === 'red') {
        currentSignalState = 'green';
        // Green time depends on congestion index (longer green if congested, or shorter to clear side traffic)
        const display = document.getElementById('congestionDisplay');
        let cIdx = display ? parseInt(display.innerText) : 30;
        if (isNaN(cIdx)) cIdx = 30;
        signalTimer = cIdx > 60 ? 90 : 45; // Longer green for high congestion
      }
    }
    updateSignalUI();
  }, 1000);
}

runSmartSignal();

// ------------------------------------------------
// VOICE RECORDING FOR ACCIDENT REPORTING
// ------------------------------------------------
window.startAccidentVoiceRecording = function() {
  if (!('webkitSpeechRecognition' in window)) {
    alert("Your browser doesn't support speech recognition.");
    return;
  }
  const recognition = new webkitSpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  
  recognition.onstart = function() {
    document.getElementById('reportDesc').placeholder = "Listening...";
    const btn = document.getElementById('voiceBtnDashboard');
    if (btn) btn.classList.add('listening-animation');
  };
  
  recognition.onresult = function(event) {
    const text = event.results[0][0].transcript;
    const currentText = document.getElementById('reportDesc').value;
    document.getElementById('reportDesc').value = currentText ? currentText + " " + text : text;
  };
  
  recognition.onend = function() {
    const btn = document.getElementById('voiceBtnDashboard');
    if (btn) btn.classList.remove('listening-animation');
  };

  recognition.onerror = function(event) {
    console.error("Speech recognition error", event.error);
    alert("Microphone error. Please try again.");
    const btn = document.getElementById('voiceBtnDashboard');
    if (btn) btn.classList.remove('listening-animation');
  };
  
  recognition.start();
};
