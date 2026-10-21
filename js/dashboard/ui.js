/**
 * js/dashboard/ui.js
 * DOM manipulation, UI formatting, role rendering, and view switching/routing.
 */

const studentNicknames = {
  1: 'Raffa',
  2: 'Iksan',
  3: 'Aksan',
  4: 'Aliya',
  5: 'Faith',
  6: 'Afika',
  7: 'Faiqoh',
  8: 'Silva',
  9: 'Nazwa',
  10: 'Zakira'
};

export const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];
export const monthNamesIndo = monthNames;

export const monthShortMap = {
  "Januari": "Jan", "Februari": "Feb", "Maret": "Mar", "April": "Apr", "Mei": "Mei", "Juni": "Jun",
  "Juli": "Jul", "Agustus": "Ags", "September": "Sep", "Oktober": "Okt", "November": "Nov", "Desember": "Des"
};

const d = new Date();
const currentMonthIndex = d.getMonth();
window.activeMonths = currentMonthIndex < 6 
  ? ["Januari", "Februari", "Maret", "April", "Mei", "Juni"]
  : ["Juli", "Agustus", "September", "Oktober", "November", "Desember"];
window.semesterName = currentMonthIndex < 6 ? "Semester Genap" : "Semester Ganjil";
window.currentViewMonth = currentMonthIndex + 1;
window.currentViewYear = d.getFullYear();

export const CLASS_NAME_MAP = {
  'English A': 'English A (Foundation)',
  'English B': 'English B (Beginner)',
  'English C': 'English C (Intermediate)',
  'English D': 'English D (Advanced)',
  'Math A': 'Math A (Dasar Angka)',
  'Math B': 'Math B (Operasi Lanjut)',
  'Math C': 'Math C (Pecahan & Logika)',
  'Math D': 'Math D (Pra-Aljabar & Kritis)'
};
window.CLASS_NAME_MAP = CLASS_NAME_MAP;

export function formatClassName(rawName) {
  if (!rawName) return '';
  const trimmed = String(rawName).trim();
  if (CLASS_NAME_MAP[trimmed]) return CLASS_NAME_MAP[trimmed];

  const upper = trimmed.toUpperCase();
  for (const [k, v] of Object.entries(CLASS_NAME_MAP)) {
    if (k.toUpperCase() === upper) return v;
  }

  if (trimmed.includes('(') && trimmed.includes(')')) {
    return trimmed;
  }

  return trimmed;
}
window.formatClassName = formatClassName;

export function getRawClassName(name) {
  if (!name) return '';
  const trimmed = String(name).trim();
  const lower = trimmed.toLowerCase();

  for (const [raw, formatted] of Object.entries(CLASS_NAME_MAP)) {
    if (raw.toLowerCase() === lower || formatted.toLowerCase() === lower) {
      return raw;
    }
  }

  if (lower.includes('foundation')) return 'English A';
  if (lower.includes('beginner')) return 'English B';
  if (lower.includes('intermediate')) return 'English C';
  if (lower.includes('advanced')) return 'English D';
  if (lower.includes('dasar angka')) return 'Math A';
  if (lower.includes('operasi lanjut') || lower.includes('operasi hitung')) return 'Math B';
  if (lower.includes('pecahan & logika') || lower.includes('pecahan & desimal')) return 'Math C';
  if (lower.includes('pra-aljabar & kritis') || lower.includes('aljabar & geometri')) return 'Math D';

  const match = trimmed.match(/^(English|Math)\s+([A-D])/i);
  if (match) {
    return `${match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase()} ${match[2].toUpperCase()}`;
  }

  return trimmed;
}
window.getRawClassName = getRawClassName;

export function formatTeacherName(user) {
  if (!user) return 'Guru';
  if (typeof user === 'string') {
    const trimmed = user.trim();
    if (/^(Sir|Miss)\s+/i.test(trimmed)) return trimmed;
    return trimmed;
  }

  const role = String(user.role || '').toLowerCase();
  const gender = String(user.gender || user.jenis_kelamin || '').trim().toLowerCase();
  const nick = (user.nickname || user.panggilan || '').trim();
  const full = (user.full_name || user.nama || user.username || '').trim();

  const isMale = gender === 'laki-laki' || gender === 'l' || gender === 'male';
  const isFemale = gender === 'perempuan' || gender === 'p' || gender === 'female';

  if (isMale) {
    const namePart = nick || full.replace(/^Sir\s+/i, '') || 'Guru';
    return `Sir ${namePart}`;
  } else if (isFemale) {
    const namePart = nick || full.replace(/^Miss\s+/i, '') || 'Guru';
    return `Miss ${namePart}`;
  }

  if (/^(Sir|Miss)\s+/i.test(full)) return full;
  if (/^(Sir|Miss)\s+/i.test(nick)) return nick;
  return nick ? `Guru ${nick}` : (full || 'Guru');
}
window.formatTeacherName = formatTeacherName;

export function formatStudentDisplayName(student) {
  if (!student) return '';
  const full = (student.full_name || student.name || '').trim();
  const nick = student.nickname || studentNicknames[student.id];
  if (nick && !full.toLowerCase().includes(`(${nick.toLowerCase()})`)) {
    return `${full} (${nick})`;
  }
  if (!full.includes('(')) {
    const parts = full.split(/\s+/);
    const callName = (parts.length > 1 && ['moh', 'muhammad', 'siti', 'nur'].includes(parts[0].toLowerCase()))
      ? parts[1]
      : parts[0];
    if (callName && callName !== full) {
      return `${full} (${callName})`;
    }
  }
  return full;
}

