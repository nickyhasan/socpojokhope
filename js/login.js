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
      // Only append &student_id= when role is strictly 'siswa' (never for staff)
      if (role === 'siswa' && studentId) {
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

// ==========================================
// FORGOT PASSWORD RECOVERY MODAL CONTROLLER
// ==========================================
function initForgotPasswordModal() {
  const modal = document.getElementById('forgot-password-modal');
  const overlay = document.getElementById('forgot-modal-overlay');
  const closeBtn = document.getElementById('forgot-modal-close');
  const forgotLinks = document.querySelectorAll('.forgot-link');
  const btnWa = document.getElementById('btn-forgot-whatsapp');
  const btnEmail = document.getElementById('btn-forgot-email');
  const inputName = document.getElementById('forgot-input-name');
  const inputId = document.getElementById('forgot-input-id');
  const errorMsg = document.getElementById('forgot-error-msg');
  const loginUserInput = document.getElementById('login-username');

  if (!modal) return;

  function openModal(e) {
    if (e) e.preventDefault();
    if (loginUserInput && inputId && loginUserInput.value.trim() && !inputId.value.trim()) {
      inputId.value = loginUserInput.value.trim();
    }
    if (errorMsg) errorMsg.style.display = 'none';
    modal.style.display = 'flex';
    void modal.offsetWidth;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    if (inputName) inputName.focus();
  }

  function closeModal() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    setTimeout(() => {
      if (!modal.classList.contains('active')) {
        modal.style.display = 'none';
      }
    }, 250);
  }

  forgotLinks.forEach(link => {
    link.addEventListener('click', openModal);
  });

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (overlay) overlay.addEventListener('click', closeModal);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });

  function validateInputs() {
    const name = (inputName ? inputName.value : '').trim();
    const id = (inputId ? inputId.value : '').trim();
    if (!name || !id) {
      if (errorMsg) errorMsg.style.display = 'block';
      return null;
    }
    if (errorMsg) errorMsg.style.display = 'none';
    return { name, id };
  }

  if (btnWa) {
    btnWa.addEventListener('click', () => {
      const vals = validateInputs();
      if (!vals) return;
      const message = `Halo Admin/Manager School of Character - Pojok Hope, saya *${vals.name}* dengan NIS/ID/Email *${vals.id}* lupa kata sandi akun portal SoC saya. Mohon bantuannya untuk melakukan reset kata sandi. Terima kasih.`;
      const waUrl = `https://wa.me/6282190029889?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');
      closeModal();
    });
  }

  if (btnEmail) {
    btnEmail.addEventListener('click', () => {
      const vals = validateInputs();
      if (!vals) return;
      const subject = "Permohonan Reset Kata Sandi Akun SoC";
      const body = `Halo Tim School of Character - Pojok Hope,

Saya ingin mengajukan permohonan reset kata sandi akun portal SoC saya dengan rincian sebagai berikut:

- Nama Lengkap: ${vals.name}
- NIS / ID / Email: ${vals.id}

Mohon bantuannya untuk melakukan verifikasi dan pengaturan ulang kata sandi akun saya.

Terima kasih.`;
      const mailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=SchoolofCharacter.Gorontalo@gmail.com&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailUrl, '_blank');
      closeModal();
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initForgotPasswordModal);
} else {
  initForgotPasswordModal();
}
