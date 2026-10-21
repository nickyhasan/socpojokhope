// =====================================================
// MAIN DASHBOARD ENTRY POINT (js/dashboard.js)
// ES6 Modular Architecture
// =====================================================

// Global Error Boundary
window.onerror = function(msg, url, line) {
  alert('CRASH DETECTED!\nError: ' + msg + '\nBaris: ' + line + '\nFile: ' + url);
};

// Initialize Dark Mode immediately to prevent UI flash
try {
  if (localStorage.getItem('soc_dark_mode') === 'true') {
    document.body.classList.add('dark-mode');
  }
} catch (e) {}

// 1. Module Imports
import {
  loadAllStudents,
  loadAllSchedulesData,
  loadSchedules,
  loadAttendanceHistory,
  loadStudentProgressRates,
  loadClassAssignments,
  loadManagerSchedules,
  loadRaporData,
  markRealAttendance
} from './dashboard/api.js';

import {
  formatStudentDisplayName,
  findStudentByInputValue,
  formatScheduleLabel,
  getSelectedSchedule,
  initializeSemesterUI,
  updateMonthNavUI,
  changeMonth,
  forceRingkasanVisibility,
  switchView,
  applyRole,
  handleLogout,
  formatTeacherName,
  formatClassName,
  getRawClassName
} from './dashboard/ui.js';

import {
  renderSiswaSummary,
  renderJadwalSiswa,
  renderStudentLiveCalendar,
  renderStudentAttendance
} from './dashboard/student.js';

import {
  isTeacherMatch,
  renderGuruSummary,
  renderTeacherAttendanceRoster,
  renderTeacherAttendance,
  renderJadwalKelas,
  handleGuruSubjectToggle,
  applyRaporSubjectFilter,
  renderGuruRaporSelection,
  renderGuruRaporView,
  openIndividualRapor,
  openGuruStudentRapor,
  backToGuruRaporSelection,
  currentGuruSubject
} from './dashboard/teacher.js';

import {
  renderManagerSummary,
  renderTop10Students,
  renderDataSiswaTable,
  renderDataGuruTable,
  toggleDeleteTeacherMode,
  confirmDeleteTeacher,
  exportDataGuru,
  viewDetailGuru,
  openDetailGuru,
  printTeacherIdCard,
  downloadTeacherIdCard,
  copyTeacherCredentials,
  closeTeacherCredentialModal,
  viewRaporFromTable,
  viewDetailSiswa,
  downloadStudentIdCard,
  printStudentIdCard,
  exportDataSiswa,
  downloadStudentTemplateExcel,
  handleBulkStudentExcelUpload,
  downloadTeacherTemplateExcel,
  handleBulkTeacherExcelUpload,
  downloadScheduleTemplateExcel,
  handleBulkScheduleExcelUpload,
  copyStudentCredentials,
  closeStudentCredentialModal,
  populateStudentSelectors,
  updateTeacherAssignmentExclusivity,
  renderManajemenKelas,
  attachKelasListeners,
  resetScheduleForm,
  editSchedule,
  deleteSchedule,
  confirmDeleteStudent
} from './dashboard/manager.js';

// 2. Global State Initialization
let currentRole = 'siswa';
try {
  const initialParams = new URLSearchParams(window.location.search);
  const paramRole = initialParams.get('role');
  if (paramRole && ['guru', 'siswa', 'manager', 'founder', 'admin'].includes(paramRole)) {
    currentRole = paramRole;
  }
} catch (e) {}

window.currentRole = currentRole;
Object.defineProperty(window, 'currentRole', {
  get: () => currentRole,
  set: (v) => { currentRole = v; },
  configurable: true
});

try {
  const roleNameFallback = (currentRole === 'admin') ? 'Administrator' : ((['manager', 'founder'].includes(currentRole)) ? 'Manager Operasional' : 'Simulated User');
  window.currentUser = JSON.parse(localStorage.getItem('user')) || { id: '999', full_name: roleNameFallback, nama: roleNameFallback, role: currentRole || 'guru' };
} catch (e) {
  const roleNameFallback = (currentRole === 'admin') ? 'Administrator' : ((['manager', 'founder'].includes(currentRole)) ? 'Manager Operasional' : 'Simulated User');
  window.currentUser = { id: '999', full_name: roleNameFallback, nama: roleNameFallback, role: currentRole || 'guru' };
}
let loggedInUser = window.currentUser;

window.allStudents = window.allStudents || [];
window.allSchedulesData = window.allSchedulesData || [];
window.selectedStudentKey = window.selectedStudentKey || 1;
window.currentView = window.currentView || 'ringkasan';
window.currentViewMonth = new Date().getMonth() + 1;
window.currentViewYear = new Date().getFullYear();

// 3. Expose Methods to Window (Ensures backward compatibility for inline HTML onclick handlers)
window.forceRingkasanVisibility = forceRingkasanVisibility;
window.switchView = switchView;
window.applyRole = applyRole;
window.handleLogout = handleLogout;
window.formatStudentDisplayName = formatStudentDisplayName;
window.findStudentByInputValue = findStudentByInputValue;
window.formatScheduleLabel = formatScheduleLabel;
window.getSelectedSchedule = getSelectedSchedule;
window.initializeSemesterUI = initializeSemesterUI;
window.updateMonthNavUI = updateMonthNavUI;
window.changeMonth = changeMonth;
window.formatTeacherName = formatTeacherName;
window.formatClassName = formatClassName;
window.getRawClassName = getRawClassName;

window.loadAllStudents = loadAllStudents;
window.loadAllSchedulesData = loadAllSchedulesData;
window.loadSchedules = loadSchedules;
window.loadAttendanceHistory = loadAttendanceHistory;
window.loadStudentProgressRates = loadStudentProgressRates;
window.loadClassAssignments = loadClassAssignments;
window.loadManagerSchedules = loadManagerSchedules;
window.loadRaporData = loadRaporData;
window.markRealAttendance = markRealAttendance;

window.renderSiswaSummary = renderSiswaSummary;
window.renderJadwalSiswa = renderJadwalSiswa;
window.renderStudentLiveCalendar = renderStudentLiveCalendar;
window.renderStudentAttendance = renderStudentAttendance;

window.isTeacherMatch = isTeacherMatch;
window.renderGuruSummary = renderGuruSummary;
window.renderTeacherAttendanceRoster = renderTeacherAttendanceRoster;
window.renderTeacherAttendance = renderTeacherAttendance;
window.renderJadwalKelas = renderJadwalKelas;
window.handleGuruSubjectToggle = handleGuruSubjectToggle;
window.applyRaporSubjectFilter = applyRaporSubjectFilter;
window.renderGuruRaporSelection = renderGuruRaporSelection;
window.renderGuruRaporView = renderGuruRaporView;
window.openIndividualRapor = openIndividualRapor;
window.openGuruStudentRapor = openGuruStudentRapor;
window.backToGuruRaporSelection = backToGuruRaporSelection;

window.renderManagerSummary = renderManagerSummary;
window.renderTop10Students = renderTop10Students;
window.renderDataSiswaTable = renderDataSiswaTable;
window.renderDataGuruTable = renderDataGuruTable;
window.toggleDeleteTeacherMode = toggleDeleteTeacherMode;
window.confirmDeleteTeacher = confirmDeleteTeacher;
window.exportDataGuru = exportDataGuru;
window.viewDetailGuru = viewDetailGuru;
window.openDetailGuru = openDetailGuru;
window.printTeacherIdCard = printTeacherIdCard;
window.downloadTeacherIdCard = downloadTeacherIdCard;
window.copyTeacherCredentials = copyTeacherCredentials;
window.closeTeacherCredentialModal = closeTeacherCredentialModal;
window.viewRaporFromTable = viewRaporFromTable;
window.viewDetailSiswa = viewDetailSiswa;
window.downloadStudentIdCard = downloadStudentIdCard;
window.printStudentIdCard = printStudentIdCard;
window.exportDataSiswa = exportDataSiswa;
window.downloadStudentTemplateExcel = downloadStudentTemplateExcel;
window.handleBulkStudentExcelUpload = handleBulkStudentExcelUpload;
window.downloadTeacherTemplateExcel = downloadTeacherTemplateExcel;
window.handleBulkTeacherExcelUpload = handleBulkTeacherExcelUpload;
window.downloadScheduleTemplateExcel = downloadScheduleTemplateExcel;
window.handleBulkScheduleExcelUpload = handleBulkScheduleExcelUpload;
window.copyStudentCredentials = copyStudentCredentials;
window.closeStudentCredentialModal = closeStudentCredentialModal;
window.populateStudentSelectors = populateStudentSelectors;
window.updateTeacherAssignmentExclusivity = updateTeacherAssignmentExclusivity;
window.renderManajemenKelas = renderManajemenKelas;
window.attachKelasListeners = attachKelasListeners;
window.resetScheduleForm = resetScheduleForm;
window.editSchedule = editSchedule;
window.deleteSchedule = deleteSchedule;
window.confirmDeleteStudent = confirmDeleteStudent;

// 4. Combined Dashboard Data Loader
export async function loadDashboardData() {
  const role = window.currentRole;
  if (role === 'siswa') {
    await renderSiswaSummary();
  } else if (role === 'guru') {
    await renderGuruSummary();
  } else if (['manager', 'founder', 'admin'].includes(role)) {
    await renderManagerSummary();
  }
}
window.loadDashboardData = loadDashboardData;