export function findStudentByInputValue(val) {
  if (!val) return null;
  const cleanVal = String(val).trim().toLowerCase();
  let found = (window.allStudents || []).find(s => formatStudentDisplayName(s).toLowerCase() === cleanVal);
  if (found) return found;
  found = (window.allStudents || []).find(s => (s.full_name || s.name || '').trim().toLowerCase() === cleanVal);
  if (found) return found;
  found = (window.allStudents || []).find(s => String(s.id) === cleanVal);
  if (found) return found;
  found = (window.allStudents || []).find(s => {
    const sName = (s.full_name || s.name || '').trim().toLowerCase();
    return cleanVal.includes(sName) || sName.includes(cleanVal);
  });
  return found || null;
}

export function formatScheduleLabel(dateStr, subject) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parts[2].padStart(2, '0');
      const mIdx = parseInt(parts[1], 10) - 1;
      const month = months[mIdx] || parts[1];
      const year = parts[0];
      return `${day} ${month} ${year} - ${subject}`;
    }
  } catch (e) {}
  return `${dateStr} - ${subject}`;
}

export function getSelectedSchedule() {
  const selector = document.getElementById('schedule-selector');
  if (selector && selector.value) {
    try {
      const parsed = JSON.parse(selector.value);
      if (parsed && parsed.date && parsed.subject) {
        if (!parsed.kelas && window.allSchedulesData) {
          const found = window.allSchedulesData.find(s => (s.date ? s.date.split('T')[0] : '') === parsed.date && ((s.mata_pelajaran || s.subject) === parsed.subject));
          if (found) parsed.kelas = found.kelas;
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Error parsing schedule selector value:', e);
    }
  }
  return { date: '2026-09-19', subject: 'Karakter', kelas: '' };
}

export function initializeSemesterUI() {
  initSemesterSelector();
  applySemesterPeriod(window.activeSemesterKey);
}

export function updateMonthNavUI() {
  const currentViewMonth = window.currentViewMonth || (new Date().getMonth() + 1);
  const currentViewYear = window.currentViewYear || new Date().getFullYear();
  const labelStr = `${monthNamesIndo[currentViewMonth - 1] || ''} ${currentViewYear}`;
  document.querySelectorAll('.month-nav-label').forEach(el => {
    el.textContent = labelStr;
  });
}

export function updateMonthNavLabels() {
  updateMonthNavUI();
}

export function changeMonth(delta) {
  let m = window.currentViewMonth || (new Date().getMonth() + 1);
  let y = window.currentViewYear || new Date().getFullYear();
  m += delta;
  if (m > 12) {
    m = 1;
    y += 1;
  } else if (m < 1) {
    m = 12;
    y -= 1;
  }
  window.currentViewMonth = m;
  window.currentViewYear = y;
  updateMonthNavUI();
  if (typeof window.loadManagerSchedules === 'function') window.loadManagerSchedules();
  if (typeof window.renderJadwalKelas === 'function') window.renderJadwalKelas();
}

export function forceRingkasanVisibility(role) {
  try {
    const targetRole = role || window.currentRole || 'siswa';
    const s = document.getElementById('ringkasan-siswa');
    const g = document.getElementById('ringkasan-guru');
    const m = document.getElementById('ringkasan-manager');
    if (s) s.style.display = 'none';
    if (g) g.style.display = 'none';
    if (m) m.style.display = 'none';

    if (targetRole === 'siswa' && s) s.style.display = 'block';
    else if (targetRole === 'guru' && g) g.style.display = 'block';
    else if (['founder', 'manager', 'admin'].includes(targetRole) && m) m.style.display = 'block';
  } catch(e) { console.error('Visibility Error:', e); }
}

export function switchView(viewId) {
  document.querySelectorAll('.dashboard-view').forEach(el => {
    el.classList.remove('active');
    el.style.display = 'none';
  });

  if (viewId === 'ringkasan') {
    const s = document.getElementById('ringkasan-siswa');
    const g = document.getElementById('ringkasan-guru');
    const m = document.getElementById('ringkasan-manager');
    if (s) s.style.display = (window.currentRole === 'siswa') ? 'block' : 'none';
    if (g) g.style.display = (window.currentRole === 'guru') ? 'block' : 'none';
    if (m) m.style.display = (['founder', 'manager', 'admin'].includes(window.currentRole)) ? 'block' : 'none';
  }

  const targetView = document.getElementById('view-' + viewId);
  if (targetView) {
    targetView.classList.add('active');
    targetView.style.display = 'block';
  }

  document.querySelectorAll('.sidebar-menu .menu-item[data-view]').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-view') === viewId);
  });

  const isStaff = ['guru', 'manager', 'founder', 'admin'].includes(window.currentRole);
  const titles = {
    ringkasan:            'Panel Dashboard',
    'akun-siswa':         'Buat Akun Siswa',
    'akun-guru':          'Buat Akun Guru',
    'data-guru':          'Data Pengajar',
    'manajemen-jadwal':   'Manajemen Jadwal',
    'manajemen-kelas':    'Manajemen Kelas & Penempatan',
    jadwal:               'Jadwal Kelas',
    rapor:                'Rapor Siswa',
    'data-siswa':         'Data Siswa',
    'detail-siswa':       'Detail Siswa',
    'detail-guru':        'Detail Pengajar',
    'data-diri':          'Data Diri Saya',
    'my-idcard':          'Kartu ID Saya',
    kehadiran:            (window.currentRole === 'guru') ? 'Daftar Hadir' : (isStaff ? 'Kelola Absensi' : 'Kehadiran Saya'),
  };
  const titleEl = document.getElementById('header-title-text');
  if (titleEl) titleEl.textContent = titles[viewId] || 'Dashboard';

  window.currentView = viewId;

  if (viewId === 'ringkasan') {
    const v = document.getElementById('view-ringkasan');
    if (v) {
      v.classList.add('active');
      v.style.display = 'block';
    }
    forceRingkasanVisibility(window.currentRole);
    if (typeof window.loadDashboardData === 'function') window.loadDashboardData();

  } else if (viewId === 'akun-siswa' || viewId === 'akun-guru') {
    const v = document.getElementById('view-' + viewId);
    if (v) {
      v.classList.add('active');
      v.style.display = 'block';
    }

  } else if (viewId === 'data-guru') {
    const v = document.getElementById('view-data-guru');
    if (v) {
      v.classList.add('active');
      v.style.display = 'block';
    }
    const btnTambahGuru = document.getElementById('btn-tambah-guru-nav');
    const btnToggleDeleteGuru = document.getElementById('btn-toggle-delete-guru');
    if (btnTambahGuru) btnTambahGuru.style.display = (window.currentRole === 'admin') ? 'inline-flex' : 'none';
    if (btnToggleDeleteGuru) btnToggleDeleteGuru.style.display = (window.currentRole === 'admin') ? 'inline-flex' : 'none';
    if (typeof window.renderDataGuruTable === 'function') window.renderDataGuruTable();

  } else if (viewId === 'detail-guru') {
    const v = document.getElementById('view-detail-guru');
    if (v) {
      v.classList.add('active');
      v.style.display = 'block';
    }

  } else if (viewId === 'manajemen-jadwal') {
    const v = document.getElementById('view-manajemen-jadwal');
    if (v) {
      v.classList.add('active');
      v.style.display = 'block';
    }
    if (typeof window.loadManagerSchedules === 'function') window.loadManagerSchedules();

  } else if (viewId === 'manajemen-kelas') {
    const v = document.getElementById('view-manajemen-kelas');
    if (v) {
      v.classList.add('active');
      v.style.display = 'block';
    }
    if (typeof window.renderManajemenKelas === 'function') {
      window.renderManajemenKelas();
    } else if (typeof window.loadClassAssignments === 'function') {
      window.loadClassAssignments();
    }

  } else if (viewId === 'data-siswa') {
    const v = document.getElementById('view-data-siswa');
    if (v) {
      v.classList.add('active');
      v.style.display = 'block';
    }
    if (typeof window.renderDataSiswaTable === 'function') window.renderDataSiswaTable();

  } else if (viewId === 'detail-siswa') {
    const v = document.getElementById('view-detail-siswa');
    if (v) {
      v.classList.add('active');
      v.style.display = 'block';
    }

  } else if (viewId === 'jadwal') {
    const v = document.getElementById('view-jadwal');
    if (v) {
      v.classList.add('active');
      v.style.display = 'block';
    }
    if (typeof window.renderJadwalKelas === 'function') window.renderJadwalKelas();

  } else if (viewId === 'rapor') {
    if (window.currentRole === 'guru') {
      const legacyRow = document.getElementById('rapor-student-selector-row');
      if (legacyRow) {
        legacyRow.style.setProperty('display', 'none', 'important'); 
      }
    }

    const v = document.getElementById('view-rapor');
    if (v) {
      v.classList.add('active');
      v.style.display = 'block';
    }

    const guruRaporSelectionView = document.getElementById('guru-rapor-selection-view');
    const backBtnContainer = document.getElementById('btn-back-to-guru-list-container');
    const guruSubjectToggles = document.getElementById('guru-subject-toggles');
    const guruNoClassAlert = document.getElementById('guru-no-class-alert');
    const managerPlottingContainer = document.getElementById('manager-plotting-container');
    const row = document.getElementById('rapor-student-selector-row');
    const cardsContainer = document.getElementById('rapor-cards-container');
    const badgeContainer = document.getElementById('rapor-class-badge-container');
    const studentSelectBox = document.getElementById('rapor-student-select-box');

    if (badgeContainer) badgeContainer.style.display = 'none';

    if (window.currentRole === 'founder' || window.currentRole === 'manager' || window.currentRole === 'admin') {
      if (guruRaporSelectionView) guruRaporSelectionView.style.display = 'none';
      if (backBtnContainer) backBtnContainer.style.display = 'none';
      if (guruSubjectToggles) guruSubjectToggles.style.display = 'none';
      if (guruNoClassAlert) guruNoClassAlert.style.display = 'none';
      if (managerPlottingContainer) managerPlottingContainer.style.display = 'block';
      if (row) row.style.display = 'flex';
      if (studentSelectBox) studentSelectBox.style.display = 'none';
      if (cardsContainer) cardsContainer.style.display = 'block';
      if (typeof window.applyRaporSubjectFilter === 'function') window.applyRaporSubjectFilter();
      if (typeof window.loadRaporData === 'function') window.loadRaporData();

      document.querySelectorAll('#view-rapor input[type="range"]').forEach(input => input.disabled = true);
      document.querySelectorAll('#view-rapor input.score-manual-input').forEach(input => input.readOnly = true);
      const starActionButtons = document.getElementById('star-action-buttons');
      if (starActionButtons) starActionButtons.style.display = 'none';
      const btnSaveScore = document.getElementById('btn-save-score');
      if (btnSaveScore) btnSaveScore.style.display = 'none';
    } else if (window.currentRole === 'guru') {
      if (guruSubjectToggles) guruSubjectToggles.style.display = 'none';
      if (guruNoClassAlert) guruNoClassAlert.style.display = 'none';
      if (managerPlottingContainer) managerPlottingContainer.style.display = 'none';
      if (row) row.style.setProperty('display', 'none', 'important');
      if (studentSelectBox) studentSelectBox.style.display = 'none';
      if (guruRaporSelectionView) guruRaporSelectionView.style.display = 'block';

      // By default hide cards until student is picked; renderGuruRaporView / renderGuruRaporSelection determines whether selection-view or no-class-alert is shown
      if (cardsContainer) cardsContainer.style.display = 'none';
      if (backBtnContainer) backBtnContainer.style.display = 'none';
      const indivStudentName = document.getElementById('rapor-individual-student-name');
      if (indivStudentName) indivStudentName.style.display = 'none';

      if (typeof window.renderGuruRaporView === 'function') {
        window.renderGuruRaporView();
      } else if (typeof window.renderGuruRaporSelection === 'function') {
        window.renderGuruRaporSelection();
      }

      document.querySelectorAll('#view-rapor input[type="range"]').forEach(input => input.disabled = false);
      document.querySelectorAll('#view-rapor input.score-manual-input').forEach(input => input.readOnly = false);
      const starActionButtons = document.getElementById('star-action-buttons');
      if (starActionButtons) starActionButtons.style.display = 'inline-flex';
      const btnSaveScore = document.getElementById('btn-save-score');
      if (btnSaveScore) btnSaveScore.style.display = 'inline-block';
    } else {
      if (guruRaporSelectionView) guruRaporSelectionView.style.display = 'none';
      if (backBtnContainer) backBtnContainer.style.display = 'none';
      if (guruSubjectToggles) guruSubjectToggles.style.display = 'none';
      if (guruNoClassAlert) guruNoClassAlert.style.display = 'none';
      if (managerPlottingContainer) managerPlottingContainer.style.display = 'none';
      if (row) row.style.display = 'none';
      if (studentSelectBox) studentSelectBox.style.display = 'none';
      if (cardsContainer) cardsContainer.style.display = 'block';
      document.querySelectorAll('#view-rapor input[type="range"]').forEach(input => input.disabled = true);
      document.querySelectorAll('#view-rapor input.score-manual-input').forEach(input => input.readOnly = true);
      const starActionButtons = document.getElementById('star-action-buttons');
      if (starActionButtons) starActionButtons.style.display = 'none';
      const btnSaveScore = document.getElementById('btn-save-score');
      if (btnSaveScore) btnSaveScore.style.display = 'none';
      if (typeof window.applyRaporSubjectFilter === 'function') window.applyRaporSubjectFilter();
      if (typeof window.loadRaporData === 'function') window.loadRaporData();
    }

    const sStarCard = document.getElementById('student-star-card');
    const tStarCard = document.getElementById('teacher-star-card');
    if (sStarCard) sStarCard.style.display = window.currentRole === 'siswa' ? 'block' : 'none';
    if (tStarCard) tStarCard.style.display = isStaff ? 'block' : 'none';

    const guruInputCard = document.getElementById('rapor-guru-input-card');
    if (guruInputCard) guruInputCard.style.display = window.currentRole === 'guru' ? 'block' : 'none';
  } else if (viewId === 'kehadiran') {
    if (isStaff) {
      const v = document.getElementById('view-kehadiran-guru');
      if (v) {
        v.classList.add('active');
        v.style.display = 'block';
      }
      if (typeof window.renderTeacherAttendanceRoster === 'function') window.renderTeacherAttendanceRoster();
      if (typeof window.loadAttendanceHistory === 'function') window.loadAttendanceHistory();
    } else {
      const v = document.getElementById('view-kehadiran-siswa');
      if (v) {
        v.classList.add('active');
        v.style.display = 'block';
      }
      if (typeof window.renderStudentLiveCalendar === 'function') window.renderStudentLiveCalendar();
    }
  } else if (viewId === 'data-diri') {
    const v = document.getElementById('view-data-diri');
    if (v) {
      v.classList.add('active');
      v.style.display = 'block';
    }
    if (typeof window.loadMyProfileData === 'function') {
      window.loadMyProfileData();
    }
  } else if (viewId === 'my-idcard') {
    const v = document.getElementById('view-my-idcard');
    if (v) {
      v.classList.add('active');
      v.style.display = 'block';
    }
    if (typeof window.renderMyIdCard === 'function') {
      window.renderMyIdCard();
    }
  }
}

