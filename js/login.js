/*
  School of Character (SoC) - Pojok Hope
  REAL AUTHENTICATION CONTROLLER (js/login.js)
*/

async function handleLogin(e) {
  e.preventDefault();

  const usernameInput = document.getElementById('login-username');
  const passwordInput = document.getElementById('login-password');
  const errorMsg = document.getElementById('error-msg');
  const spinner  = document.getElementById('login-spinner');
  const btnText  = document.getElementById('btn-text');
  const card     = document.getElementById('login-card');

  if (!usernameInput || !passwordInput) return;

  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  // Reset error display
  if (errorMsg) errorMsg.classList.remove('visible');

  // Show loading indicator
  if (spinner) spinner.style.display = 'block';
  if (btnText) btnText.style.display = 'none';

  try {
    const response = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok && data.user) {
      // Store real user session in localStorage
      localStorage.setItem('user', JSON.stringify(data.user));

      const role = data.user.role || 'siswa';
      const studentId = data.user.student_id || '';

      let redirectUrl = `dashboard.html?role=${role}`;
      if (studentId) {
        redirectUrl += `&student_id=${studentId}`;
      }

      // Redirect user to dashboard
      window.location.href = redirectUrl;
    } else {
      throw new Error(data.error || 'Username atau kata sandi salah.');
    }
  } catch (error) {
    if (spinner) spinner.style.display = 'none';
    if (btnText) btnText.style.display = 'flex';

    if (errorMsg) {
      const textSpan = errorMsg.querySelector('span');
      if (textSpan) textSpan.textContent = error.message || 'Gagal terhubung ke server backend (localhost:5000).';
      errorMsg.classList.add('visible');
    }

    if (card) {
      card.style.animation = 'none';
      card.offsetHeight; // Reflow trigger
      card.style.animation = 'shake 0.4s ease';
    }
  }
}

// Make handleLogin available globally for form submission
window.handleLogin = handleLogin;