// 5. Global SPA Hash Routing Listener
window.addEventListener('hashchange', function() {
  const viewId = window.location.hash.replace('#', '') || 'ringkasan';
  switchView(viewId);
});

// 6. DOM Ready & Event Listeners Attachment
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Step 1: Initialize window.currentUser safely from localStorage
    try {
      window.currentUser = JSON.parse(localStorage.getItem('user')) || null;
    } catch (e) {
      window.currentUser = null;
    }

    // Step 2: Extract role from URL and set window.currentRole
    const urlParams = new URLSearchParams(window.location.search);
    const urlRole = urlParams.get('role');

    let currentRole = 'siswa';
    if (urlRole && ['guru', 'siswa', 'manager', 'founder', 'admin'].includes(urlRole)) {
      currentRole = urlRole;
    } else if (window.currentUser && window.currentUser.role) {
      currentRole = window.currentUser.role;
    }
    window.currentRole = currentRole;

    if (urlRole && ['guru', 'siswa', 'manager', 'founder', 'admin'].includes(urlRole)) {
      if (urlRole === 'admin') {
        window.currentUser = { id: 'admin', username: 'admin', full_name: 'Administrator', nama: 'Administrator', role: 'admin' };
      } else if (urlRole === 'manager') {
        window.currentUser = { id: 'manager', username: 'manager', full_name: 'Manager Operasional', nama: 'Manager Operasional', role: 'manager' };
      } else if (urlRole === 'founder') {
        window.currentUser = { id: 'founder', username: 'founder', full_name: 'Founder / Owner', nama: 'Founder / Owner', role: 'founder' };
      } else if (urlRole === 'guru') {
        if (!window.currentUser || window.currentUser.role !== 'guru') {
          window.currentUser = { id: '999', full_name: 'Guru Pengajar', nama: 'Guru Pengajar', role: 'guru' };
        }
      } else {
        if (!window.currentUser || window.currentUser.role !== 'siswa') {
          window.currentUser = { id: '1', full_name: 'Muhammad Raffa', nama: 'Muhammad Raffa', nickname: 'Raffa', role: 'siswa' };
        }
      }
    }

    if (!window.currentUser) {
      const fallbackName = (currentRole === 'admin') ? 'Administrator' : ((['manager', 'founder'].includes(currentRole)) ? 'Manager Operasional' : 'Simulated User');
      window.currentUser = { id: '999', full_name: fallbackName, nama: fallbackName, role: currentRole || 'guru' };
    }
    loggedInUser = window.currentUser;

    if (window.currentUser && window.currentUser.student_id) {
      window.selectedStudentKey = window.currentUser.student_id;
    }

    // Force ringkasan visibility immediately on DOM load
    window.forceRingkasanVisibility(currentRole);

    // Step 3: Call applyRole(window.currentRole)
    applyRole(currentRole);

    // Step 4: Fire the hash routing logic (switchView)
    const initialView = window.location.hash.replace('#', '') || 'ringkasan';
    switchView(initialView);

    // Update dynamic class header text for attendance view
    const absensiClassTitle = document.getElementById('absensi-class-title');
    if (absensiClassTitle) {
      absensiClassTitle.innerHTML = `<i class="fas fa-users text-teal"></i> Daftar Siswa`;
    }

    // Initial Data Loading from Backend (Safe & Resilient)
    try { initializeSemesterUI(); } catch (e) { console.warn('initializeSemesterUI error:', e); }
    try { await loadAllStudents(); } catch (e) { console.warn('loadAllStudents error:', e); }
    try { await loadAllSchedulesData(); } catch (e) { console.warn('loadAllSchedulesData error:', e); }
    try { populateStudentSelectors(); } catch (e) { console.warn('populateStudentSelectors error:', e); }
    try { await loadSchedules(); } catch (e) { console.warn('loadSchedules error:', e); }
    try { renderTeacherAttendanceRoster(); } catch (e) { console.warn('renderTeacherAttendanceRoster error:', e); }
    try { loadAttendanceHistory(); } catch (e) { console.warn('loadAttendanceHistory error:', e); }
    try { renderStudentLiveCalendar(); } catch (e) { console.warn('renderStudentLiveCalendar error:', e); }
    try { renderJadwalKelas(); } catch (e) { console.warn('renderJadwalKelas error:', e); }

  // Schedule selector listener — re-sync roster and active subject display when schedule changes
  const scheduleSelector = document.getElementById('schedule-selector');
  if (scheduleSelector) {
    scheduleSelector.addEventListener('change', () => {
      const active = getSelectedSchedule();
      const subjectDisplay = document.getElementById('active-subject-display');
      if (subjectDisplay && active && active.subject) {
        subjectDisplay.textContent = active.subject;
      }
      renderTeacherAttendanceRoster();
    });
  }

  // Sidebar menu tab switching
  document.querySelectorAll('.sidebar-menu .menu-item[data-view]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.getAttribute('data-view');
      if (window.location.hash === '#' + view) {
        switchView(view);
      } else {
        window.location.hash = view;
      }
    });
  });

  // YouTube-Style Sidebar Toggle (Desktop & Mobile Friendly)
  const dashboardLayout = document.querySelector('.dashboard-layout');
  const sidebar = document.querySelector('.sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle-btn');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');

  // Strict Mobile Clean State: Never load with open drawer or collapsed mini-sidebar on small screens
  if (dashboardLayout) {
    dashboardLayout.classList.remove('sidebar-mobile-open');
    if (window.innerWidth <= 768) {
      dashboardLayout.classList.remove('sidebar-collapsed');
    }
  }

  if (sidebarToggle && dashboardLayout) {
    sidebarToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.innerWidth <= 768) {
        dashboardLayout.classList.remove('sidebar-collapsed');
        dashboardLayout.classList.toggle('sidebar-mobile-open');
      } else {
        dashboardLayout.classList.remove('sidebar-mobile-open');
        dashboardLayout.classList.toggle('sidebar-collapsed');
      }
    });

    if (sidebarBackdrop) {
      sidebarBackdrop.addEventListener('click', () => {
        dashboardLayout.classList.remove('sidebar-mobile-open');
      });
    }

    // Close mobile drawer when clicking ANY menu item in the sidebar (including Beranda Utama)
    document.querySelectorAll('.sidebar .menu-item').forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          dashboardLayout.classList.remove('sidebar-mobile-open');
        }
      });
    });
  }

  // Form Buat Akun Siswa submission handler
  const formAkunSiswa = document.getElementById('form-buat-akun-siswa');
  if (formAkunSiswa) {
    formAkunSiswa.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nama = (document.getElementById('input-siswa-nama')?.value || '').trim();
      const panggilan = (document.getElementById('input-siswa-panggilan')?.value || '').trim();
      const gender = (document.getElementById('input-siswa-gender')?.value || 'Laki-laki').trim();
      const tempatLahir = (document.getElementById('input-siswa-tempat-lahir')?.value || '').trim();
      const tanggalLahir = (document.getElementById('input-siswa-tanggal-lahir')?.value || '').trim();
      const ortu = (document.getElementById('input-siswa-ortu')?.value || '').trim();
      const hpSiswa = (document.getElementById('input-siswa-hp-siswa')?.value || '').trim();
      const hpOrtu = (document.getElementById('input-siswa-hp-ortu')?.value || '').trim();
      const fotoInput = document.getElementById('input-siswa-foto');

      if (!nama) {
        alert('Nama lengkap siswa wajib diisi.');
        return;
      }

      const processCreateStudent = async (photoBase64) => {
        try {
          const res = await fetch('http://localhost:5000/api/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              full_name: nama,
              nickname: panggilan,
              gender: gender,
              birth_place: tempatLahir,
              birth_date: tanggalLahir || null,
              parents_name: ortu,
              student_phone: hpSiswa,
              parent_phone: hpOrtu,
              photo_url: photoBase64 || ''
            })
          });

          const resData = await res.json();
          if (res.ok) {
            const modal = document.getElementById('modal-siswa-credential');
            if (modal) {
              const nisEl = document.getElementById('modal-siswa-cred-nis');
              const pwdEl = document.getElementById('modal-siswa-cred-password');
              const nameEl = document.getElementById('modal-siswa-cred-name');
              if (nisEl) nisEl.textContent = resData.nis || '-';
              if (pwdEl) pwdEl.textContent = resData.password || '-';
              if (nameEl) nameEl.textContent = resData.full_name || nama;
              modal.style.display = 'flex';
            } else {
              alert(`Akun siswa ${nama} berhasil didaftarkan!\nNIS: ${resData.nis}\nPassword: ${resData.password}`);
            }
            formAkunSiswa.reset();
            await loadAllStudents();
            populateStudentSelectors();
            renderDataSiswaTable();
          } else {
            alert(resData.error || 'Gagal mendaftarkan akun siswa.');
          }
        } catch (err) {
          console.error('Error creating student account:', err);
          alert('Terjadi kesalahan saat mendaftarkan akun siswa: ' + err.message);
        }
      };

      if (fotoInput && fotoInput.files && fotoInput.files[0]) {
        const file = fotoInput.files[0];
        if (file.size > 2 * 1024 * 1024) {
          alert('Ukuran foto siswa melebihi batas maksimal 2MB.');
          return;
        }
        const reader = new FileReader();
        reader.onload = function(evt) {
          processCreateStudent(evt.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        processCreateStudent('');
      }
    });
  }

  // Live preview for Edit Siswa profile photo
  const editSiswaFoto = document.getElementById('edit-siswa-foto');
  if (editSiswaFoto) {
    editSiswaFoto.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const prev = document.getElementById('detail-siswa-photo-preview');
          if (prev) prev.src = evt.target.result;
          const cardPrev = document.getElementById('card-student-photo');
          if (cardPrev) cardPrev.src = evt.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Form Edit Detail Siswa submission handler
  const formEditSiswa = document.getElementById('form-edit-detail-siswa');
  if (formEditSiswa) {
    formEditSiswa.addEventListener('submit', async (e) => {
      e.preventDefault();
      const sId = (document.getElementById('edit-siswa-id')?.value || '').trim();
      const nis = (document.getElementById('edit-siswa-nis')?.value || '').trim();
      const pwd = (document.getElementById('edit-siswa-password')?.value || '').trim();
      const nama = (document.getElementById('edit-siswa-nama')?.value || '').trim();
      const panggilan = (document.getElementById('edit-siswa-panggilan')?.value || '').trim();
      const gender = (document.getElementById('edit-siswa-gender')?.value || 'Laki-laki').trim();
      const tempatLahir = (document.getElementById('edit-siswa-tempat-lahir')?.value || '').trim();
      const tanggalLahir = (document.getElementById('edit-siswa-tanggal-lahir')?.value || '').trim();
      const ortu = (document.getElementById('edit-siswa-ortu')?.value || '').trim();
      const hpSiswa = (document.getElementById('edit-siswa-hp-siswa')?.value || '').trim();
      const hpOrtu = (document.getElementById('edit-siswa-hp-ortu')?.value || '').trim();
      const engClass = (document.getElementById('edit-siswa-kelas-eng')?.value || '').trim();
      const mathClass = (document.getElementById('edit-siswa-kelas-math')?.value || '').trim();
      const fotoInput = document.getElementById('edit-siswa-foto');

      if (!sId) {
        alert('ID siswa tidak valid.');
        return;
      }
      if (!nama) {
        alert('Nama lengkap siswa wajib diisi.');
        return;
      }

      const processEditStudent = async (photoBase64) => {
        try {
          const payload = {
            nis: nis,
            password: pwd,
            full_name: nama,
            nickname: panggilan,
            gender: gender,
            birth_place: tempatLahir,
            birth_date: tanggalLahir || null,
            parents_name: ortu,
            student_phone: hpSiswa,
            parent_phone: hpOrtu,
            kelas_english: engClass,
            kelas_math: mathClass
          };
          if (photoBase64) payload.photo_url = photoBase64;

          const res = await fetch(`http://localhost:5000/api/students/${sId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (res.ok) {
            alert('Perubahan data siswa berhasil disimpan!');
            await loadAllStudents();
            renderDataSiswaTable();
            viewDetailSiswa(sId);
          } else {
            const errData = await res.json().catch(() => ({}));
            alert(errData.error || 'Gagal menyimpan perubahan siswa.');
          }
        } catch (err) {
          console.error('Error updating student:', err);
          alert('Gagal menyimpan perubahan data siswa: ' + err.message);
        }
      };

      if (fotoInput && fotoInput.files && fotoInput.files[0]) {
        const file = fotoInput.files[0];
        if (file.size > 2 * 1024 * 1024) {
          alert('Ukuran foto siswa melebihi batas maksimal 2MB.');
          return;
        }
        const reader = new FileReader();
        reader.onload = function(evt) {
          processEditStudent(evt.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        processEditStudent(null);
      }
    });
  }

  // Form Buat Akun Guru submission handler
  const formAkunGuru = document.getElementById('form-buat-akun-guru');
  if (formAkunGuru) {
    formAkunGuru.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nama = (document.getElementById('input-guru-nama')?.value || '').trim();
      const panggilan = (document.getElementById('input-guru-panggilan')?.value || '').trim();
      const gender = (document.getElementById('input-guru-gender')?.value || 'Perempuan').trim();
      const kontak = (document.getElementById('input-guru-kontak')?.value || '').trim();
      const email = (document.getElementById('input-guru-email')?.value || '').trim();
      const jurusan = (document.getElementById('input-guru-jurusan')?.value || '').trim();
      const fotoInput = document.getElementById('input-guru-foto');

      if (!nama) {
        alert('Nama lengkap guru wajib diisi.');
        return;
      }

      const submitBtn = document.getElementById('btn-submit-buat-guru');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
      }

      const processCreation = async (photoBase64) => {
        try {
          const res = await fetch('http://localhost:5000/api/teachers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              full_name: nama,
              nickname: panggilan,
              gender: gender,
              contact: kontak,
              email: email,
              jurusan: jurusan,
              photo_url: photoBase64 || '',
              role: 'guru'
            })
          });

          if (res.ok) {
            const resData = await res.json();
            const cred = resData.data || {};
            const modal = document.getElementById('modal-guru-credential');
            if (modal) {
              const credId = document.getElementById('modal-cred-id');
              const credPwd = document.getElementById('modal-cred-password');
              const credName = document.getElementById('modal-cred-name');
              if (credId) credId.textContent = cred.teacher_code || cred.id || '-';
              if (credPwd) credPwd.textContent = cred.password_display || cred.password || '-';
              if (credName) credName.textContent = cred.full_name || nama;
              modal.style.display = 'flex';
            } else {
              alert(`Akun guru ${nama} berhasil didaftarkan!\nID Guru: ${cred.teacher_code || cred.id}\nPassword: ${cred.password_display || cred.password}`);
            }
            formAkunGuru.reset();
            if (typeof window.renderDataGuruTable === 'function') window.renderDataGuruTable();
            if (typeof window.loadClassAssignments === 'function') window.loadClassAssignments();
          } else {
            const errData = await res.json().catch(() => ({}));
            alert(errData.error || 'Gagal mendaftarkan akun guru.');
          }
        } catch (err) {
          console.error('Error creating teacher account:', err);
          alert('Gagal mendaftarkan akun guru: ' + err.message);
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-chalkboard-teacher"></i> Buat Akun Guru';
          }
        }
      };

      if (fotoInput && fotoInput.files && fotoInput.files[0]) {
        const file = fotoInput.files[0];
        if (file.size > 2 * 1024 * 1024) {
          alert('Ukuran foto melebihi batas maksimal 2MB.');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-chalkboard-teacher"></i> Buat Akun Guru';
          }
          return;
        }
        const reader = new FileReader();
        reader.onload = function(evt) {
          processCreation(evt.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        processCreation('');
      }
    });
  }

  // Live preview for Edit Guru profile photo
  const editGuruFoto = document.getElementById('edit-guru-foto');
  if (editGuruFoto) {
    editGuruFoto.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const prev = document.getElementById('detail-guru-photo-preview');
          if (prev) prev.src = evt.target.result;
          const cardPrev = document.getElementById('card-teacher-photo');
          if (cardPrev) cardPrev.src = evt.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Form Edit Detail Guru submission handler
  const formEditGuru = document.getElementById('form-edit-detail-guru');
  if (formEditGuru) {
    formEditGuru.addEventListener('submit', async (e) => {
      e.preventDefault();
      const origId = (document.getElementById('edit-guru-original-id')?.value || '').trim();
      const newId = (document.getElementById('edit-guru-id')?.value || '').trim();
      const pwd = (document.getElementById('edit-guru-password')?.value || '').trim();
      const nama = (document.getElementById('edit-guru-nama')?.value || '').trim();
      const panggilan = (document.getElementById('edit-guru-panggilan')?.value || '').trim();
      const gender = (document.getElementById('edit-guru-gender')?.value || 'Perempuan').trim();
      const kontak = (document.getElementById('edit-guru-kontak')?.value || '').trim();
      const email = (document.getElementById('edit-guru-email')?.value || '').trim();
      const jurusan = (document.getElementById('edit-guru-jurusan')?.value || '').trim();
      const fotoInput = document.getElementById('edit-guru-foto');

      if (!origId) {
        alert('ID guru tidak valid.');
        return;
      }
      if (!nama) {
        alert('Nama lengkap pengajar wajib diisi.');
        return;
      }

      const processUpdate = async (photoBase64) => {
        try {
          const payload = {
            id: newId || origId,
            teacher_code: newId || origId,
            full_name: nama,
            nickname: panggilan,
            gender: gender,
            contact: kontak,
            email: email,
            jurusan: jurusan,
            password: pwd
          };
          if (photoBase64) payload.photo_url = photoBase64;

          const res = await fetch(`http://localhost:5000/api/teachers/${origId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (res.ok) {
            const resData = await res.json();
            alert('Perubahan data pengajar berhasil disimpan!');
            const updated = resData.data || payload;
            if (typeof window.viewDetailGuru === 'function') {
              window.viewDetailGuru(updated.id || origId);
            }
            if (typeof window.renderDataGuruTable === 'function') window.renderDataGuruTable();
            if (typeof window.loadClassAssignments === 'function') window.loadClassAssignments();
          } else {
            const errData = await res.json().catch(() => ({}));
            alert(errData.error || 'Gagal menyimpan perubahan.');
          }
        } catch (err) {
          console.error('Error updating teacher:', err);
          alert('Gagal menyimpan perubahan data pengajar.');
        }
      };

      if (fotoInput && fotoInput.files && fotoInput.files[0]) {
        const file = fotoInput.files[0];
        if (file.size > 2 * 1024 * 1024) {
          alert('Ukuran foto melebihi batas maksimal 2MB.');
          return;
        }
        const reader = new FileReader();
        reader.onload = function(evt) {
          processUpdate(evt.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        processUpdate(null);
      }
    });
  }

  // Student selectors change handlers
  const studentSelector = document.getElementById('student-selector');
  if (studentSelector) {
    studentSelector.addEventListener('change', (e) => {
      window.selectedStudentKey = parseInt(e.target.value, 10);
      const targetStudent = (window.allStudents || []).find(s => s.id === window.selectedStudentKey);
      const raporSel = document.getElementById('rapor-student-selector');
      if (raporSel && targetStudent) {
        raporSel.value = formatStudentDisplayName(targetStudent);
      }
      const starStudentName = document.getElementById('star-student-name');
      if (starStudentName && targetStudent) {
        starStudentName.textContent = formatStudentDisplayName(targetStudent);
      }
      renderStudentLiveCalendar();
      loadRaporData();
    });
  }

  const raporStudentSelector = document.getElementById('rapor-student-selector');
  if (raporStudentSelector) {
    const handleRaporStudentChange = () => {
      const student = findStudentByInputValue(raporStudentSelector.value);
      if (student) {
        window.selectedStudentKey = student.id;
        if (studentSelector) studentSelector.value = student.id;
        const starStudentName = document.getElementById('star-student-name');
        if (starStudentName) {
          starStudentName.textContent = formatStudentDisplayName(student);
        }
        if (currentRole === 'manager' || currentRole === 'founder' || currentRole === 'admin') {
          const engSel = document.getElementById('plotting-english-level');
          const mathSel = document.getElementById('plotting-math-level');
          if (engSel) engSel.value = student.kelas_english || '';
          if (mathSel) mathSel.value = student.kelas_math || '';
        }
        renderStudentLiveCalendar();
        loadRaporData();
      }
    };
    raporStudentSelector.addEventListener('input', handleRaporStudentChange);
    raporStudentSelector.addEventListener('change', handleRaporStudentChange);
  }

  const btnRaporEng = document.getElementById('btn-rapor-english');
  const btnRaporMath = document.getElementById('btn-rapor-math');
  if (btnRaporEng) {
    btnRaporEng.addEventListener('click', () => {
      handleGuruSubjectToggle('English');
    });
  }
  if (btnRaporMath) {
    btnRaporMath.addEventListener('click', () => {
      handleGuruSubjectToggle('Matematika');
    });
  }

  const raporSubjFilter = document.getElementById('rapor-subject-filter');
  if (raporSubjFilter) {
    raporSubjFilter.addEventListener('change', () => {
      applyRaporSubjectFilter();
    });
  }

  const raporMonthSelector = document.getElementById('rapor-month-selector');
  if (raporMonthSelector) {
    raporMonthSelector.addEventListener('change', () => {
      loadRaporData();
    });
  }

  // Bidirectional synchronization between range slider and manual number input
  document.querySelectorAll('.slider-box').forEach(box => {
    const sl = box.querySelector('input[type="range"]');
    const num = box.querySelector('.score-manual-input');
    if (sl && num) {
      sl.addEventListener('input', () => {
        num.value = sl.value;
      });
      num.addEventListener('input', () => {
        let val = parseInt(num.value, 10);
        if (isNaN(val)) val = 0;
        val = Math.max(0, Math.min(100, val));
        sl.value = val;
      });
      num.addEventListener('change', () => {
        let val = parseInt(num.value, 10);
        if (isNaN(val)) val = 0;
        val = Math.max(0, Math.min(100, val));
        num.value = val;
        sl.value = val;
      });
    }
  });

  // Save scores button (POST /api/evaluations)
  const btnSave = document.getElementById('btn-save-score');
  const saveMsg = document.getElementById('save-status-msg');
  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      const studentId = parseInt(window.selectedStudentKey, 10);
      if (!studentId) {
        alert('Pilih siswa terlebih dahulu.');
        return;
      }
      const monthSel = document.getElementById('rapor-month-selector');
      const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const targetMonth = monthSel ? monthSel.value : (monthNames[new Date().getMonth()] || 'September');
      const currentYear = new Date().getFullYear();

      const payload = {
        student_id: studentId,
        bulan: targetMonth,
        tahun: currentYear,
        score_empathy: parseInt(document.getElementById('slider-empathy')?.value || 50, 10),
        score_honesty: parseInt(document.getElementById('slider-honesty')?.value || 50, 10),
        score_responsibility: parseInt(document.getElementById('slider-responsibility')?.value || 50, 10),
        score_respect: parseInt(document.getElementById('slider-respect')?.value || 50, 10),
        score_fluency: parseInt(document.getElementById('slider-eng-fluency')?.value || 50, 10),
        score_reading: parseInt(document.getElementById('slider-eng-reading')?.value || 50, 10),
        score_logic: parseInt(document.getElementById('slider-math-logic')?.value || 50, 10),
        score_arithmetic: parseInt(document.getElementById('slider-math-arith')?.value || 50, 10),
      };

      try {
        btnSave.disabled = true;
        btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
        const res = await fetch('http://localhost:5000/api/evaluations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        if (saveMsg) {
          saveMsg.classList.remove('hidden');
          setTimeout(() => saveMsg.classList.add('hidden'), 2500);
        }
        await loadRaporData();
      } catch (err) {
        console.error('Error saving scores:', err);
        alert('Gagal menyimpan nilai: ' + err.message);
      } finally {
        btnSave.disabled = false;
        btnSave.innerHTML = '<i class="fas fa-save"></i> Simpan Semua Nilai';
      }
    });
  }

  // Star buttons handlers: +1, -1, Reset, and Save
  const btnStarAdd = document.getElementById('btn-star-add');
  if (btnStarAdd) {
    btnStarAdd.addEventListener('click', () => {
      const starEl = document.getElementById('teacher-star-count');
      if (starEl) {
        let val = parseInt(starEl.textContent, 10) || 0;
        val += 1;
        starEl.textContent = val;
      }
    });
  }

  const btnStarSub = document.getElementById('btn-star-sub');
  if (btnStarSub) {
    btnStarSub.addEventListener('click', () => {
      const starEl = document.getElementById('teacher-star-count');
      if (starEl) {
        let val = parseInt(starEl.textContent, 10) || 0;
        val = Math.max(0, val - 1);
        starEl.textContent = val;
      }
    });
  }

  const btnStarReset = document.getElementById('btn-star-reset');
  if (btnStarReset) {
    btnStarReset.addEventListener('click', async () => {
      const ok = await window.socConfirm("Yakin ingin mereset bintang siswa ini ke 0?", "Reset Bintang");
      if (ok) {
        const starEl = document.getElementById('teacher-star-count');
        if (starEl) starEl.textContent = '0';
        const saveBtn = document.getElementById('btn-save-stars');
        if (saveBtn) saveBtn.click();
      }
    });
  }

  const btnSaveStars = document.getElementById('btn-save-stars');
  if (btnSaveStars) {
    btnSaveStars.addEventListener('click', async () => {
      const studentId = parseInt(window.selectedStudentKey, 10);
      if (!studentId) {
        alert('Pilih siswa terlebih dahulu.');
        return;
      }
      const monthSel = document.getElementById('rapor-month-selector');
      const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const targetMonth = monthSel ? monthSel.value : (monthNames[new Date().getMonth()] || 'September');
      const currentYear = new Date().getFullYear();
      const starsVal = parseInt(document.getElementById('teacher-star-count')?.textContent || 0, 10);

      try {
        btnSaveStars.disabled = true;
        btnSaveStars.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
        const res = await fetch('http://localhost:5000/api/evaluations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: studentId,
            bulan: targetMonth,
            tahun: currentYear,
            stars: starsVal
          })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        alert('Bintang berhasil disimpan!');
        const studentStarCount = document.getElementById('student-star-count');
        if (studentStarCount) studentStarCount.textContent = starsVal;
        await loadRaporData();
      } catch (err) {
        console.error('Error saving stars:', err);
        alert('Gagal menyimpan bintang: ' + err.message);
      } finally {
        btnSaveStars.disabled = false;
        btnSaveStars.innerHTML = '<i class="fas fa-save"></i> Simpan Bintang';
      }
    });
  }

  // Save absensi button — POST each student's attendance for selected Date + Subject
  const btnAbsensi = document.getElementById('btn-save-absensi');
  if (btnAbsensi) {
    btnAbsensi.addEventListener('click', async () => {
      if (window.currentRole === 'guru') {
        alert('Mode Lihat Saja: Guru tidak memiliki izin untuk menyimpan absensi.');
        return;
      }
      const { date: selectedDate, subject: selectedSubject } = getSelectedSchedule();

      const actionRows = document.querySelectorAll('#absensi-dynamic-roster .absensi-actions');
      if (actionRows.length === 0) {
        alert('Tidak ada siswa dalam roster untuk disimpan.');
        return;
      }

      btnAbsensi.disabled = true;
      btnAbsensi.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

      const statusMap = { 'H': 'Hadir', 'S': 'Sakit', 'I': 'Izin', 'A': 'Alpa' };
      const requests = [];

      actionRows.forEach(row => {
        const studentId = row.getAttribute('data-student-id');
        const activeBtn = row.querySelector('.absensi-btn.active');
        if (!activeBtn) return;

        const status = activeBtn.textContent.trim();
        const fullStatus = statusMap[status] || status;

        const req = fetch('http://localhost:5000/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: parseInt(studentId, 10),
            date: selectedDate,
            status: fullStatus,
            mata_pelajaran: selectedSubject
          })
        }).then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        });

        requests.push(req);
      });

      if (requests.length === 0) {
        btnAbsensi.disabled = false;
        btnAbsensi.innerHTML = '<i class="fas fa-check-circle"></i> Simpan Absensi Hari Ini';
        alert('Belum ada status absensi yang dipilih.');
        return;
      }

      try {
        await Promise.all(requests);
        alert(`✓ Absensi berhasil disimpan! ${requests.length} siswa tercatat untuk ${selectedDate} (${selectedSubject}).`);
      } catch (err) {
        console.error('Error saving attendance:', err);
        alert('Sebagian atau seluruh absensi gagal disimpan ke server. Silakan coba lagi.');
      } finally {
        btnAbsensi.disabled = false;
        btnAbsensi.innerHTML = '<i class="fas fa-check-circle"></i> Simpan Absensi Hari Ini';
        loadAttendanceHistory();
        renderStudentLiveCalendar();
      }
    });
  }

  // Broadcast planner
  const btnBroadcast = document.getElementById('btn-broadcast-planner');
  if (btnBroadcast) {
    btnBroadcast.addEventListener('click', () => {
      alert('Siaran berhasil! Notifikasi WhatsApp dikirim to volunteer dan koordinator Outdoor Learning.');
    });
  }

  // Set default date for new schedule form if present
  const newSchedDate = document.getElementById('new-sched-date');
  if (newSchedDate && !newSchedDate.value) {
    newSchedDate.value = new Date().toISOString().split('T')[0];
  }

  // Cancel edit button listener
  const btnCancelEdit = document.getElementById('btn-cancel-edit');
  if (btnCancelEdit) {
    btnCancelEdit.addEventListener('click', (e) => {
      e.preventDefault();
      resetScheduleForm();
    });
  }

  // Create or Update schedule button listener (Manager/Owner)
  const btnCreateSched = document.getElementById('btn-create-sched');
  if (btnCreateSched) {
    btnCreateSched.addEventListener('click', async () => {
      const editIdInput = document.getElementById('edit-schedule-id');
      const dateInput = document.getElementById('new-sched-date');
      const subjectInput = document.getElementById('new-sched-subject');
      const kelasInput = document.getElementById('new-sched-kelas');
      const topicInput = document.getElementById('new-sched-topic');
      const linkInput = document.getElementById('new-sched-link');
      const studentLinkInput = document.getElementById('new-sched-student-link');
      const startTimeInput = document.getElementById('new-sched-start-time');
      const endTimeInput = document.getElementById('new-sched-end-time');
      const lokasiInput = document.getElementById('new-sched-lokasi');
      const catatanInput = document.getElementById('new-sched-catatan');

      const editId = editIdInput ? editIdInput.value : '';
      const isEdit = Boolean(editId);

      const dateVal = dateInput ? dateInput.value : '';
      const subjectVal = subjectInput ? subjectInput.value : '';
      const kelasVal = kelasInput ? kelasInput.value : '';
      const topicVal = topicInput ? topicInput.value.trim() : '';
      const linkVal = linkInput ? linkInput.value.trim() : '';
      const studentLinkVal = studentLinkInput ? studentLinkInput.value.trim() : '';
      const startTimeVal = startTimeInput ? startTimeInput.value.trim() : '14:00';
      const endTimeVal = endTimeInput ? endTimeInput.value.trim() : '15:30';
      const lokasiVal = lokasiInput ? lokasiInput.value.trim() : '';
      const catatanVal = catatanInput ? catatanInput.value.trim() : '';

      if (!dateVal) {
        alert('Harap pilih tanggal jadwal terlebih dahulu.');
        return;
      }
      if (!subjectVal) {
        alert('Harap pilih mata pelajaran.');
        return;
      }
      if (!kelasVal) {
        alert('Harap pilih kelas.');
        return;
      }

      btnCreateSched.disabled = true;
      btnCreateSched.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${isEdit ? 'Memperbarui...' : 'Menyimpan...'}`;

      try {
        const url = isEdit ? `http://localhost:5000/api/schedules/${editId}` : 'http://localhost:5000/api/schedules';
        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: dateVal,
            mata_pelajaran: subjectVal,
            kelas: kelasVal,
            topik: topicVal,
            materi_link: linkVal,
            link_materi_siswa: studentLinkVal,
            start_time: startTimeVal,
            end_time: endTimeVal,
            lokasi: lokasiVal,
            catatan: catatanVal
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${response.status}`);
        }

        alert(isEdit ? 'Jadwal berhasil diperbarui!' : 'Jadwal berhasil ditambahkan!');
        resetScheduleForm();
        await loadManagerSchedules();
        loadSchedules();
        renderJadwalKelas();
        renderManagerSummary();
      } catch (err) {
        console.error('Error saving schedule:', err);
        alert((isEdit ? 'Gagal memperbarui jadwal: ' : 'Gagal menambahkan jadwal: ') + err.message);
      } finally {
        btnCreateSched.disabled = false;
        const currentEditId = editIdInput ? editIdInput.value : '';
        btnCreateSched.innerHTML = currentEditId ? '<i class="fas fa-save"></i> Update Jadwal' : '<i class="fas fa-plus-circle"></i> Buat Jadwal Baru';
      }
    });
  }

  // Month Navigator buttons listener
  document.querySelectorAll('.month-nav-prev').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      changeMonth(-1);
    });
  });
  document.querySelectorAll('.month-nav-next').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      changeMonth(1);
    });
  });
  updateMonthNavUI();

  // Top 10 Class filter listener
  const top10Filter = document.getElementById('top10-class-filter');
  if (top10Filter) {
    top10Filter.addEventListener('change', () => {
      renderTop10Students();
    });
  }

  // Manager Class Selector listener for Rapor
  const managerClassSel = document.getElementById('rapor-manager-class-selector');
  if (managerClassSel) {
    managerClassSel.addEventListener('change', () => {
      const selectedClass = managerClassSel.value;
      const raporBadge = document.getElementById('rapor-class-badge');
      if (raporBadge) raporBadge.textContent = 'Kelas ' + selectedClass;
    });
  }

  // Data Siswa Search Input listener
  const searchDataSiswa = document.getElementById('search-data-siswa');
  if (searchDataSiswa) {
    searchDataSiswa.addEventListener('input', () => {
      renderDataSiswaTable();
    });
  }

  // Data Guru Search Input listener
  const searchDataGuru = document.getElementById('search-data-guru');
  if (searchDataGuru) {
    searchDataGuru.addEventListener('input', () => {
      renderDataGuruTable();
    });
  }

  // =====================================================
  // PUSAT PENGATURAN SOC MODAL & TABS MANAGEMENT (Admin Only)
  // =====================================================
  let currentSponsors = [];

  function updateRegStatusLabel(id, isOpen) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = isOpen ? 'Status: Dibuka' : 'Status: Ditutup Sementara';
      el.style.color = isOpen ? 'var(--accent-green, #4CAF50)' : '#e53e3e';
    }
  }

  function renderAdminSponsorList() {
    const container = document.getElementById('admin-sponsor-list');
    if (!container) return;
    if (!currentSponsors || currentSponsors.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem; font-style:italic; padding:0.5rem 0;">Belum ada mitra/sponsor terdaftar.</p>';
      return;
    }
    container.innerHTML = currentSponsors.map((s, idx) => `
      <div class="sponsor-admin-card" style="display:flex; align-items:center; justify-content:space-between; padding:0.75rem 1rem; background:var(--bg-card); border:1px solid var(--border-color); border-radius:8px;">
        <div style="display:flex; align-items:center; gap:0.75rem;">
          <div style="width:34px; height:34px; border-radius:6px; background:var(--accent-orange-tint); color:var(--accent-orange); display:flex; align-items:center; justify-content:center; font-size:1rem;">
            <i class="${s.icon || 'fas fa-handshake'}"></i>
          </div>
          <div>
            <strong style="font-size:0.9rem; color:var(--color-secondary-dark); display:block;">${s.name || 'Mitra SoC'}</strong>
            <a href="${s.url || '#'}" target="_blank" rel="noopener noreferrer" style="font-size:0.78rem; color:var(--color-secondary); text-decoration:none;">
              ${s.url || '-'} <i class="fas fa-external-link-alt" style="font-size:0.7rem;"></i>
            </a>
          </div>
        </div>
        <button type="button" class="btn btn-outline btn-sm btn-delete-sponsor" data-index="${idx}" style="color:#e53e3e; border-color:#e53e3e; padding:0.25rem 0.65rem; font-size:0.8rem;">
          <i class="fas fa-trash"></i> Hapus
        </button>
      </div>
    `).join('');

    container.querySelectorAll('.btn-delete-sponsor').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        if (isNaN(idx)) return;
        const confirmed = typeof window.socConfirm === 'function'
          ? await window.socConfirm('Apakah Anda yakin ingin menghapus mitra/sponsor ini?', 'Hapus Mitra / Sponsor', 'Hapus', 'Batal')
          : true;
        if (confirmed) {
          currentSponsors.splice(idx, 1);
          await saveAdminSponsors();
        }
      });
    });
  }

  async function saveAdminSponsors() {
    try {
      const res = await fetch('http://localhost:5000/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sponsors_json: currentSponsors })
      });
      if (res.ok) {
        renderAdminSponsorList();
        if (typeof window.showSoCModal === 'function') {
          window.showSoCModal('Daftar mitra & sponsor berhasil diperbarui dan disinkronkan ke Landing Page!', 'success', 'Berhasil');
        }
      } else {
        const err = await res.json().catch(() => ({}));
        if (typeof window.showSoCModal === 'function') {
          window.showSoCModal(err.error || 'Gagal menyimpan mitra/sponsor.', 'error', 'Gagal');
        }
      }
    } catch (e) {
      if (typeof window.showSoCModal === 'function') {
        window.showSoCModal('Gagal menyimpan mitra: ' + e.message, 'error', 'Error');
      }
    }
  }

  async function loadAdminSettingsModal() {
    try {
      const res = await fetch('http://localhost:5000/api/settings');
      if (!res.ok) return;
      const data = await res.json();

      // Tab 1: Lokasi & Jam
      const alamatInput = document.getElementById('input-setting-alamat');
      const jamInput = document.getElementById('input-setting-jam');
      if (alamatInput && data.alamat_soc) alamatInput.value = data.alamat_soc;
      if (jamInput && data.jam_operasional) jamInput.value = data.jam_operasional;

      // Tab 2: Mitra & Sponsor
      if (data.sponsors_json) {
        try {
          currentSponsors = typeof data.sponsors_json === 'string' ? JSON.parse(data.sponsors_json) : (data.sponsors_json || []);
        } catch (e) {
          currentSponsors = [];
        }
      }
      renderAdminSponsorList();

      // Tab 3: Kontrol Pendaftaran
      const regSiswaOpen = (data.reg_siswa_open === true || data.reg_siswa_open === 'true' || data.reg_siswa_open === 1 || data.reg_siswa_open === '1');
      const switchSiswa = document.getElementById('switch-reg-siswa');
      if (switchSiswa) {
        switchSiswa.checked = regSiswaOpen;
        updateRegStatusLabel('label-reg-siswa-status', regSiswaOpen);
      }
      const inputSiswaUrl = document.getElementById('input-reg-siswa-url');
      if (inputSiswaUrl && data.reg_siswa_url) inputSiswaUrl.value = data.reg_siswa_url;

      const regGuruOpen = (data.reg_guru_open === true || data.reg_guru_open === 'true' || data.reg_guru_open === 1 || data.reg_guru_open === '1');
      const switchGuru = document.getElementById('switch-reg-guru');
      if (switchGuru) {
        switchGuru.checked = regGuruOpen;
        updateRegStatusLabel('label-reg-guru-status', regGuruOpen);
      }
      const inputGuruUrl = document.getElementById('input-reg-guru-url');
      if (inputGuruUrl && data.reg_guru_url) inputGuruUrl.value = data.reg_guru_url;

      const regVolunteerOpen = (data.reg_volunteer_open === true || data.reg_volunteer_open === 'true' || data.reg_volunteer_open === 1 || data.reg_volunteer_open === '1');
      const switchVolunteer = document.getElementById('switch-reg-volunteer');
      if (switchVolunteer) {
        switchVolunteer.checked = regVolunteerOpen;
        updateRegStatusLabel('label-reg-volunteer-status', regVolunteerOpen);
      }
      const inputVolunteerUrl = document.getElementById('input-reg-volunteer-url');
      if (inputVolunteerUrl && data.reg_volunteer_url) inputVolunteerUrl.value = data.reg_volunteer_url;

      // Tab 4: Mode Tampilan
      const switchDarkMode = document.getElementById('switch-dark-mode');
      if (switchDarkMode) {
        switchDarkMode.checked = localStorage.getItem('soc_dark_mode') === 'true';
      }
    } catch (e) {
      console.warn('Gagal memuat pengaturan sistem:', e);
    }
  }

  // Role-Based Settings Tabs Display
  function applySettingsTabsForRole() {
    const role = (window.currentRole || 'admin').toLowerCase();
    const canManageAll = ['admin', 'founder', 'manager'].includes(role);

    const tabLokasi = document.querySelector('.settings-tab-btn[data-tab="tab-settings-lokasi"]');
    const tabMitra = document.querySelector('.settings-tab-btn[data-tab="tab-settings-mitra"]');
    const tabPendaftaran = document.querySelector('.settings-tab-btn[data-tab="tab-settings-pendaftaran"]');
    const tabTampilan = document.querySelector('.settings-tab-btn[data-tab="tab-settings-tampilan"]');

    if (!canManageAll) {
      // Guru & Siswa: Hide management tabs, show ONLY Mode Tampilan (Dark Mode)
      if (tabLokasi) tabLokasi.style.display = 'none';
      if (tabMitra) tabMitra.style.display = 'none';
      if (tabPendaftaran) tabPendaftaran.style.display = 'none';
      if (tabTampilan) {
        tabTampilan.style.display = 'inline-flex';
        tabTampilan.click();
      }
    } else {
      // Admin, Founder, Manager: Show all 4 tabs
      if (tabLokasi) tabLokasi.style.display = 'inline-flex';
      if (tabMitra) tabMitra.style.display = 'inline-flex';
      if (tabPendaftaran) tabPendaftaran.style.display = 'inline-flex';
      if (tabTampilan) tabTampilan.style.display = 'inline-flex';
      if (tabLokasi) tabLokasi.click();
    }
  }

  // Admin Location Settings Modal & Form listeners
  const btnHeaderAdminSettings = document.getElementById('btn-header-admin-settings');
  const modalAdminSettings = document.getElementById('modal-admin-settings');
  const btnCloseAdminSettings = document.getElementById('btn-close-admin-settings');

  if (btnHeaderAdminSettings && modalAdminSettings) {
    btnHeaderAdminSettings.addEventListener('click', (e) => {
      e.preventDefault();
      modalAdminSettings.style.display = 'flex';
      applySettingsTabsForRole();
      loadAdminSettingsModal();
    });
  }

  if (btnCloseAdminSettings && modalAdminSettings) {
    btnCloseAdminSettings.addEventListener('click', () => {
      modalAdminSettings.style.display = 'none';
    });
  }

  if (modalAdminSettings) {
    modalAdminSettings.addEventListener('click', (e) => {
      if (e.target === modalAdminSettings) {
        modalAdminSettings.style.display = 'none';
      }
    });
  }

  // Settings Tab Navigation
  const settingsTabBtns = document.querySelectorAll('.settings-tab-btn');
  settingsTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTabId = btn.getAttribute('data-tab');
      settingsTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.settings-tab-content').forEach(content => {
        if (content.id === targetTabId) {
          content.style.display = 'block';
          content.classList.add('active');
        } else {
          content.style.display = 'none';
          content.classList.remove('active');
        }
      });
    });
  });

  // Preset Icon Picker for Mitra & Sponsor
  document.querySelectorAll('#sponsor-icon-picker .btn-icon-preset').forEach(preset => {
    preset.addEventListener('click', () => {
      document.querySelectorAll('#sponsor-icon-picker .btn-icon-preset').forEach(p => p.classList.remove('active'));
      preset.classList.add('active');
      const iconClass = preset.getAttribute('data-icon');
      const iconInput = document.getElementById('input-sponsor-icon');
      if (iconInput) iconInput.value = iconClass;
    });
  });

  const sponsorIconInput = document.getElementById('input-sponsor-icon');
  if (sponsorIconInput) {
    sponsorIconInput.addEventListener('input', () => {
      const val = sponsorIconInput.value.trim();
      document.querySelectorAll('#sponsor-icon-picker .btn-icon-preset').forEach(p => {
        if (p.getAttribute('data-icon') === val) {
          p.classList.add('active');
        } else {
          p.classList.remove('active');
        }
      });
    });
  }

  // Tab 1: Form Lokasi & Jam Operasional
  const formAdminSettings = document.getElementById('form-admin-settings');
  if (formAdminSettings) {
    formAdminSettings.addEventListener('submit', async (e) => {
      e.preventDefault();
      const alamat = (document.getElementById('input-setting-alamat')?.value || '').trim();
      const jam = (document.getElementById('input-setting-jam')?.value || '').trim();
      const saveBtn = document.getElementById('btn-save-settings');

      if (!alamat || !jam) {
        if (typeof window.showSoCModal === 'function') {
          window.showSoCModal('Alamat dan jam operasional tidak boleh kosong.', 'warning', 'Peringatan');
        } else {
          alert('Alamat dan jam operasional tidak boleh kosong.');
        }
        return;
      }

      try {
        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
        }

        const res = await fetch('http://localhost:5000/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alamat_soc: alamat,
            jam_operasional: jam
          })
        });

        if (res.ok) {
          if (typeof window.showSoCModal === 'function') {
            window.showSoCModal('Pengaturan lokasi & jam operasional berhasil disimpan dan disinkronkan ke Landing Page!', 'success', 'Berhasil');
          } else {
            alert('Pengaturan lokasi & jam operasional berhasil disimpan!');
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          if (typeof window.showSoCModal === 'function') {
            window.showSoCModal(errData.error || 'Gagal menyimpan pengaturan lokasi.', 'error', 'Gagal');
          } else {
            alert(errData.error || 'Gagal menyimpan pengaturan lokasi.');
          }
        }
      } catch (err) {
        console.error('Error saving site settings:', err);
        if (typeof window.showSoCModal === 'function') {
          window.showSoCModal('Terjadi kesalahan saat menyimpan pengaturan: ' + err.message, 'error', 'Error');
        } else {
          alert('Terjadi kesalahan saat menyimpan pengaturan: ' + err.message);
        }
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = '<i class="fas fa-save"></i> Simpan Lokasi &amp; Jam';
        }
      }
    });
  }

  // Tab 2: Add Sponsor Form
  const formAddSponsor = document.getElementById('form-add-sponsor');
  if (formAddSponsor) {
    formAddSponsor.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = (document.getElementById('input-sponsor-name')?.value || '').trim();
      const url = (document.getElementById('input-sponsor-url')?.value || '').trim();
      const icon = (document.getElementById('input-sponsor-icon')?.value || '').trim() || 'fas fa-hand-holding-heart';

      if (!name || !url) {
        if (typeof window.showSoCModal === 'function') {
          window.showSoCModal('Nama dan Link URL mitra wajib diisi.', 'warning', 'Peringatan');
        }
        return;
      }

      currentSponsors.push({ name, url, icon });
      await saveAdminSponsors();
      formAddSponsor.reset();
      const iconInput = document.getElementById('input-sponsor-icon');
      if (iconInput) iconInput.value = 'fas fa-hand-holding-heart';
      document.querySelectorAll('#sponsor-icon-picker .btn-icon-preset').forEach(p => {
        p.classList.toggle('active', p.getAttribute('data-icon') === 'fas fa-hand-holding-heart');
      });
    });
  }

  // Tab 3: Registration Switch and Form
  document.getElementById('switch-reg-siswa')?.addEventListener('change', (e) => {
    updateRegStatusLabel('label-reg-siswa-status', e.target.checked);
  });
  document.getElementById('switch-reg-guru')?.addEventListener('change', (e) => {
    updateRegStatusLabel('label-reg-guru-status', e.target.checked);
  });
  document.getElementById('switch-reg-volunteer')?.addEventListener('change', (e) => {
    updateRegStatusLabel('label-reg-volunteer-status', e.target.checked);
  });

  const formRegSettings = document.getElementById('form-reg-settings');
  if (formRegSettings) {
    formRegSettings.addEventListener('submit', async (e) => {
      e.preventDefault();
      const regSiswaOpen = document.getElementById('switch-reg-siswa')?.checked ?? true;
      const regSiswaUrl = (document.getElementById('input-reg-siswa-url')?.value || '').trim();
      const regGuruOpen = document.getElementById('switch-reg-guru')?.checked ?? true;
      const regGuruUrl = (document.getElementById('input-reg-guru-url')?.value || '').trim();
      const regVolunteerOpen = document.getElementById('switch-reg-volunteer')?.checked ?? true;
      const regVolunteerUrl = (document.getElementById('input-reg-volunteer-url')?.value || '').trim();

      const saveBtn = document.getElementById('btn-save-reg-settings');
      try {
        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
        }
        const res = await fetch('http://localhost:5000/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reg_siswa_open: regSiswaOpen,
            reg_siswa_url: regSiswaUrl,
            reg_guru_open: regGuruOpen,
            reg_guru_url: regGuruUrl,
            reg_volunteer_open: regVolunteerOpen,
            reg_volunteer_url: regVolunteerUrl
          })
        });
        if (res.ok) {
          if (typeof window.showSoCModal === 'function') {
            window.showSoCModal('Pengaturan kontrol pendaftaran berhasil disimpan dan disinkronkan ke Landing Page!', 'success', 'Berhasil');
          }
        } else {
          const err = await res.json().catch(() => ({}));
          if (typeof window.showSoCModal === 'function') {
            window.showSoCModal(err.error || 'Gagal menyimpan kontrol pendaftaran.', 'error', 'Gagal');
          }
        }
      } catch (err) {
        if (typeof window.showSoCModal === 'function') {
          window.showSoCModal('Terjadi kesalahan: ' + err.message, 'error', 'Error');
        }
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = '<i class="fas fa-save"></i> Simpan Kontrol Pendaftaran';
        }
      }
    });
  }

  // Tab 4: Dark Mode Toggle
  const switchDarkMode = document.getElementById('switch-dark-mode');
  if (switchDarkMode) {
    switchDarkMode.addEventListener('change', (e) => {
      const isDark = e.target.checked;
      localStorage.setItem('soc_dark_mode', isDark ? 'true' : 'false');
      document.body.classList.toggle('dark-mode', isDark);
    });
  }

  // Pre-load settings in background
  loadAdminSettingsModal();

  // Attach Manajemen Kelas listeners
  attachKelasListeners();

  // Task 4: Self Profile Photo Live Preview
  const selfPhotoInput = document.getElementById('self-photo-input');
  if (selfPhotoInput) {
    selfPhotoInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const prev = document.getElementById('self-photo-preview');
          if (prev) prev.src = evt.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Task 4: Form Data Diri Saya Submission
  const formDataDiri = document.getElementById('form-data-diri-saya');
  if (formDataDiri) {
    formDataDiri.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = window.currentUser || JSON.parse(localStorage.getItem('currentUser') || '{}');
      const uId = user.id;
      if (!uId) {
        alert('Sesi pengguna tidak valid.');
        return;
      }

      const pwd = (document.getElementById('self-password-input')?.value || '').trim();
      const nama = (document.getElementById('self-fullname-input')?.value || '').trim();
      const panggilan = (document.getElementById('self-nickname-input')?.value || '').trim();
      const gender = (document.getElementById('self-gender-input')?.value || 'Laki-laki').trim();
      const bp = (document.getElementById('self-birthplace-input')?.value || '').trim();
      const bd = (document.getElementById('self-birthdate-input')?.value || '').trim();
      const ortu = (document.getElementById('self-parentname-input')?.value || '').trim();
      const sPhone = (document.getElementById('self-studentphone-input')?.value || '').trim();
      const pPhone = (document.getElementById('self-parentphone-input')?.value || '').trim();
      const contact = (document.getElementById('self-contact-input')?.value || '').trim();
      const email = (document.getElementById('self-email-input')?.value || '').trim();
      const jurusan = (document.getElementById('self-jurusan-input')?.value || '').trim();
      const photoFile = document.getElementById('self-photo-input')?.files?.[0];

      if (!nama) {
        alert('Nama lengkap tidak boleh kosong.');
        return;
      }

      const saveProfile = async (photoBase64) => {
        try {
          const payload = {
            id: uId,
            full_name: nama,
            nickname: panggilan,
            gender: gender,
            birth_place: bp,
            birth_date: bd || null,
            parents_name: ortu,
            student_phone: sPhone,
            parent_phone: pPhone,
            contact: contact || sPhone,
            email: email,
            jurusan: jurusan
          };
          if (pwd) payload.password = pwd;
          if (photoBase64) payload.photo_url = photoBase64;

          const res = await fetch('http://localhost:5000/api/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (res.ok) {
            const resData = await res.json();
            alert('Data diri Anda berhasil diperbarui!');
            
            // Update localStorage and currentUser
            const updatedUser = { ...user, ...resData.user };
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            window.currentUser = updatedUser;

            // Immediately update sidebar avatar & user display name
            const sidebarAvatar = document.getElementById('sidebar-avatar-img');
            if (sidebarAvatar && updatedUser.photo_url) {
              sidebarAvatar.src = updatedUser.photo_url;
            }
            const userDisplayName = document.getElementById('user-display-name');
            if (userDisplayName && updatedUser.full_name) {
              userDisplayName.textContent = updatedUser.full_name;
            }

            // Reload data diri
            loadMyProfileData();
          } else {
            const err = await res.json().catch(() => ({}));
            alert(err.error || 'Gagal menyimpan perubahan data diri.');
          }
        } catch (err) {
          console.error('Error updating profile:', err);
          alert('Terjadi kesalahan saat menyimpan data diri: ' + err.message);
        }
      };

      if (photoFile) {
        const reader = new FileReader();
        reader.onload = () => saveProfile(reader.result);
        reader.onerror = () => {
          alert('Gagal membaca file foto profil.');
          saveProfile('');
        };
        reader.readAsDataURL(photoFile);
      } else {
        saveProfile('');
      }
    });
  }

  } catch (e) {
    alert('Init Error: ' + e.message);
    console.error('Init Error:', e);
  }
});

// ==================== TASK 4: EXPORTED DATA DIRI & MY ID CARD HELPERS ====================
export async function loadMyProfileData() {
  const user = window.currentUser || JSON.parse(localStorage.getItem('currentUser') || '{}');
  if (!user || !user.id) return;

  const role = (user.role || window.currentRole || 'siswa').toLowerCase();
  const roleBadge = document.getElementById('self-role-badge');
  if (roleBadge) {
    if (role === 'founder') roleBadge.textContent = 'Founder / Owner';
    else if (role === 'manager') roleBadge.textContent = 'Manager Operasional';
    else if (role === 'admin') roleBadge.textContent = 'Administrator SoC';
    else if (role === 'guru') roleBadge.textContent = 'Guru / Pengajar';
    else roleBadge.textContent = 'Siswa';
  }

  // Show/hide fields depending on role
  const studentWrapper = document.getElementById('self-student-fields-wrapper');
  const staffWrapper = document.getElementById('self-staff-fields-wrapper');
  if (role === 'siswa') {
    if (studentWrapper) studentWrapper.style.display = 'grid';
    if (staffWrapper) staffWrapper.style.display = 'none';
  } else {
    if (studentWrapper) studentWrapper.style.display = 'none';
    if (staffWrapper) staffWrapper.style.display = 'grid';
  }

  // Populate basic data
  const idInp = document.getElementById('self-id-input');
  const pwdInp = document.getElementById('self-password-input');
  const nameInp = document.getElementById('self-fullname-input');
  const nickInp = document.getElementById('self-nickname-input');
  const genderInp = document.getElementById('self-gender-input');
  const photoPrev = document.getElementById('self-photo-preview');

  if (idInp) idInp.value = user.id || '';
  if (pwdInp) pwdInp.value = '';
  if (nameInp) nameInp.value = user.full_name || '';
  if (nickInp) nickInp.value = user.nickname || '';
  if (genderInp) genderInp.value = (user.gender && user.gender.startsWith('P')) ? 'Perempuan' : 'Laki-laki';

  if (photoPrev) {
    photoPrev.src = user.photo_url || `static/src/assets/profiles/${user.id}.jpg`;
    photoPrev.onerror = () => { photoPrev.src = (role === 'siswa') ? 'static/src/assets/ui/logo.png' : 'static/src/assets/ui/team2.jpg'; };
  }

  // Fetch full profile from GET /api/profile/<id>
  try {
    const res = await fetch(`http://localhost:5000/api/profile/${user.id}`);
    if (res.ok) {
      const data = await res.json();
      if (nameInp && data.full_name) nameInp.value = data.full_name;
      if (nickInp) nickInp.value = data.nickname || '';
      if (genderInp && data.gender) genderInp.value = (data.gender.startsWith('P')) ? 'Perempuan' : 'Laki-laki';
      if (photoPrev && data.photo_url) photoPrev.src = data.photo_url;

      if (role === 'siswa') {
        const bpInp = document.getElementById('self-birthplace-input');
        const bdInp = document.getElementById('self-birthdate-input');
        const ortuInp = document.getElementById('self-parentname-input');
        const sPhoneInp = document.getElementById('self-studentphone-input');
        const pPhoneInp = document.getElementById('self-parentphone-input');
        const engBadge = document.getElementById('self-english-badge');
        const mathBadge = document.getElementById('self-math-badge');

        if (bpInp) bpInp.value = data.birth_place || '';
        if (bdInp) bdInp.value = data.birth_date ? String(data.birth_date).split('T')[0] : '';
        if (ortuInp) ortuInp.value = data.parents_name || '';
        if (sPhoneInp) sPhoneInp.value = data.student_phone || data.contact || '';
        if (pPhoneInp) pPhoneInp.value = data.parent_phone || '';
        if (engBadge) engBadge.textContent = data.kelas_english || 'Belum Ditentukan';
        if (mathBadge) mathBadge.textContent = data.kelas_math || 'Belum Ditentukan';
      } else {
        const contactInp = document.getElementById('self-contact-input');
        const emailInp = document.getElementById('self-email-input');
        const jurInp = document.getElementById('self-jurusan-input');

        if (contactInp) contactInp.value = data.contact || '';
        if (emailInp) emailInp.value = data.email || '';
        if (jurInp) jurInp.value = data.jurusan || '';
      }
    }
  } catch (err) {
    console.warn('Error loading my profile data:', err);
  }
}
window.loadMyProfileData = loadMyProfileData;

export async function renderMyIdCard() {
  const user = window.currentUser || JSON.parse(localStorage.getItem('currentUser') || '{}');
  if (!user || !user.id) return;

  const role = (user.role || window.currentRole || 'siswa').toLowerCase();
  const area = document.getElementById('my-idcard-render-area');
  const subHeading = document.getElementById('my-idcard-subheading');
  const cardPhoto = document.getElementById('my-idcard-photo');
  const cardName = document.getElementById('my-idcard-name');
  const cardBadges = document.getElementById('my-idcard-badges');
  const cardQr = document.getElementById('my-idcard-qr');

  const uId = user.id;
  const uName = user.full_name || 'Pengguna SoC';

  if (cardPhoto) {
    cardPhoto.src = user.photo_url || `static/src/assets/profiles/${user.id}.jpg`;
    cardPhoto.onerror = () => { cardPhoto.src = (role === 'siswa') ? 'static/src/assets/ui/logo.png' : 'static/src/assets/ui/team2.jpg'; };
  }
  if (cardName) cardName.textContent = uName;
  if (cardQr) {
    cardQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(uId)}`;
  }

  // Also try to fetch latest data to make sure badges are up-to-date
  let profileData = user;
  try {
    const res = await fetch(`http://localhost:5000/api/profile/${uId}`);
    if (res.ok) {
      profileData = await res.json();
      if (profileData.photo_url && cardPhoto) cardPhoto.src = profileData.photo_url;
      if (profileData.full_name && cardName) cardName.textContent = profileData.full_name;
    }
  } catch (e) {}

  if (role === 'siswa') {
    if (subHeading) subHeading.textContent = 'POJOK HOPE • KARTU PELAJAR';
    if (area) {
      area.style.background = 'linear-gradient(135deg, #072d3b 0%, #0d202d 100%)';
      area.style.border = '2px solid rgba(32,201,151,0.3)';
    }

    const sEng = profileData.kelas_english && profileData.kelas_english !== 'Belum Ditentukan' ? profileData.kelas_english : '-';
    const sMath = profileData.kelas_math && profileData.kelas_math !== 'Belum Ditentukan' ? profileData.kelas_math : '-';
    const rawG = String(profileData.gender || '').trim().toUpperCase();
    const sGender = rawG.startsWith('P') ? 'P' : 'L';

    if (cardBadges) {
      cardBadges.innerHTML = `
        <span class="badge badge-teal" style="font-family: monospace; font-size: 0.85rem; padding: 0.3rem 0.7rem;">NIS: ${uId}</span>
        <span class="badge badge-teal" style="font-size: 0.82rem; padding: 0.3rem 0.65rem;">English: ${sEng}</span>
        <span class="badge badge-green" style="font-size: 0.82rem; padding: 0.3rem 0.65rem;">Math: ${sMath}</span>
        <span class="badge badge-orange" style="font-size: 0.82rem; padding: 0.3rem 0.65rem;">${sGender}</span>
      `;
    }
  } else {
    // Guru / Pengajar
    if (subHeading) subHeading.textContent = 'POJOK HOPE • KARTU PENGAJAR';
    if (area) {
      area.style.background = 'linear-gradient(135deg, #1b3545 0%, #0d202d 100%)';
      area.style.border = '2px solid rgba(255,107,53,0.3)';
    }

    const jur = profileData.jurusan || 'Pengajar SoC';
    if (cardBadges) {
      cardBadges.innerHTML = `
        <span class="badge badge-teal" style="font-family: monospace; font-size: 0.85rem; padding: 0.3rem 0.7rem;">ID: ${uId}</span>
        <span class="badge badge-green" style="font-size: 0.85rem; padding: 0.3rem 0.7rem;">${jur}</span>
      `;
    }
  }
}
window.renderMyIdCard = renderMyIdCard;