export function applyRole(role) {
  try {
    window.currentRole = role;

    forceRingkasanVisibility(role);

    const loggedInUser = window.currentUser || {};

    // Restore Profile Updater: immediately update sidebar profile from window.currentUser
    const userDisplayName = document.getElementById('user-display-name');
    const userDisplayRole = document.getElementById('user-display-role');
    if (userDisplayName) {
      if (role === 'guru') {
        userDisplayName.textContent = formatTeacherName(loggedInUser);
      } else {
        userDisplayName.textContent = loggedInUser.full_name || loggedInUser.nama || (role === 'admin' ? 'Administrator' : (role === 'manager' ? 'Manager Operasional' : (role === 'founder' ? 'Founder / Owner' : 'User')));
      }
    }
    if (userDisplayRole) {
      if (role === 'admin') userDisplayRole.textContent = 'Administrator';
      else if (role === 'manager') userDisplayRole.textContent = 'Manager Operasional';
      else if (role === 'founder') userDisplayRole.textContent = 'Founder / Owner';
      else if (role === 'guru') userDisplayRole.textContent = 'Guru / Pengajar';
      else userDisplayRole.textContent = 'Siswa';
    }

    const sidebarAvatar = document.getElementById('sidebar-avatar-img');
    if (sidebarAvatar) {
      if (role === 'admin' || role === 'manager' || role === 'founder') {
        sidebarAvatar.src = "static/src/assets/ui/logo.png";
      } else if (loggedInUser && loggedInUser.id && loggedInUser.id !== 'admin' && loggedInUser.id !== '999') {
        sidebarAvatar.src = "static/src/assets/profiles/" + loggedInUser.id + ".jpg";
      } else {
        sidebarAvatar.src = "static/src/assets/ui/logo.png";
      }
      sidebarAvatar.onerror = () => {
        sidebarAvatar.src = 'static/src/assets/ui/logo.png';
      };
    }

    const btnHeaderAdminSettings = document.getElementById('btn-header-admin-settings');
    if (btnHeaderAdminSettings) {
      btnHeaderAdminSettings.style.display = 'inline-flex';
    }

    if (role === 'admin') {
      document.getElementById('menu-dashboard')?.style.setProperty('display', 'flex');
      document.getElementById('menu-akun-siswa')?.style.setProperty('display', 'flex');
      document.getElementById('menu-akun-guru')?.style.setProperty('display', 'flex');
      document.getElementById('menu-data-guru')?.style.setProperty('display', 'flex');
      document.getElementById('menu-manajemen-kelas')?.style.setProperty('display', 'flex');

      const menuReport = document.getElementById('menu-report');
      if (menuReport) {
        menuReport.style.display = 'flex';
        menuReport.innerHTML = '<i class="fas fa-users"></i> <span class="menu-label" id="menu-report-label">Data Siswa</span>';
        menuReport.setAttribute('data-view', 'data-siswa');
        menuReport.setAttribute('title', 'Data Siswa');
      }

      document.getElementById('menu-manajemen-jadwal')?.style.setProperty('display', 'flex');
      document.getElementById('menu-schedule')?.style.setProperty('display', 'flex');
      document.getElementById('menu-kehadiran')?.style.setProperty('display', 'flex');

      const kehadiranLabel = document.getElementById('kehadiran-label');
      if (kehadiranLabel) kehadiranLabel.textContent = "Kelola Absensi";

      const userDisplayName = document.getElementById('user-display-name');
      if (userDisplayName) userDisplayName.textContent = (loggedInUser && loggedInUser.full_name && loggedInUser.full_name !== 'Simulated User') ? loggedInUser.full_name : 'Administrator';
      const userDisplayRole = document.getElementById('user-display-role');
      if (userDisplayRole) userDisplayRole.textContent = 'Administrator';

      const managerWelcomeText = document.querySelector('#ringkasan-manager .welcome-text h2') || document.getElementById('manager-welcome-name');
      if (managerWelcomeText) managerWelcomeText.textContent = "Selamat datang, Administrator! 💼";

      document.getElementById('admin-action-bar')?.style.setProperty('display', 'flex');

      try { if (typeof window.loadManagerSchedules === 'function') window.loadManagerSchedules(); } catch(e) {}
      try { if (typeof window.renderManagerSummary === 'function') window.renderManagerSummary(); } catch(e) {}
      try { if (typeof window.loadDashboardData === 'function') window.loadDashboardData(); } catch(e) {}

    } else if (role === 'manager' || role === 'founder') {
      document.getElementById('menu-dashboard')?.style.setProperty('display', 'flex');
      document.getElementById('menu-akun-siswa')?.style.setProperty('display', 'none');
      document.getElementById('menu-akun-guru')?.style.setProperty('display', 'none');
      document.getElementById('menu-data-guru')?.style.setProperty('display', 'flex');
      document.getElementById('menu-manajemen-jadwal')?.style.setProperty('display', 'flex');
      document.getElementById('menu-manajemen-kelas')?.style.setProperty('display', 'flex');
      document.getElementById('menu-schedule')?.style.setProperty('display', 'flex');
      document.getElementById('menu-kehadiran')?.style.setProperty('display', 'flex');

      const kehadiranLabel = document.getElementById('kehadiran-label');
      if (kehadiranLabel) kehadiranLabel.textContent = "Kelola Absensi";

      const menuReport = document.getElementById('menu-report');
      if (menuReport) {
        menuReport.style.display = 'flex';
        menuReport.innerHTML = '<i class="fas fa-users"></i> <span class="menu-label" id="menu-report-label">Data Siswa</span>';
        menuReport.setAttribute('data-view', 'data-siswa');
        menuReport.setAttribute('title', 'Data Siswa');
      }

      const defaultName = role === 'founder' ? 'Founder' : 'Manager';
      const name = (loggedInUser && loggedInUser.full_name && loggedInUser.full_name !== 'Simulated User') ? loggedInUser.full_name : defaultName;
      const userDisplayName = document.getElementById('user-display-name');
      if (userDisplayName) userDisplayName.textContent = name;
      const userDisplayRole = document.getElementById('user-display-role');
      if (userDisplayRole) userDisplayRole.textContent = role === 'founder' ? 'Founder / Owner' : 'Manager Operasional';

      const managerWelcomeText = document.querySelector('#ringkasan-manager .welcome-text h2') || document.getElementById('manager-welcome-name');
      if (managerWelcomeText) managerWelcomeText.textContent = "Selamat datang, " + name + "! 💼";

      document.getElementById('admin-action-bar')?.style.setProperty('display', 'none');

      try { if (typeof window.loadManagerSchedules === 'function') window.loadManagerSchedules(); } catch(e) {}
      try { if (typeof window.renderManagerSummary === 'function') window.renderManagerSummary(); } catch(e) {}
      try { if (typeof window.loadDashboardData === 'function') window.loadDashboardData(); } catch(e) {}

    } else if (role === 'guru') {
      document.getElementById('menu-dashboard')?.style.setProperty('display', 'flex');
      document.getElementById('menu-akun-siswa')?.style.setProperty('display', 'none');
      document.getElementById('menu-akun-guru')?.style.setProperty('display', 'none');
      document.getElementById('menu-data-guru')?.style.setProperty('display', 'none');
      document.getElementById('menu-manajemen-jadwal')?.style.setProperty('display', 'none');
      document.getElementById('menu-manajemen-kelas')?.style.setProperty('display', 'none');
      document.getElementById('menu-schedule')?.style.setProperty('display', 'flex');
      document.getElementById('menu-kehadiran')?.style.setProperty('display', 'flex');

      if (adminSettingsContainer) adminSettingsContainer.style.display = 'none';

      const menuReport = document.getElementById('menu-report');
      if (menuReport) {
        menuReport.style.display = 'flex';
        menuReport.innerHTML = '<i class="fas fa-file-invoice"></i> <span class="menu-label" id="menu-report-label">Rapor Siswa</span>';
        menuReport.setAttribute('data-view', 'rapor');
        menuReport.setAttribute('title', 'Rapor Siswa');
      }

      const teacherWelcomeText = document.querySelector('#ringkasan-guru .welcome-text h2');
      const teacherName = formatTeacherName(loggedInUser);
      const userDisplayName = document.getElementById('user-display-name');
      if (userDisplayName) userDisplayName.textContent = teacherName;
      if (teacherWelcomeText) teacherWelcomeText.textContent = "Selamat datang kembali, " + teacherName + "! 👋";

      const badgeEl = document.getElementById('rapor-class-badge');
      if (badgeEl) badgeEl.textContent = 'Mengelola Kelas';

      const userDisplayRole = document.getElementById('user-display-role');
      if (userDisplayRole) userDisplayRole.textContent = 'Guru / Pengajar';
      const kehadiranLabel = document.getElementById('kehadiran-label');
      if (kehadiranLabel) kehadiranLabel.textContent = "Daftar Hadir";

      document.getElementById('admin-action-bar')?.style.setProperty('display', 'none');

      try { if (typeof window.renderGuruSummary === 'function') window.renderGuruSummary(); } catch(e) {}
      try { if (typeof window.loadDashboardData === 'function') window.loadDashboardData(); } catch(e) {}

    } else {
      // role === 'siswa'
      document.getElementById('menu-dashboard')?.style.setProperty('display', 'flex');
      document.getElementById('menu-akun-siswa')?.style.setProperty('display', 'none');
      document.getElementById('menu-akun-guru')?.style.setProperty('display', 'none');
      document.getElementById('menu-data-guru')?.style.setProperty('display', 'none');
      document.getElementById('menu-manajemen-jadwal')?.style.setProperty('display', 'none');
      document.getElementById('menu-manajemen-kelas')?.style.setProperty('display', 'none');
      document.getElementById('menu-schedule')?.style.setProperty('display', 'flex');
      document.getElementById('menu-kehadiran')?.style.setProperty('display', 'flex');

      if (adminSettingsContainer) adminSettingsContainer.style.display = 'none';

      const menuReport = document.getElementById('menu-report');
      if (menuReport) {
        menuReport.style.display = 'flex';
        menuReport.innerHTML = '<i class="fas fa-file-invoice"></i> <span class="menu-label" id="menu-report-label">Rapor Siswa</span>';
        menuReport.setAttribute('data-view', 'rapor');
        menuReport.setAttribute('title', 'Rapor Siswa');
      }

      const studentWelcomeText = document.querySelector('#ringkasan-siswa .welcome-text h2');
      const studentName = loggedInUser.full_name || loggedInUser.nama || 'Budi Santoso';
      const userDisplayName = document.getElementById('user-display-name');
      if (userDisplayName) userDisplayName.textContent = studentName;
      if (studentWelcomeText) studentWelcomeText.textContent = "Selamat datang kembali, " + studentName + "!";

      const userDisplayRole = document.getElementById('user-display-role');
      if (userDisplayRole) userDisplayRole.textContent = 'Siswa';
      const kehadiranLabel = document.getElementById('kehadiran-label');
      if (kehadiranLabel) kehadiranLabel.textContent = "Kehadiran";

      document.getElementById('admin-action-bar')?.style.setProperty('display', 'none');

      try { if (typeof window.renderSiswaSummary === 'function') window.renderSiswaSummary(); } catch(e) {}
      try { if (typeof window.loadDashboardData === 'function') window.loadDashboardData(); } catch(e) {}
    }

    // Two new sidebar tabs: "Data Diri" (ALL 5 roles) & "ID Card" (Guru & Siswa only)
    const menuDataDiri = document.getElementById('menu-data-diri');
    if (menuDataDiri) menuDataDiri.style.setProperty('display', 'flex');

    const menuMyIdCard = document.getElementById('menu-my-idcard');
    if (menuMyIdCard) {
      if (role === 'guru' || role === 'siswa') {
        menuMyIdCard.style.setProperty('display', 'flex');
      } else {
        menuMyIdCard.style.setProperty('display', 'none');
      }
    }

    document.getElementById('rapor-guru-input-card')?.style.setProperty('display', (role === 'guru') ? 'block' : 'none');


    if (role === 'founder' || role === 'manager' || role === 'admin') {
      document.getElementById('rapor-manager-class-group')?.style.setProperty('display', 'none');
      document.getElementById('rapor-subject-filter-group')?.style.setProperty('display', 'none');
      document.getElementById('guru-subject-toggles')?.style.setProperty('display', 'none');
      document.getElementById('guru-no-class-alert')?.style.setProperty('display', 'none');
      document.getElementById('manager-plotting-container')?.style.setProperty('display', 'block');
      document.getElementById('rapor-student-selector-row')?.style.setProperty('display', 'flex');
      document.getElementById('rapor-student-select-box')?.style.setProperty('display', 'none');
      document.getElementById('rapor-cards-container')?.style.setProperty('display', 'block');
      document.getElementById('star-action-buttons')?.style.setProperty('display', 'none');

      document.querySelectorAll('#view-rapor input[type="range"]').forEach(input => input.disabled = true);
      document.querySelectorAll('#view-rapor input.score-manual-input').forEach(input => input.readOnly = true);
      document.getElementById('btn-save-score')?.style.setProperty('display', 'none');

      try { if (typeof window.populateStudentSelectors === 'function') window.populateStudentSelectors(); } catch(e) {}

      const targetStudent = (window.allStudents || []).find(s => s.id === parseInt(window.selectedStudentKey, 10));
      if (targetStudent) {
        const engSel = document.getElementById('plotting-english-level');
        const mathSel = document.getElementById('plotting-math-level');
        if (engSel) engSel.value = targetStudent.kelas_english || '';
        if (mathSel) mathSel.value = targetStudent.kelas_math || '';
      }
    } else if (role === 'guru') {
      document.getElementById('rapor-manager-class-group')?.style.setProperty('display', 'none');
      document.getElementById('rapor-subject-filter-group')?.style.setProperty('display', 'none');
      document.getElementById('guru-subject-toggles')?.style.setProperty('display', 'none');
      document.getElementById('manager-plotting-container')?.style.setProperty('display', 'none');
      document.getElementById('rapor-student-selector-row')?.style.setProperty('display', 'none');
      document.getElementById('rapor-student-select-box')?.style.setProperty('display', 'none');
      document.getElementById('star-action-buttons')?.style.setProperty('display', 'inline-flex');

      document.querySelectorAll('#view-rapor input[type="range"]').forEach(input => input.disabled = false);
      document.querySelectorAll('#view-rapor input.score-manual-input').forEach(input => input.readOnly = false);
      document.getElementById('btn-save-score')?.style.setProperty('display', 'inline-block');

      try { if (typeof window.populateStudentSelectors === 'function') window.populateStudentSelectors(); } catch(e) {}
      if (typeof window.handleGuruSubjectToggle === 'function') window.handleGuruSubjectToggle(window.currentGuruSubject || 'English');
    } else {
      document.getElementById('rapor-manager-class-group')?.style.setProperty('display', 'none');
      document.getElementById('rapor-subject-filter-group')?.style.setProperty('display', 'none');
      document.getElementById('guru-subject-toggles')?.style.setProperty('display', 'none');
      document.getElementById('guru-no-class-alert')?.style.setProperty('display', 'none');
      document.getElementById('manager-plotting-container')?.style.setProperty('display', 'none');
      document.getElementById('rapor-student-selector-row')?.style.setProperty('display', 'none');
      document.getElementById('rapor-student-select-box')?.style.setProperty('display', 'none');
      document.getElementById('rapor-cards-container')?.style.setProperty('display', 'block');
      document.getElementById('star-action-buttons')?.style.setProperty('display', 'none');

      document.querySelectorAll('#view-rapor input[type="range"]').forEach(input => input.disabled = true);
      document.querySelectorAll('#view-rapor input.score-manual-input').forEach(input => input.readOnly = true);
      document.getElementById('btn-save-score')?.style.setProperty('display', 'none');
    }

    try {
      if (typeof window.populateStudentSelectors === 'function') window.populateStudentSelectors();
      if (typeof window.loadSchedules === 'function') {
        window.loadSchedules().then(() => {
          if (typeof window.renderTeacherAttendanceRoster === 'function') window.renderTeacherAttendanceRoster();
        }).catch(e => console.warn(e));
      }
    } catch(e) {}

    try {
      if (typeof switchView === 'function') switchView(window.currentView || 'ringkasan');
    } catch(e) {}

  } catch (err) {
    console.error('applyRole error:', err);
  }
}

