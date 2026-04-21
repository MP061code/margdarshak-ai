const API_BASE_URL = "https://margdarshak-ai-4rdt.onrender.com/api";

// Utility: Show alerts
function showMessage(elementId, message, isError = false) {
  const alertEl = document.getElementById(elementId);
  if (!alertEl) return;
  alertEl.className = `alert ${isError ? 'alert-danger' : 'alert-success'} mb-3`;
  alertEl.innerText = message;
  alertEl.classList.remove('d-none');
}

// LOGIN LOGIC
function handleLogin(formId, expectedRole) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const originalBtnText = btn.innerText;
    btn.disabled = true;
    btn.innerText = 'Authenticating...';

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Check role authorization
      if (expectedRole === 'citizen' && data.role === 'admin') {
        throw new Error('Admins must login through the Admin Portal');
      }
      
      if (expectedRole === 'admin' && data.role !== 'admin') {
        throw new Error('Only administrators can access this portal');
      }

      // Store JWT token to localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('role', data.role);

      showMessage('loginAlert', 'Login successful! Redirecting...', false);

      // Redirect based on role
      setTimeout(() => {
        if (data.role === 'admin') {
          window.location.href = 'pages/admin.html';
        } else {
          window.location.href = 'pages/dashboard.html';
        }
      }, 1000);

    } catch (error) {
      showMessage('loginAlert', error.message, true);
      btn.disabled = false;
      btn.innerText = originalBtnText;
    }
  });
}

handleLogin('loginForm', 'citizen');
handleLogin('adminLoginForm', 'admin');

// REGISTER LOGIC
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('registerBtn');
    btn.disabled = true;
    btn.innerText = 'Registering...';

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      showMessage('registerAlert', 'Registration successful! Redirecting to login...', false);

      setTimeout(() => {
        window.location.href = '/login.html';
      }, 1500);

    } catch (error) {
      showMessage('registerAlert', error.message, true);
      btn.disabled = false;
      btn.innerText = 'Create Account';
    }
  });
}

// UTILITY: LOGOUT
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('role');
  window.location.href = '../index.html';
}

// UTILITY: PROTECTED API FETCH
// Attaches token to protected API calls easily for other frontend JS files
async function authFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };

  return fetch(`${API_BASE_URL}${url}`, { ...options, headers });
}