export function printMyIdCard() {
  const cardArea = document.getElementById('my-idcard-render-area');
  if (!cardArea) return;
  const printWin = window.open('', '_blank', 'width=600,height=700');
  if (!printWin) {
    window.print();
    return;
  }
  printWin.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Kartu ID - School of Character Pojok Hope</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
          body { margin: 0; padding: 2.5rem; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f2f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
          .badge { display: inline-block; padding: 0.35rem 0.75rem; border-radius: 50px; font-weight: 700; font-size: 0.8rem; }
          .badge-teal { background: rgba(32, 201, 151, 0.15); color: #20c997; }
          .badge-green { background: rgba(40, 167, 69, 0.15); color: #28a745; }
          .badge-orange { background: rgba(255, 107, 53, 0.15); color: #ff6b35; }
          @media print { body { padding: 0; background: none; } }
        </style>
      </head>
      <body>
        ${cardArea.outerHTML}
        <script>
          window.onload = function() { window.print(); }
        <\/script>
      </body>
    </html>
  `);
  printWin.document.close();
}
window.printMyIdCard = printMyIdCard;

export async function downloadMyIdCard() {
  const cardArea = document.getElementById('my-idcard-render-area');
  if (!cardArea) return;
  const user = window.currentUser || JSON.parse(localStorage.getItem('currentUser') || '{}');
  const code = user.id || 'SoC';

  if (typeof html2canvas === 'function') {
    try {
      const canvas = await html2canvas(cardArea, { scale: 2, useCORS: true, allowTaint: true });
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `Kartu_ID_${code}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.warn('html2canvas failed, falling back to print window:', e);
      printMyIdCard();
    }
  } else {
    printMyIdCard();
  }
}
window.downloadMyIdCard = downloadMyIdCard;