export function handleLogout() {
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

// =====================================================
// DYNAMIC SEMESTER SYSTEM CONFIGURATION & HELPERS
// =====================================================
export const SEMESTER_CONFIG = {
  '1': {
    label: 'Sem. Genap',
    fullMonths: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'],
    shortMonths: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'],
    slotClasses: ['.cell-jul', '.cell-ags', '.cell-sep', '.cell-okt', '.cell-nov', '.cell-des'],
    slotSuffixes: ['jul', 'ags', 'sep', 'okt', 'nov', 'des']
  },
  '2': {
    label: 'Sem. Ganjil',
    fullMonths: ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
    shortMonths: ['Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'],
    slotClasses: ['.cell-jul', '.cell-ags', '.cell-sep', '.cell-okt', '.cell-nov', '.cell-des'],
    slotSuffixes: ['jul', 'ags', 'sep', 'okt', 'nov', 'des']
  }
};
window.SEMESTER_CONFIG = SEMESTER_CONFIG;

export function parseSemesterKey(key) {
  const parts = String(key || '').split('-');
  const year = parseInt(parts[0], 10) || new Date().getFullYear();
  const half = (parts[1] === '1' || parts[1] === '2') ? parts[1] : (new Date().getMonth() < 6 ? '1' : '2');
  return { year, half, config: SEMESTER_CONFIG[half] };
}
window.parseSemesterKey = parseSemesterKey;

export function initSemesterSelector(onChangeCallback) {
  const selector = document.getElementById('rapor-semester-selector');
  if (!selector) return;

  const now = new Date();
  const yr = now.getFullYear();
  const currentHalf = now.getMonth() < 6 ? 1 : 2;
  const currentKey = `${yr}-${currentHalf}`;

  const keys = [
    `${yr - 1}-2`,
    `${yr}-1`,
    `${yr}-2`,
    `${yr + 1}-1`
  ];

  const currentVal = selector.value || currentKey;

  selector.innerHTML = keys.map(k => {
    const [y, h] = k.split('-');
    const label = h === '1' ? `Jan – Jun ${y} (Sem. Genap)` : `Jul – Des ${y} (Sem. Ganjil)`;
    return `<option value="${k}">${label}</option>`;
  }).join('');

  if (keys.includes(currentVal)) {
    selector.value = currentVal;
  } else {
    selector.value = currentKey;
  }

  window.activeSemesterKey = selector.value;

  if (!selector._hasSemesterListener) {
    selector._hasSemesterListener = true;
    selector.addEventListener('change', (e) => {
      window.activeSemesterKey = e.target.value;
      if (typeof window.applySemesterPeriod === 'function') {
        window.applySemesterPeriod(e.target.value);
      }
      if (typeof onChangeCallback === 'function') {
        onChangeCallback(e.target.value);
      }
    });
  }

  return selector.value;
}
window.initSemesterSelector = initSemesterSelector;

export function applySemesterPeriod(semesterKey) {
  const key = semesterKey || window.activeSemesterKey || `${new Date().getFullYear()}-${new Date().getMonth() < 6 ? 1 : 2}`;
  window.activeSemesterKey = key;
  const { year, half, config } = parseSemesterKey(key);

  // 1. Update #th-month-0 through #th-month-5 with shortMonths[0..5]
  for (let i = 0; i < 6; i++) {
    const th = document.getElementById(`th-month-${i}`);
    if (th) th.textContent = config.shortMonths[i];
  }

  // 2. Update #rapor-chart-x-labels with shortMonths
  const chartXLabels = document.getElementById('rapor-chart-x-labels');
  if (chartXLabels) {
    chartXLabels.innerHTML = config.shortMonths.map(m => `<span>${m}</span>`).join('');
  }

  // 3. Update #rapor-semester-badge and #chart-semester-badge
  const semesterNum = (half === '2') ? '1' : '2';
  const periodRange = `${config.shortMonths[0]} — ${config.shortMonths[5]} ${year}`;
  const semesterBadge = document.getElementById('rapor-semester-badge');
  if (semesterBadge) {
    semesterBadge.textContent = `Semester ${semesterNum} (${periodRange})`;
  }
  const chartSemesterBadge = document.getElementById('chart-semester-badge');
  if (chartSemesterBadge) {
    chartSemesterBadge.textContent = periodRange;
  }

  // 4. Update #rapor-table-period-desc
  const tableDesc = document.getElementById('rapor-table-period-desc');
  if (tableDesc) {
    tableDesc.textContent = `Perbandingan skor per aspek penilaian selama 1 semester (${config.fullMonths[0]} - ${config.fullMonths[5]} ${year}).`;
  }

  // 5. Update #rapor-month-selector options in Input Nilai Komprehensif
  const monthSelector = document.getElementById('rapor-month-selector');
  if (monthSelector) {
    const now = new Date();
    const currentMonthIndo = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][now.getMonth()];
    const currentYear = now.getFullYear();

    const defaultMonth = (year === currentYear && config.fullMonths.includes(currentMonthIndo))
      ? currentMonthIndo
      : config.fullMonths[0];

    const prevVal = monthSelector.value;
    monthSelector.innerHTML = config.fullMonths.map(m => `<option value="${m}">${m}</option>`).join('');
    if (config.fullMonths.includes(prevVal)) {
      monthSelector.value = prevVal;
    } else {
      monthSelector.value = defaultMonth;
    }
  }

  return { year, half, config };
}
window.applySemesterPeriod = applySemesterPeriod;

// =====================================================
// SOC CUSTOM MODAL & DIALOG SYSTEM
// =====================================================
export function showSoCModal({ title = 'Informasi', message = '', type = 'info', confirmText = 'OK', cancelText = null, html = null } = {}) {
  return new Promise((resolve) => {
    let overlay = document.getElementById('soc-custom-dialog-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'soc-custom-dialog-overlay';
      overlay.className = 'soc-dialog-overlay';
      overlay.innerHTML = `
        <div class="soc-dialog-card">
          <div class="soc-dialog-icon-circle" id="soc-dialog-icon-container">
            <i class="fas fa-info-circle" id="soc-dialog-icon"></i>
          </div>
          <h3 class="soc-dialog-title" id="soc-dialog-title"></h3>
          <div class="soc-dialog-message" id="soc-dialog-message"></div>
          <div class="soc-dialog-actions">
            <button type="button" class="btn btn-outline btn-sm" id="soc-dialog-btn-cancel" style="display:none;"></button>
            <button type="button" class="btn btn-primary btn-sm" id="soc-dialog-btn-confirm"></button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    const titleEl = document.getElementById('soc-dialog-title');
    const msgEl = document.getElementById('soc-dialog-message');
    const iconContainer = document.getElementById('soc-dialog-icon-container');
    const iconEl = document.getElementById('soc-dialog-icon');
    const btnConfirm = document.getElementById('soc-dialog-btn-confirm');
    const btnCancel = document.getElementById('soc-dialog-btn-cancel');

    if (titleEl) titleEl.textContent = title;
    if (msgEl) {
      if (html) msgEl.innerHTML = html;
      else msgEl.textContent = message;
    }

    if (iconContainer && iconEl) {
      iconContainer.className = `soc-dialog-icon-circle type-${type}`;
      if (type === 'success') {
        iconEl.className = 'fas fa-check-circle';
      } else if (type === 'danger') {
        iconEl.className = 'fas fa-exclamation-triangle';
      } else if (type === 'warning' || type === 'confirm') {
        iconEl.className = 'fas fa-question-circle';
      } else {
        iconEl.className = 'fas fa-info-circle';
      }
    }

    if (btnConfirm) btnConfirm.textContent = confirmText;
    if (btnCancel) {
      if (cancelText) {
        btnCancel.style.display = 'inline-flex';
        btnCancel.textContent = cancelText;
      } else {
        btnCancel.style.display = 'none';
      }
    }

    overlay.style.display = 'flex';
    requestAnimationFrame(() => overlay.classList.add('active'));

    const cleanup = (val) => {
      overlay.classList.remove('active');
      setTimeout(() => {
        overlay.style.display = 'none';
      }, 250);
      btnConfirm?.removeEventListener('click', onConfirm);
      btnCancel?.removeEventListener('click', onCancel);
      resolve(val);
    };

    const onConfirm = () => cleanup(true);
    const onCancel = () => cleanup(false);

    btnConfirm?.addEventListener('click', onConfirm);
    btnCancel?.addEventListener('click', onCancel);
  });
}
window.showSoCModal = showSoCModal;
window.socAlert = (msg, title = 'Informasi') => showSoCModal({ title, message: msg, type: 'info' });
window.socConfirm = (msg, title = 'Konfirmasi') => showSoCModal({ title, message: msg, type: 'confirm', confirmText: 'Ya, Lanjutkan', cancelText: 'Batal' });
window.alert = function(msg) {
  return showSoCModal({ title: 'Informasi', message: String(msg), type: 'info' });
};
