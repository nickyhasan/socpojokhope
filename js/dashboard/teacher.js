// =====================================================
// TEACHER MODULE (js/dashboard/teacher.js)
// =====================================================
import { formatStudentDisplayName, getSelectedSchedule, formatTeacherName, formatClassName, getRawClassName, SEMESTER_CONFIG, parseSemesterKey, initSemesterSelector, applySemesterPeriod } from './ui.js';
import { loadAllStudents, loadAllSchedulesData, loadRaporData } from './api.js';

export { SEMESTER_CONFIG, parseSemesterKey, initSemesterSelector, applySemesterPeriod };

export function isTeacherMatch(assignmentTeacherName, user) {
  if (!assignmentTeacherName || !user) return false;
  const aName = String(assignmentTeacherName).toLowerCase().trim();
  const fullName = String(user.full_name || user.nama || '').toLowerCase().trim();
  const username = String(user.username || '').toLowerCase().trim();

  if (fullName && (aName === fullName || fullName.includes(aName) || aName.includes(fullName))) return true;
  if (username && (aName === username || aName.includes(username))) return true;

  const tokens = fullName.split(/[\s\/\(\)]+/).filter(t => t.length > 2);
  for (const t of tokens) {
    if (aName.includes(t)) return true;
  }
  return false;
}
window.isTeacherMatch = isTeacherMatch;

export async function renderGuruSummary() {
  const jadwalContainer = document.getElementById('guru-ringkasan-jadwal-list');
  const topSiswaContainer = document.getElementById('guru-ringkasan-top-siswa');

  try {
    const loggedInUser = window.currentUser || {};
    const teacherName = formatTeacherName(loggedInUser);
    const teacherWelcomeText = document.querySelector('#ringkasan-guru .welcome-text h2');
    if (teacherWelcomeText) {
      teacherWelcomeText.textContent = `Selamat datang, ${teacherName}! 👋`;
    }

    if (!window.allSchedulesData || window.allSchedulesData.length === 0) {
      await loadAllSchedulesData();
    }
    if (!window.allStudents || window.allStudents.length === 0) {
      await loadAllStudents();
    }

    const schedules = Array.isArray(window.allSchedulesData) ? window.allSchedulesData : [];
    const students = Array.isArray(window.allStudents) ? window.allStudents : [];

    // Fallback if data is empty or undefined
    if (schedules.length === 0 && jadwalContainer) {
      jadwalContainer.innerHTML = '<div class="alert alert-info" style="margin:1rem;">Belum ada data untuk ditampilkan.</div>';
    }
    if (students.length === 0 && topSiswaContainer) {
      topSiswaContainer.innerHTML = '<div class="alert alert-info" style="margin:1rem;">Belum ada data untuk ditampilkan.</div>';
    }

    // 0. Fetch class assignments or use safe fallback
    let assignedClasses = [];
    try {
      const asgnRes = await fetch('http://localhost:5000/api/classes/assignments');
      if (asgnRes.ok) {
        const asgnList = await asgnRes.json();
        if (Array.isArray(asgnList)) {
          asgnList.forEach(asgn => {
            if (asgn && asgn.teacher_name && (asgn.teacher_name === teacherName || isTeacherMatch(asgn.teacher_name, window.currentUser))) {
              if (asgn.class_name && !assignedClasses.includes(String(asgn.class_name))) {
                assignedClasses.push(String(asgn.class_name));
              }
            }
          });
        }
      }
    } catch (e) {
      console.warn('Error fetching class assignments for guru summary:', e);
    }

    if (assignedClasses.length === 0) {
      assignedClasses = ['English A (Foundation)', 'English B (Beginner)', 'Math A (Dasar Angka)', 'Math B (Operasi Hitung)'];
    }
    const safeAssigned = assignedClasses.map(c => String(c));

    const guruSchedules = schedules.filter(s => safeAssigned.includes(s.kelas) || s.kelas === 'Semua Kelas' || s.kelas === 'Semua');
    const activeStudents = students.filter(s => safeAssigned.includes(s.kelas_english) || safeAssigned.includes(s.kelas_math));
    const targetStudents = activeStudents.length > 0 ? activeStudents : students;

    // Stats banner
    const activeStudentsEl = document.getElementById('guru-active-students-count');
    const classesMonthEl = document.getElementById('guru-classes-month-count');
    if (activeStudentsEl) activeStudentsEl.textContent = targetStudents.length;
    if (classesMonthEl) {
      const now = new Date();
      const thisYear = now.getFullYear();
      const thisMonth = now.getMonth() + 1;
      const count = (guruSchedules.length > 0 ? guruSchedules : schedules).filter(item => {
        if (!item || !item.date) return false;
        const parts = String(item.date).split('T')[0].split('-').map(Number);
        return parts[0] === thisYear && parts[1] === thisMonth;
      }).length;
      classesMonthEl.textContent = count;
    }

    // 1. Render Guru's Jadwal
    if (jadwalContainer && schedules.length > 0) {
      const todayTime = new Date().setHours(0, 0, 0, 0);
      const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const subjectColors = {
        'Karakter': { color: 'orange', badge: 'badge-orange' },
        'English': { color: 'teal', badge: 'badge-teal' },
        'Matematika': { color: 'green', badge: 'badge-green' },
        'Outdoor Learning': { color: 'orange', badge: 'badge-orange' }
      };

      const upcoming = (guruSchedules.length > 0 ? guruSchedules : schedules).filter(item => {
        if (!item || !item.date) return false;
        const [y, m, d] = String(item.date).split('T')[0].split('-').map(Number);
        return new Date(y, m - 1, d).setHours(0, 0, 0, 0) >= todayTime;
      });

      upcoming.sort((a, b) => {
        const dComp = String(a.date || '').localeCompare(String(b.date || ''));
        if (dComp !== 0) return dComp;
        return String(a.start_time || '').localeCompare(String(b.start_time || ''));
      });

      const topUpcoming = (upcoming.length > 0 ? upcoming : guruSchedules).slice(0, 3);

      if (topUpcoming.length === 0) {
        jadwalContainer.innerHTML = '<div class="alert alert-info" style="margin:1rem;">Belum ada data untuk ditampilkan.</div>';
      } else {
        let html = '';
        topUpcoming.forEach(item => {
          if (!item) return;
          const subject = item.mata_pelajaran || 'Karakter';
          const dateStr = item.date ? String(item.date).split('T')[0] : '';
          const kelasLabel = item.kelas ? (String(item.kelas).toUpperCase() === 'SEMUA' ? 'Semua Kelas' : item.kelas) : 'Semua Kelas';

          let day = '--';
          let monthStr = 'Jadwal';
          if (dateStr) {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
              day = parseInt(parts[2], 10);
              const mIdx = parseInt(parts[1], 10) - 1;
              monthStr = monthNamesShort[mIdx] || parts[1];
            }
          }

          const styleConfig = subjectColors[subject] || { color: 'teal', badge: 'badge-teal' };
          const timeStr = (item.start_time && item.end_time) ? `${item.start_time}–${item.end_time} WITA` : (item.start_time ? `${item.start_time} WITA` : '14:00–15:30 WITA');
          const lokasiStr = item.lokasi || 'Kelas Pojok Hope';
          const topicHtml = item.topik ? `<h5 style="margin-top:0.4rem; font-size:0.85rem; color:var(--color-secondary-dark); font-weight:600;"><i class="fas fa-book-reader text-orange"></i> Topik: ${item.topik}</h5>` : '';

          const teacherModulLink = item.materi_link || item.link_materi;
          const linksList = [];
          if (teacherModulLink) {
            linksList.push(`<a href="${teacherModulLink}" target="_blank" rel="noopener noreferrer" class="badge badge-teal" style="text-decoration:none; display:inline-flex; align-items:center; gap:0.35rem; padding:0.35rem 0.6rem;"><i class="fab fa-google-drive"></i> Modul Guru</a>`);
          }
          if (item.link_materi_siswa) {
            linksList.push(`<a href="${item.link_materi_siswa}" target="_blank" rel="noopener noreferrer" class="badge badge-orange" style="text-decoration:none; display:inline-flex; align-items:center; gap:0.35rem; padding:0.35rem 0.6rem;"><i class="fab fa-youtube"></i> Materi Siswa</a>`);
          }
          const linksHtml = linksList.length > 0 ? `<div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.45rem;">${linksList.join('')}</div>` : '';

          html += `
            <div class="schedule-item" style="align-items:flex-start;">
              <div class="schedule-date ${styleConfig.color}">
                <span class="date-day">${day}</span>
                <span class="date-month">${monthStr}</span>
              </div>
              <div class="schedule-details" style="flex:1;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <h4>${subject}</h4>
                  <span class="badge ${styleConfig.badge}">${kelasLabel}</span>
                </div>
                <p><i class="far fa-calendar-alt"></i> ${dateStr} &nbsp;|&nbsp; <i class="far fa-clock"></i> ${timeStr} &nbsp;|&nbsp; <i class="fas fa-map-marker-alt"></i> ${lokasiStr}</p>
                ${topicHtml}
                ${linksHtml}
              </div>
            </div>
          `;
        });
        jadwalContainer.innerHTML = html;
      }
    }

    // 2. Render Guru's Top Siswa
    if (topSiswaContainer && targetStudents.length > 0) {
      const sortedStudents = [...targetStudents].sort((a, b) => {
        const starA = Number(a.stars || 0);
        const starB = Number(b.stars || 0);
        return starB - starA;
      });
      const top10 = sortedStudents.slice(0, 10);

      if (top10.length === 0) {
        topSiswaContainer.innerHTML = '<div class="alert alert-info" style="margin:1rem;">Belum ada data untuk ditampilkan.</div>';
      } else {
        let html = '<div style="display:flex; flex-direction:column; gap:0.5rem; padding-bottom:0.25rem;">';
        top10.forEach((st, idx) => {
          const rank = idx + 1;
          let rankBadgeStyle = 'background: rgba(0,0,0,0.06); color: var(--text-dark);';
          let rankIcon = `#${rank}`;
          if (rank === 1) {
            rankBadgeStyle = 'background: #fef3c7; color: #d97706; font-weight:800;';
            rankIcon = '🥇 1';
          } else if (rank === 2) {
            rankBadgeStyle = 'background: #e2e8f0; color: #475569; font-weight:800;';
            rankIcon = '🥈 2';
          } else if (rank === 3) {
            rankBadgeStyle = 'background: #fed7aa; color: #c2410c; font-weight:800;';
            rankIcon = '🥉 3';
          }

          const starsDisplay = (st.stars !== undefined && st.stars !== null) ? st.stars : Math.max(10, 20 - idx);

          html += `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:0.6rem 0.85rem; background:var(--bg-contrast); border-radius:var(--border-radius-sm); border:1px solid var(--border-color);">
              <div style="display:flex; align-items:center; gap:0.75rem;">
                <span style="font-size:0.8rem; min-width:32px; height:26px; border-radius:13px; display:inline-flex; align-items:center; justify-content:center; padding:0 0.35rem; ${rankBadgeStyle}">
                  ${rankIcon}
                </span>
                <div>
                  <h5 style="margin:0; font-size:0.9rem; color:var(--color-secondary-dark); font-weight:700;">${formatStudentDisplayName(st)}</h5>
                  <span class="badge badge-teal" style="font-size:0.68rem; padding:0.1rem 0.4rem;">${st.kelas_english || st.kelas_math || 'Siswa'}</span>
                </div>
              </div>
              <div style="display:flex; align-items:center; gap:1.25rem;">
                <span class="text-orange" style="font-weight:700; font-size:0.85rem;" title="Bintang Karakter">
                  <i class="fas fa-star"></i> ${starsDisplay} Bintang
                </span>
              </div>
            </div>
          `;
        });
        html += '</div>';
        topSiswaContainer.innerHTML = html;
      }
    }

  } catch (err) {
    console.error("renderGuruSummary error:", err);
    if (jadwalContainer) jadwalContainer.innerHTML = '<div class="alert alert-info" style="margin:1rem;">Belum ada data untuk ditampilkan.</div>';
    if (topSiswaContainer) topSiswaContainer.innerHTML = '<div class="alert alert-info" style="margin:1rem;">Belum ada data untuk ditampilkan.</div>';
  }
}
window.renderGuruSummary = renderGuruSummary;

export async function renderTeacherAttendanceRoster() {
  const rosterContainer = document.getElementById('absensi-dynamic-roster');
  if (!rosterContainer) return;

  const selectedSchedule = getSelectedSchedule();
  const selectedDate = selectedSchedule.date;
  const selectedSubject = selectedSchedule.subject;
  const targetClass = selectedSchedule ? selectedSchedule.kelas : '';

  // Read-only mode for Teachers
  const isReadOnly = (window.currentRole === 'guru');
  const btnSave = document.getElementById('btn-save-absensi');
  if (btnSave) {
    btnSave.style.display = isReadOnly ? 'none' : 'block';
  }

  try {
    if (!window.allStudents || window.allStudents.length === 0) {
      await loadAllStudents();
    }
    const allStudents = window.allStudents || [];

    // Dynamic Student Filtering for Attendance (2027 logic)
    const relevantStudents = allStudents.filter(s => {
      if (!targetClass || targetClass === 'Semua Kelas' || targetClass === 'Semua') return true;
      return s.kelas_english === targetClass || s.kelas_math === targetClass;
    });

    // Fetch attendance for selected date to sync active button states
    let todayAttendanceMap = {};
    try {
      const todayRes = await fetch(`http://localhost:5000/api/attendance?date=${selectedDate}`);
      if (todayRes.ok) {
        const todayData = await todayRes.json();
        todayData.forEach(item => {
          if (!item.mata_pelajaran || item.mata_pelajaran === selectedSubject) {
            todayAttendanceMap[item.student_id] = item.status;
          }
        });
      }
    } catch (err) {
      console.warn('Could not fetch today attendance:', err);
    }

    rosterContainer.innerHTML = '';

    if (relevantStudents.length === 0) {
      rosterContainer.innerHTML = `<p style="padding:1rem; color:var(--text-muted); text-align:center;">Tidak ada siswa terdaftar${targetClass ? ' di ' + targetClass : ''}.</p>`;
      return;
    }

    const disabledAttr = isReadOnly ? 'disabled="true"' : '';
    const readOnlyStyle = isReadOnly ? 'pointer-events:none; opacity:0.8;' : '';

    relevantStudents.forEach(student => {
      const row = document.createElement('div');
      row.className = 'absensi-row';
      const status = todayAttendanceMap[student.id] || '';

      const isH = status === 'Hadir' ? 'active' : '';
      const isS = status === 'Sakit' ? 'active' : '';
      const isI = status === 'Izin' ? 'active' : '';
      const isA = status === 'Alpa' ? 'active' : '';

      row.innerHTML = `
        <span class="absensi-name">${formatStudentDisplayName(student)}</span>
        <div class="absensi-actions" data-student-id="${student.id}">
          <button type="button" class="absensi-btn hadir ${isH}" ${disabledAttr} style="${readOnlyStyle}" onclick="markRealAttendance(this, 'Hadir')">H</button>
          <button type="button" class="absensi-btn sakit ${isS}" ${disabledAttr} style="${readOnlyStyle}" onclick="markRealAttendance(this, 'Sakit')">S</button>
          <button type="button" class="absensi-btn izin ${isI}" ${disabledAttr} style="${readOnlyStyle}" onclick="markRealAttendance(this, 'Izin')">I</button>
          <button type="button" class="absensi-btn alpa ${isA}" ${disabledAttr} style="${readOnlyStyle}" onclick="markRealAttendance(this, 'Alpa')">A</button>
        </div>
      `;
      rosterContainer.appendChild(row);
    });
  } catch (error) {
    console.error('Gagal mengambil data siswa dari backend:', error);
    rosterContainer.innerHTML = `<p style="padding: 1rem; color: #dc2626; font-size: 0.9rem;">Gagal memuat data siswa dari server Python (http://localhost:5000). Pastikan Flask server sedang berjalan.</p>`;
  }
}
export const renderTeacherAttendance = renderTeacherAttendanceRoster;
window.renderTeacherAttendanceRoster = renderTeacherAttendanceRoster;

export async function renderJadwalKelas() {
  const listMendatang = document.getElementById('jadwal-list-mendatang');
  const listSelesai = document.getElementById('jadwal-list-selesai');

  if (!listMendatang || !listSelesai) {
    console.warn('Jadwal containers (#jadwal-list-mendatang, #jadwal-list-selesai) not found in DOM.');
    return;
  }

  listMendatang.innerHTML = "";
  listSelesai.innerHTML = "";

  const emptyPlaceholder = '<div style="padding: 1rem; color: var(--text-muted); font-style: italic;">Tidak ada jadwal di kategori ini untuk bulan terpilih.</div>';

  try {
    const res = await fetch('http://localhost:5000/api/schedules');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    let schedules = Array.isArray(data) ? data : (data.data || []);
    const loggedInUser = window.currentUser || {};
    const currentRole = window.currentRole || 'guru';
    const selectedStudentKey = window.selectedStudentKey;
    const currentViewYear = window.currentViewYear || new Date().getFullYear();
    const currentViewMonth = window.currentViewMonth || (new Date().getMonth() + 1);

    // Filter by role under 2027 architecture
    if (currentRole === 'siswa') {
      const curId = (loggedInUser && (loggedInUser.student_id || loggedInUser.id)) 
        ? parseInt(loggedInUser.student_id || loggedInUser.id, 10) 
        : (selectedStudentKey || 1);
      const student = (window.allStudents || []).find(s => s.id === curId);
      const eng = String(student?.kelas_english || '').trim().toUpperCase();
      const math = String(student?.kelas_math || '').trim().toUpperCase();
      schedules = schedules.filter(item => {
        const k = String(item.kelas || '').trim().toUpperCase();
        return !k || k === 'SEMUA' || k === 'SEMUA KELAS' || (eng && k === eng) || (math && k === math);
      });
    } else if (currentRole === 'guru') {
      let assignedClasses = [];
      try {
        const aRes = await fetch('http://localhost:5000/api/classes/assignments');
        if (aRes.ok) {
          const aList = await aRes.json();
          const currentTeacherName = (loggedInUser && (loggedInUser.nama || loggedInUser.full_name)) || '';
          (aList || []).forEach(asgn => {
            if (asgn.teacher_name && (asgn.teacher_name === currentTeacherName || isTeacherMatch(asgn.teacher_name, loggedInUser))) {
              assignedClasses.push(asgn.class_name);
            }
          });
        }
      } catch (e) {
        console.warn('Error fetching class assignments for guru schedule:', e);
      }
      schedules = schedules.filter(item => {
        const k = item.kelas || '';
        if (!k || k === 'Semua' || k === 'Semua Kelas') return true;
        return assignedClasses.includes(k) || assignedClasses.some(ac => k.toLowerCase().startsWith(ac.toLowerCase()) || ac.toLowerCase().startsWith(k.toLowerCase()));
      });
    }

    // Filter schedules strictly by currentViewMonth and currentViewYear
    const filteredSchedules = schedules.filter(item => {
      if (!item || !item.date) return false;
      const parts = String(item.date).split('T')[0].split('-');
      if (parts.length < 2) return false;
      return parseInt(parts[0], 10) === currentViewYear && parseInt(parts[1], 10) === currentViewMonth;
    });

    if (filteredSchedules.length === 0) {
      listMendatang.innerHTML = emptyPlaceholder;
      listSelesai.innerHTML = emptyPlaceholder;
      return;
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const subjectColors = {
      'Karakter': { color: 'orange', badge: 'badge-orange' },
      'English': { color: 'teal', badge: 'badge-teal' },
      'Matematika': { color: 'green', badge: 'badge-green' },
      'Outdoor Learning': { color: 'orange', badge: 'badge-orange' }
    };

    const pastList = [];
    const upcomingList = [];

    filteredSchedules.forEach(item => {
      if (!item) return;
      const dStr = item.date ? String(item.date).split('T')[0] : '';
      if (!dStr) return;
      const timePart = item.end_time || item.start_time || '23:59';
      const [y, m, d] = dStr.split('-').map(Number);
      let hours = 23, minutes = 59;
      if (typeof timePart === 'string' && timePart.includes(':')) {
        const tParts = timePart.split(':').map(Number);
        hours = tParts[0] || 0;
        minutes = tParts[1] || 0;
      }
      const schedDateTime = new Date(y, m - 1, d, hours, minutes, 0);

      if (schedDateTime < now) {
        pastList.push(item);
      } else {
        upcomingList.push(item);
      }
    });

    upcomingList.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    pastList.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

    const buildCardHtml = (item, isPast) => {
      const subject = item.mata_pelajaran || 'Karakter';
      const dateStr = item.date ? String(item.date).split('T')[0] : '';
      const isToday = (dateStr === todayStr);

      let day = '--';
      let monthStr = 'Jadwal';
      if (dateStr) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          day = parseInt(parts[2], 10);
          const mIdx = parseInt(parts[1], 10) - 1;
          monthStr = monthNames[mIdx] || parts[1];
        }
      }

      const styleConfig = subjectColors[subject] || { color: 'teal', badge: 'badge-teal' };
      const timeStr = (item.start_time && item.end_time) ? `${item.start_time}–${item.end_time} WITA` : (item.start_time ? `${item.start_time} WITA` : '14:00–15:30 WITA');
      const lokasiStr = item.lokasi || 'Kelas Pojok Hope';
      const kelasRaw = item.kelas ? String(item.kelas) : '';
      const kelasBadge = kelasRaw ? `<span class="badge ${styleConfig.badge}" style="margin-left:0.5rem; font-size:0.7rem;">${kelasRaw.toUpperCase() === 'SEMUA' ? 'Semua Kelas' : (kelasRaw.startsWith('English') || kelasRaw.startsWith('Math') ? kelasRaw : 'Kelas ' + kelasRaw)}</span>` : '';

      let cardClass = 'jadwal-card';
      let statusBadge = '';
      if (isPast) {
        cardClass += ' jadwal-done';
        statusBadge = '<span class="jadwal-status-badge done">✓ Selesai</span>';
      } else if (isToday) {
        cardClass += ' jadwal-today';
        statusBadge = '<span class="jadwal-status-badge today">🔴 Hari Ini</span>';
      } else {
        statusBadge = '<span class="jadwal-status-badge upcoming">📅 Mendatang</span>';
      }

      const topicTitle = item.topik ? ' — ' + item.topik : '';
      const catatanHtml = item.catatan ? `<p class="jadwal-meta"><i class="fas fa-info-circle text-orange"></i> ${item.catatan}</p>` : '';
      let linksHtml = '';
      if (window.currentRole === 'siswa') {
        if (item.link_materi_siswa) {
          linksHtml = `<div style="margin-top:0.4rem;"><a href="${item.link_materi_siswa}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="display:inline-flex; align-items:center; gap:0.4rem; color: #e67e22; border-color: #e67e22;"><i class="fab fa-youtube text-orange"></i> Buka Materi Belajar</a></div>`;
        }
      } else {
        const parts = [];
        const teacherModul = item.materi_link || item.link_materi;
        if (teacherModul) {
          parts.push(`<a href="${teacherModul}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="display:inline-flex; align-items:center; gap:0.4rem;"><i class="fab fa-google-drive"></i> Modul Guru</a>`);
        }
        if (item.link_materi_siswa) {
          parts.push(`<a href="${item.link_materi_siswa}" target="_blank" rel="noopener noreferrer" class="badge badge-orange" style="text-decoration:none; display:inline-flex; align-items:center; gap:0.35rem; padding:0.35rem 0.65rem;"><i class="fab fa-youtube"></i> Materi Siswa</a>`);
        }
        if (parts.length > 0) {
          linksHtml = `<div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.4rem;">${parts.join('')}</div>`;
        }
      }

      return `
        <div class="${cardClass}">
          <div class="jadwal-date-chip ${styleConfig.color}">
            <span class="jd-day">${day}</span>
            <span class="jd-month">${monthStr}</span>
          </div>
          <div class="jadwal-info">
            <h4>${subject}${topicTitle}${kelasBadge}</h4>
            <p class="jadwal-meta"><i class="far fa-clock"></i> ${timeStr} &nbsp;|&nbsp; <i class="fas fa-map-marker-alt"></i> ${lokasiStr}</p>
            ${catatanHtml}
            ${linksHtml}
          </div>
          ${statusBadge}
        </div>
      `;
    };

    if (listMendatang) {
      if (upcomingList.length === 0) {
        listMendatang.innerHTML = emptyPlaceholder;
      } else {
        listMendatang.innerHTML = upcomingList.map(item => buildCardHtml(item, false)).join('');
      }
    }

    if (listSelesai) {
      if (pastList.length === 0) {
        listSelesai.innerHTML = emptyPlaceholder;
      } else {
        listSelesai.innerHTML = pastList.map(item => buildCardHtml(item, true)).join('');
      }
    }

  } catch (err) {
    console.error("Error in renderJadwalKelas:", err);
    if (listMendatang) listMendatang.innerHTML = '<p style="color:var(--text-muted); padding:1rem;">Gagal memuat jadwal dari server.</p>';
    if (listSelesai) listSelesai.innerHTML = '<p style="color:var(--text-muted); padding:1rem;">Gagal memuat jadwal dari server.</p>';
  }
}
window.renderJadwalKelas = renderJadwalKelas;

export let currentGuruSubject = 'English';
window.currentGuruSubject = currentGuruSubject;

export async function handleGuruSubjectToggle(subject) {
  currentGuruSubject = subject || 'English';
  window.currentGuruSubject = currentGuruSubject;

  const btnEnglish = document.getElementById('btn-rapor-english');
  const btnMath = document.getElementById('btn-rapor-math');
  const alertNoClass = document.getElementById('guru-no-class-alert');
  const selectorRow = document.getElementById('rapor-student-selector-row');
  const cardsContainer = document.getElementById('rapor-cards-container');
  const datalist = document.getElementById('datalist-students');
  const raporInput = document.getElementById('rapor-student-selector');

  if (btnEnglish && btnMath) {
    if (currentGuruSubject === 'English') {
      btnEnglish.className = 'btn btn-primary';
      btnMath.className = 'btn btn-outline';
    } else {
      btnEnglish.className = 'btn btn-outline';
      btnMath.className = 'btn btn-primary';
    }
  }

  let assignments = [];
  try {
    const res = await fetch('http://localhost:5000/api/classes/assignments');
    if (res.ok) {
      assignments = await res.json();
    }
  } catch (err) {
    console.warn('Error fetching class assignments for toggle:', err);
  }

  const loggedInUser = window.currentUser || {};
  const prefix = currentGuruSubject === 'English' ? 'english' : 'math';
  const assignedClasses = (assignments || []).filter(asgn => {
    if (!asgn || !asgn.teacher_name || !asgn.teacher_name.trim()) return false;
    const cName = String(asgn.class_name || '').toLowerCase();
    return cName.startsWith(prefix) && isTeacherMatch(asgn.teacher_name, loggedInUser);
  }).map(a => a.class_name);

  if (assignedClasses.length === 0) {
    if (alertNoClass) alertNoClass.style.display = 'block';
    if (selectorRow) selectorRow.style.display = 'none';
    if (cardsContainer) cardsContainer.style.display = 'none';
    return;
  }

  if (alertNoClass) alertNoClass.style.display = 'none';
  if (selectorRow) selectorRow.style.display = 'flex';
  if (cardsContainer) cardsContainer.style.display = 'block';

  if (!window.allStudents || window.allStudents.length === 0) {
    await loadAllStudents();
  }

  const classKey = currentGuruSubject === 'English' ? 'kelas_english' : 'kelas_math';
  const filteredStudents = (window.allStudents || []).filter(s => {
    const sLevel = String(s[classKey] || '').trim().toUpperCase();
    return assignedClasses.some(ac => ac.trim().toUpperCase() === sLevel);
  });

  if (datalist) {
    datalist.innerHTML = filteredStudents.map(s => 
      `<option value="${formatStudentDisplayName(s)}"></option>`
    ).join('');
  }

  if (filteredStudents.length > 0) {
    const currentStillMatches = filteredStudents.some(s => s.id === window.selectedStudentKey);
    const targetStudent = currentStillMatches 
      ? filteredStudents.find(s => s.id === window.selectedStudentKey) 
      : filteredStudents[0];
    window.selectedStudentKey = targetStudent.id;
    if (raporInput) {
      raporInput.value = formatStudentDisplayName(targetStudent);
    }
  } else {
    if (raporInput) {
      raporInput.value = '';
    }
  }

  applyRaporSubjectFilter();
  await loadRaporData();
}
window.handleGuruSubjectToggle = handleGuruSubjectToggle;

export function applyRaporSubjectFilter() {
  const currentRole = window.currentRole || 'guru';
  const groupKarakter = document.getElementById('scoring-group-karakter');
  const groupEnglish = document.getElementById('scoring-group-english');
  const groupMath = document.getElementById('scoring-group-math');

  if (currentRole === 'guru') {
    if (groupKarakter) groupKarakter.style.display = 'none';

    if (currentGuruSubject === 'English') {
      if (groupEnglish) groupEnglish.style.display = 'block';
      if (groupMath) groupMath.style.display = 'none';
      document.querySelectorAll('#view-rapor .rapor-table tr[data-subject="english"]').forEach(r => r.style.display = '');
      document.querySelectorAll('#view-rapor .rapor-table tr[data-subject="matematika"]').forEach(r => r.style.display = 'none');
      document.querySelectorAll('#view-rapor .rapor-table tr[data-subject="karakter"]').forEach(r => r.style.display = 'none');
    } else {
      if (groupEnglish) groupEnglish.style.display = 'none';
      if (groupMath) groupMath.style.display = 'block';
      document.querySelectorAll('#view-rapor .rapor-table tr[data-subject="english"]').forEach(r => r.style.display = 'none');
      document.querySelectorAll('#view-rapor .rapor-table tr[data-subject="matematika"]').forEach(r => r.style.display = '');
      document.querySelectorAll('#view-rapor .rapor-table tr[data-subject="karakter"]').forEach(r => r.style.display = 'none');
    }
  } else {
    if (groupKarakter) groupKarakter.style.display = 'block';
    if (groupEnglish) groupEnglish.style.display = 'block';
    if (groupMath) groupMath.style.display = 'block';
    document.querySelectorAll('#view-rapor .rapor-table tr[data-subject]').forEach(r => r.style.display = '');
  }
}
window.applyRaporSubjectFilter = applyRaporSubjectFilter;

// =====================================================
// GURU RAPOR DYNAMIC CLASS SELECTION & TABLE ROSTER
// =====================================================
let activeGuruRaporClass = '';

export async function renderGuruRaporView() {
  const legacySelectorRow = document.getElementById('rapor-student-selector-row');
  if (legacySelectorRow) {
      legacySelectorRow.style.display = 'none'; // Force hide legacy admin row
  }
  const guruSelectionView = document.getElementById('guru-rapor-selection-view');
  if (guruSelectionView) {
      guruSelectionView.style.display = 'block'; // Ensure guru view is visible
  }

  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const currentMonth = monthNames[new Date().getMonth()];
  const monthEl = document.getElementById('guru-active-month-text');
  if (monthEl) {
      monthEl.innerHTML = `<i class="far fa-calendar-alt"></i> Bulan Ini : ${currentMonth}`;
  }

  const selectionView = document.getElementById('guru-rapor-selection-view');
  const buttonsContainer = document.getElementById('guru-dynamic-class-buttons');
  const searchInput = document.getElementById('search-guru-rapor-siswa');
  const table = document.getElementById('table-guru-rapor-list');
  const tbody = table ? (table.querySelector('tbody') || document.getElementById('table-guru-rapor-tbody')) : document.getElementById('table-guru-rapor-tbody');
  const alertNoClass = document.getElementById('guru-no-class-alert');
  const cardsContainer = document.getElementById('rapor-cards-container');
  const backBtnContainer = document.getElementById('btn-back-to-guru-list-container');


  if (window.currentRole !== 'guru') {
    if (selectionView) selectionView.style.display = 'none';
    if (alertNoClass) alertNoClass.style.display = 'none';
    if (cardsContainer) cardsContainer.style.display = 'block';
    return;
  }

  try {
    // 1. Fetch assigned classes if not yet populated in window.assignedClasses
    if (!window.assignedClasses || window.assignedClasses.length === 0) {
      let assignments = [];
      try {
        const res = await fetch('http://localhost:5000/api/classes/assignments');
        if (res.ok) {
          assignments = await res.json();
        }
      } catch (e) {
        console.warn('Error fetching class assignments for guru rapor:', e);
      }

      const loggedInUser = window.currentUser || {};
      const teacherClasses = (assignments || []).filter(asgn => {
        if (!asgn || !asgn.teacher_name || !asgn.teacher_name.trim()) return false;
        return isTeacherMatch(asgn.teacher_name, loggedInUser);
      }).map(a => a.class_name);

      const uniqueClasses = [];
      teacherClasses.forEach(c => {
        const fmt = formatClassName(c);
        if (!uniqueClasses.includes(fmt) && !uniqueClasses.some(u => getRawClassName(u) === getRawClassName(c))) {
          uniqueClasses.push(fmt);
        }
      });
      window.assignedClasses = uniqueClasses;
    }

    const assignedClasses = window.assignedClasses || [];

    // Empty state: No classes assigned to this teacher
    if (assignedClasses.length === 0) {
      if (selectionView) selectionView.style.display = 'none';
      if (cardsContainer) cardsContainer.style.display = 'none';
      if (backBtnContainer) backBtnContainer.style.display = 'none';
      if (alertNoClass) {
        alertNoClass.style.display = 'block';
        alertNoClass.textContent = 'Kelas belum ditentukan oleh Manager.';
      }
      return;
    }

    if (alertNoClass) alertNoClass.style.display = 'none';
    if (selectionView) selectionView.style.display = 'block';
    if (cardsContainer) cardsContainer.style.display = 'none';
    if (backBtnContainer) backBtnContainer.style.display = 'none';

    // 2. Ensure students are loaded
    if (!window.allStudents || window.allStudents.length === 0) {
      if (tbody) {
        tbody.innerHTML = Array(4).fill(0).map(() => `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 0.75rem 1rem; text-align: center;"><div class="skeleton skeleton-text" style="width: 25px; margin: 0 auto;"></div></td>
            <td style="padding: 0.75rem 1rem;"><div class="skeleton skeleton-text" style="width: 80px;"></div></td>
            <td style="padding: 0.75rem 1rem;"><div class="skeleton skeleton-text" style="width: 160px;"></div></td>
            <td style="padding: 0.75rem 1rem; text-align: center;"><div class="skeleton skeleton-text" style="width: 100px; margin: 0 auto;"></div></td>
          </tr>
        `).join('');
      }
      await loadAllStudents();
    }

    // Set default active class
    if (!activeGuruRaporClass || !assignedClasses.some(c => c === activeGuruRaporClass || formatClassName(c) === formatClassName(activeGuruRaporClass))) {
      activeGuruRaporClass = assignedClasses[0];
    }

    // Function to filter students and render table
    const renderStudentsForClass = (className, query = '') => {
      if (!tbody) return;

      const activeSubject = (className.toLowerCase().includes('math') || className.toLowerCase().includes('matematika')) ? 'Matematika' : 'English';
      window.currentGuruSubject = activeSubject;

      const rawClass = getRawClassName(className).trim().toLowerCase();
      const fmtClass = formatClassName(className).trim().toLowerCase();
      const exactClass = className.trim().toLowerCase();

      let filtered = (window.allStudents || []).filter(s => {
        const eng = String(s.kelas_english || '').trim().toLowerCase();
        const math = String(s.kelas_math || '').trim().toLowerCase();

        return eng === exactClass || eng === rawClass || eng === fmtClass ||
               math === exactClass || math === rawClass || math === fmtClass ||
               getRawClassName(eng).toLowerCase() === rawClass ||
               getRawClassName(math).toLowerCase() === rawClass;
      });

      if (query && query.trim()) {
        const q = query.trim().toLowerCase();
        filtered = filtered.filter(s => {
          const name = String(s.full_name || s.name || '').toLowerCase();
          const nick = String(s.nickname || '').toLowerCase();
          const nis = String(s.nis || '').toLowerCase();
          return name.includes(q) || nick.includes(q) || nis.includes(q);
        });
      }

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem;">Kelas ini belum memiliki siswa.</td></tr>';
        return;
      }

      tbody.innerHTML = filtered.map((s, idx) => `
        <tr style="border-bottom: 1px solid var(--border-color); font-size: 0.9rem;">
          <td style="padding: 0.75rem 1rem; text-align: center; font-weight: 600;">${idx + 1}</td>
          <td style="padding: 0.75rem 1rem; text-align: left; font-family: monospace; font-weight: 600;">${s.nis || '-'}</td>
          <td style="padding: 0.75rem 1rem; text-align: left; font-weight: 600; color: var(--color-secondary-dark);">${formatStudentDisplayName(s)}</td>
          <td style="padding: 0.75rem 1rem; text-align: center;">
            <button type="button" class="btn btn-sm btn-primary" onclick="openIndividualRapor(${s.id}, '${activeSubject}')" style="display:inline-flex; align-items:center; gap:0.4rem; padding: 0.35rem 0.85rem;">
              <i class="fas fa-file-invoice"></i> Lihat Rapor
            </button>
          </td>
        </tr>
      `).join('');
    };

    // 3. Generate class buttons based on window.assignedClasses
    if (buttonsContainer) {
      buttonsContainer.innerHTML = assignedClasses.map(clsName => {
        const displayName = formatClassName(clsName);
        const isActive = clsName === activeGuruRaporClass || displayName === formatClassName(activeGuruRaporClass);
        const btnClass = isActive ? 'btn btn-primary guru-class-filter-btn' : 'btn btn-outline guru-class-filter-btn';
        return `<button type="button" class="${btnClass}" data-class="${clsName}" style="font-weight:600; padding:0.5rem 1rem;"><i class="fas fa-chalkboard"></i> ${displayName}</button>`;
      }).join('');

      buttonsContainer.querySelectorAll('.guru-class-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const targetCls = btn.getAttribute('data-class');
          activeGuruRaporClass = targetCls;

          buttonsContainer.querySelectorAll('.guru-class-filter-btn').forEach(b => {
            b.className = (b.getAttribute('data-class') === targetCls) 
              ? 'btn btn-primary guru-class-filter-btn' 
              : 'btn btn-outline guru-class-filter-btn';
          });

          renderStudentsForClass(targetCls, searchInput ? searchInput.value : '');
        });
      });
    }

    renderStudentsForClass(activeGuruRaporClass, searchInput ? searchInput.value : '');

    if (searchInput && !searchInput._listenerAttached) {
      searchInput._listenerAttached = true;
      searchInput.addEventListener('input', (e) => {
        renderStudentsForClass(activeGuruRaporClass, e.target.value);
      });
    }

  } catch (err) {
    console.error('Error in renderGuruRaporView:', err);
  }
}
window.renderGuruRaporView = renderGuruRaporView;
export const renderGuruRaporSelection = renderGuruRaporView;
window.renderGuruRaporSelection = renderGuruRaporSelection;

export async function openIndividualRapor(studentId, subject) {
  const activeSubject = subject || window.currentGuruSubject || 'English';
  const currentSubject = activeSubject;
  window.selectedStudentKey = studentId;
  window.currentGuruSubject = currentSubject;
  window.activeGuruSubject = currentSubject;

  const selectionView = document.getElementById('guru-rapor-selection-view');
  const cardsContainer = document.getElementById('rapor-cards-container');
  const backBtnContainer = document.getElementById('btn-back-to-guru-list-container');
  const guruInputCard = document.getElementById('rapor-guru-input-card');
  const raporInput = document.getElementById('rapor-student-selector');
  const starStudentName = document.getElementById('star-student-name');
  const legacySelectorRow = document.getElementById('rapor-student-selector-row');
  if (legacySelectorRow) legacySelectorRow.style.display = 'none';

  if (selectionView) selectionView.style.display = 'none';
  if (cardsContainer) cardsContainer.style.display = 'block';
  if (backBtnContainer) backBtnContainer.style.display = 'block';
  if (guruInputCard) guruInputCard.style.display = 'block';

  const student = (window.allStudents || []).find(s => s.id === parseInt(studentId, 10));
  if (student) {
    if (raporInput) raporInput.value = formatStudentDisplayName(student);
    if (starStudentName) starStudentName.textContent = formatStudentDisplayName(student);
    const indivStudentName = document.getElementById('rapor-individual-student-name');
    if (indivStudentName) {
      const studentFullName = (student.full_name || student.name || '').trim();
      const displayHeading = student.nickname ? `${studentFullName} (${student.nickname})` : (formatStudentDisplayName(student) || studentFullName);
      indivStudentName.textContent = displayHeading;
      indivStudentName.style.display = 'block';
    }
    const engBadge = document.getElementById('rapor-student-level-eng');
    const mathBadge = document.getElementById('rapor-student-level-math');
    if (engBadge) engBadge.innerHTML = `<i class="fas fa-language"></i> English: ${formatClassName(student.kelas_english) || 'Belum ditentukan'}`;
    if (mathBadge) mathBadge.innerHTML = `<i class="fas fa-calculator"></i> Math: ${formatClassName(student.kelas_math) || 'Belum ditentukan'}`;
  }

  // Subject Level Badges Isolation (Vanilla JS)
  const engBadge = document.getElementById('rapor-student-level-eng');
  const mathBadge = document.getElementById('rapor-student-level-math');
  if (window.currentRole === 'guru') {
    if (activeSubject === 'English') {
      if (engBadge) engBadge.style.display = 'inline-flex';
      if (mathBadge) mathBadge.style.display = 'none';
    } else if (activeSubject === 'Matematika') {
      if (engBadge) engBadge.style.display = 'none';
      if (mathBadge) mathBadge.style.display = 'inline-flex';
    }
  } else {
    if (engBadge) engBadge.style.display = 'inline-flex';
    if (mathBadge) mathBadge.style.display = 'inline-flex';
  }

  // 1. Subject Isolation: Gauge Cards
  const charGauge = document.getElementById('gauge-char-circle')?.closest('.gauge-card');
  const engGauge = document.getElementById('gauge-eng-circle')?.closest('.gauge-card');
  const mathGauge = document.getElementById('gauge-math-circle')?.closest('.gauge-card');

  if (window.currentRole === 'guru') {
    if (currentSubject === 'English') {
      if (engGauge) engGauge.style.display = '';
      if (charGauge) charGauge.style.display = 'none';
      if (mathGauge) mathGauge.style.display = 'none';
    } else if (currentSubject === 'Matematika') {
      if (mathGauge) mathGauge.style.display = '';
      if (charGauge) charGauge.style.display = 'none';
      if (engGauge) engGauge.style.display = 'none';
    }
  } else {
    if (charGauge) charGauge.style.display = '';
    if (engGauge) engGauge.style.display = '';
    if (mathGauge) mathGauge.style.display = '';
  }

  // 2. Subject Isolation: Scoring Sliders
  const groupChar = document.getElementById('scoring-group-karakter');
  const groupEng = document.getElementById('scoring-group-english');
  const groupMath = document.getElementById('scoring-group-math');

  if (window.currentRole === 'guru') {
    if (currentSubject === 'English') {
      if (groupEng) groupEng.style.display = 'block';
      if (groupChar) groupChar.style.display = 'none';
      if (groupMath) groupMath.style.display = 'none';
    } else if (currentSubject === 'Matematika') {
      if (groupMath) groupMath.style.display = 'block';
      if (groupChar) groupChar.style.display = 'none';
      if (groupEng) groupEng.style.display = 'none';
    }
  } else {
    if (groupChar) groupChar.style.display = 'block';
    if (groupEng) groupEng.style.display = 'block';
    if (groupMath) groupMath.style.display = 'block';
  }

  // 3. Subject Isolation: Monthly Table Rows
  document.querySelectorAll('#view-rapor .rapor-table tbody tr[data-subject]').forEach(r => {
    const subj = r.getAttribute('data-subject');
    if (window.currentRole === 'guru') {
      if (currentSubject === 'English') {
        r.style.display = (subj === 'english') ? '' : 'none';
      } else if (currentSubject === 'Matematika') {
        r.style.display = (subj === 'matematika') ? '' : 'none';
      }
    } else {
      r.style.display = '';
    }
  });

  // 4. Subject Isolation: SVG Polylines & Legend
  const polyChar = document.getElementById('chart-poly-char');
  const polyEng = document.getElementById('chart-poly-eng');
  const polyMath = document.getElementById('chart-poly-math');

  if (window.currentRole === 'guru') {
    if (currentSubject === 'English') {
      if (polyEng) polyEng.style.display = '';
      if (polyChar) polyChar.style.display = 'none';
      if (polyMath) polyMath.style.display = 'none';
    } else if (currentSubject === 'Matematika') {
      if (polyMath) polyMath.style.display = '';
      if (polyChar) polyChar.style.display = 'none';
      if (polyEng) polyEng.style.display = 'none';
    }
  } else {
    if (polyChar) polyChar.style.display = '';
    if (polyEng) polyEng.style.display = '';
    if (polyMath) polyMath.style.display = '';
  }

  const legendItems = document.querySelectorAll('.chart-legend .legend-item');
  if (window.currentRole === 'guru') {
    legendItems.forEach(item => {
      const txt = item.textContent.trim().toLowerCase();
      if (currentSubject === 'English') {
        item.style.display = txt.includes('english') ? 'inline-flex' : 'none';
      } else if (currentSubject === 'Matematika') {
        item.style.display = (txt.includes('matematika') || txt.includes('math')) ? 'inline-flex' : 'none';
      }
    });
  } else {
    legendItems.forEach(item => { item.style.display = 'inline-flex'; });
  }

  // 5. Star Permissions: Guru cannot reset stars
  const btnStarReset = document.getElementById('btn-star-reset');
  const btnStarAdd = document.getElementById('btn-star-add');
  const btnStarSub = document.getElementById('btn-star-sub');
  const btnSaveStars = document.getElementById('btn-save-stars');
  const teacherStarCard = document.getElementById('teacher-star-card');
  const studentStarCard = document.getElementById('student-star-card');

  if (window.currentRole === 'guru') {
    if (btnStarReset) btnStarReset.style.display = 'none';
    if (teacherStarCard) teacherStarCard.style.display = 'block';
    if (studentStarCard) studentStarCard.style.display = 'none';
  }
  if (btnStarAdd) btnStarAdd.style.display = '';
  if (btnStarSub) btnStarSub.style.display = '';
  if (btnSaveStars) btnSaveStars.style.display = '';

  // 6. Dynamic Semester Initialization & Data Loading
  initSemesterSelector();

  let evaluations = [];
  try {
    const res = await fetch(`http://localhost:5000/api/evaluations?student_id=${studentId}`);
    if (res.ok) {
      evaluations = await res.json();
    }
  } catch (err) {
    console.warn('Error fetching student evaluations:', err);
  }

  // Group evaluations by semester to determine conditional visibility of selector
  const semGroups = {};
  (Array.isArray(evaluations) ? evaluations : []).forEach(ev => {
    const evYear = parseInt(ev.tahun || 2026, 10);
    const mName = (ev.bulan || '').trim().toLowerCase();
    const isHalf1 = ['januari','februari','maret','april','mei','juni'].includes(mName);
    const sKey = `${evYear}-${isHalf1 ? 1 : 2}`;
    if (!semGroups[sKey]) semGroups[sKey] = [];
    semGroups[sKey].push(ev);
  });
  const distinctSemesters = Object.keys(semGroups);
  const semContainer = document.getElementById('rapor-semester-selector-container');
  if (semContainer) {
    // ONLY show semester selector if student has evaluations in MORE THAN 1 semester
    semContainer.style.display = (distinctSemesters.length > 1) ? 'flex' : 'none';
  }

  const aspects = [
    'score_empathy', 'score_honesty', 'score_responsibility', 'score_respect',
    'score_fluency', 'score_reading', 'score_logic', 'score_arithmetic'
  ];
  const slotSuffixes = ['jul', 'ags', 'sep', 'okt', 'nov', 'des'];

  const renderSemesterRapor = (semesterKey) => {
    const activeKey = semesterKey || (document.getElementById('rapor-semester-selector')?.value) || (window.activeSemesterKey || '2026-2');
    const { year, half, config } = applySemesterPeriod(activeKey);

    // Historical Class Badges for Selected Semester (fallback to student's current placement)
    const evsInSem = semGroups[activeKey] || [];
    const evWithEng = evsInSem.find(e => e.kelas_english && e.kelas_english !== 'Belum Ditentukan' && String(e.kelas_english).trim() !== '');
    const evWithMath = evsInSem.find(e => e.kelas_math && e.kelas_math !== 'Belum Ditentukan' && String(e.kelas_math).trim() !== '');

    const histEng = (evWithEng && evWithEng.kelas_english) ? evWithEng.kelas_english : (student?.kelas_english || 'Belum ditentukan');
    const histMath = (evWithMath && evWithMath.kelas_math) ? evWithMath.kelas_math : (student?.kelas_math || 'Belum ditentukan');

    const engBadge = document.getElementById('rapor-student-level-eng');
    const mathBadge = document.getElementById('rapor-student-level-math');
    if (engBadge) {
      engBadge.innerHTML = `<i class="fas fa-language"></i> English: ${formatClassName(histEng) || 'Belum ditentukan'}`;
    }
    if (mathBadge) {
      mathBadge.innerHTML = `<i class="fas fa-calculator"></i> Math: ${formatClassName(histMath) || 'Belum ditentukan'}`;
    }

    if (window.currentRole === 'guru') {
      if (activeSubject === 'English') {
        if (engBadge) engBadge.style.display = 'inline-flex';
        if (mathBadge) mathBadge.style.display = 'none';
      } else if (activeSubject === 'Matematika') {
        if (engBadge) engBadge.style.display = 'none';
        if (mathBadge) mathBadge.style.display = 'inline-flex';
      }
    } else {
      if (engBadge) engBadge.style.display = 'inline-flex';
      if (mathBadge) mathBadge.style.display = 'inline-flex';
    }

    const monthEvalMap = {};
    (Array.isArray(evaluations) ? evaluations : []).forEach(ev => {
      const evYear = parseInt(ev.tahun || 2026, 10);
      if (evYear === year && ev.bulan) {
        monthEvalMap[ev.bulan.trim().toLowerCase()] = ev;
      }
    });

    // Populate Table cells
    aspects.forEach(aspect => {
      const row = document.querySelector(`#view-rapor .rapor-table tr[data-aspect="${aspect}"]`);
      if (!row) return;

      let firstVal = null;
      let lastVal = null;

      slotSuffixes.forEach((suffix, idx) => {
        const mName = config.fullMonths[idx].toLowerCase();
        const cell = row.querySelector(`.cell-${suffix}`);
        const ev = monthEvalMap[mName];
        const val = (ev && ev[aspect] !== undefined && ev[aspect] !== null) ? ev[aspect] : null;

        if (cell) {
          cell.textContent = val !== null ? val : '-';
        }

        if (val !== null) {
          if (firstVal === null) firstVal = val;
          lastVal = val;
        }
      });

      const trendCell = row.querySelector('.cell-trend');
      if (trendCell) {
        if (firstVal !== null && lastVal !== null) {
          const diff = lastVal - firstVal;
          if (diff > 0) {
            trendCell.innerHTML = `<span style="color:var(--color-success); font-weight:700;">+${diff} &uarr;</span>`;
          } else if (diff < 0) {
            trendCell.innerHTML = `<span style="color:#ef4444; font-weight:700;">${diff} &darr;</span>`;
          } else {
            trendCell.innerHTML = `<span style="color:var(--text-muted); font-weight:700;">0 &rarr;</span>`;
          }
        } else {
          trendCell.textContent = '-';
        }
      }
    });

    // Calculate monthly averages
    slotSuffixes.forEach((suffix, idx) => {
      const mName = config.fullMonths[idx].toLowerCase();
      const ev = monthEvalMap[mName];
      const avgCell = document.getElementById(`avg-${suffix}`);
      if (!avgCell) return;

      if (!ev) {
        avgCell.innerHTML = '<strong>-</strong>';
        return;
      }

      let sum = 0;
      let count = 0;
      if (currentSubject === 'English') {
        if (ev.score_fluency !== undefined && ev.score_fluency !== null) { sum += ev.score_fluency; count++; }
        if (ev.score_reading !== undefined && ev.score_reading !== null) { sum += ev.score_reading; count++; }
      } else if (currentSubject === 'Matematika') {
        if (ev.score_logic !== undefined && ev.score_logic !== null) { sum += ev.score_logic; count++; }
        if (ev.score_arithmetic !== undefined && ev.score_arithmetic !== null) { sum += ev.score_arithmetic; count++; }
      } else {
        aspects.forEach(asp => {
          if (ev[asp] !== undefined && ev[asp] !== null) { sum += ev[asp]; count++; }
        });
      }

      if (count > 0) {
        const avg = (sum / count).toFixed(1);
        avgCell.innerHTML = `<strong>${avg}</strong>`;
      } else {
        avgCell.innerHTML = '<strong>-</strong>';
      }
    });

    // Helper to populate sliders and gauge for a chosen month
    const updateSlidersForMonth = (targetMonth) => {
      const evalForSliders = monthEvalMap[(targetMonth || '').toLowerCase()] || {};

      if (currentSubject === 'English') {
        const fluVal = evalForSliders.score_fluency ?? 75;
        const readVal = evalForSliders.score_reading ?? 75;
        const sFlu = document.getElementById('slider-eng-fluency');
        const vFlu = document.getElementById('slider-eng-fluency-val');
        const sRead = document.getElementById('slider-eng-reading');
        const vRead = document.getElementById('slider-eng-reading-val');
        if (sFlu) sFlu.value = fluVal;
        if (vFlu) vFlu.value = fluVal;
        if (sRead) sRead.value = readVal;
        if (vRead) vRead.value = readVal;

        const avgEng = ((fluVal + readVal) / 2).toFixed(1);
        const gaugeEngCircle = document.getElementById('gauge-eng-circle');
        const gaugeEngVal = document.getElementById('gauge-eng-val');
        if (gaugeEngCircle) gaugeEngCircle.style.setProperty('--gauge-pct', avgEng);
        if (gaugeEngVal) gaugeEngVal.textContent = avgEng;
      } else if (currentSubject === 'Matematika') {
        const logVal = evalForSliders.score_logic ?? 75;
        const arithVal = evalForSliders.score_arithmetic ?? 75;
        const sLog = document.getElementById('slider-math-logic');
        const vLog = document.getElementById('slider-math-logic-val');
        const sArith = document.getElementById('slider-math-arith');
        const vArith = document.getElementById('slider-math-arith-val');
        if (sLog) sLog.value = logVal;
        if (vLog) vLog.value = logVal;
        if (sArith) sArith.value = arithVal;
        if (vArith) vArith.value = arithVal;

        const avgMath = ((logVal + arithVal) / 2).toFixed(1);
        const gaugeMathCircle = document.getElementById('gauge-math-circle');
        const gaugeMathVal = document.getElementById('gauge-math-val');
        if (gaugeMathCircle) gaugeMathCircle.style.setProperty('--gauge-pct', avgMath);
        if (gaugeMathVal) gaugeMathVal.textContent = avgMath;
      }

      // Update Stars
      const starsVal = evalForSliders.stars ?? (student ? (student.stars ?? 0) : 0);
      const tStarCount = document.getElementById('teacher-star-count');
      const sStarCount = document.getElementById('student-star-count');
      if (tStarCount) tStarCount.textContent = starsVal;
      if (sStarCount) sStarCount.textContent = starsVal;
    };

    const monthSelector = document.getElementById('rapor-month-selector');
    if (monthSelector) {
      monthSelector.onchange = (e) => {
        try {
          updateSlidersForMonth(e.target.value);
        } catch (err) {
          console.error('Error switching month:', err);
        }
      };
    }
    const initialMonth = (monthSelector && monthSelector.value) ? monthSelector.value : config.fullMonths[0];
    updateSlidersForMonth(initialMonth);

    // Draw Line Chart for active subject across config.fullMonths
    const chartSvg = document.querySelector('#view-rapor .chart-svg');
    if (chartSvg) {
      chartSvg.querySelectorAll('circle.dynamic-dot').forEach(c => c.remove());
      const xCoords = [58, 175, 292, 408, 525, 641];
      const scoreToY = (score) => {
        const num = parseFloat(score);
        if (isNaN(num) || num <= 0) return null;
        const clamped = Math.max(0, Math.min(100, num));
        return Math.round((1 - clamped / 100) * 140);
      };

      const drawLine = (polyId, colorVar, getScore) => {
        const poly = document.getElementById(polyId);
        const pointsArr = [];
        config.fullMonths.forEach((m, i) => {
          const ev = monthEvalMap[m.toLowerCase()];
          if (!ev) return;
          const score = getScore(ev);
          if (score === null || score === undefined) return;
          const y = scoreToY(score);
          if (y === null) return;
          pointsArr.push(`${xCoords[i]},${y}`);
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', String(xCoords[i]));
          circle.setAttribute('cy', String(y));
          circle.setAttribute('r', '5');
          circle.setAttribute('fill', `var(${colorVar})`);
          circle.classList.add('dynamic-dot');
          chartSvg.appendChild(circle);
        });
        if (poly) poly.setAttribute('points', pointsArr.join(' '));
      };

      if (currentSubject === 'English') {
        drawLine('chart-poly-eng', '--color-secondary', ev => ((ev.score_fluency || 0) + (ev.score_reading || 0)) / 2);
      } else if (currentSubject === 'Matematika') {
        drawLine('chart-poly-math', '--accent-green', ev => ((ev.score_logic || 0) + (ev.score_arithmetic || 0)) / 2);
      } else {
        drawLine('chart-poly-char', '--accent-orange', ev => ((ev.score_empathy || 0) + (ev.score_honesty || 0) + (ev.score_responsibility || 0) + (ev.score_respect || 0)) / 4);
        drawLine('chart-poly-eng', '--color-secondary', ev => ((ev.score_fluency || 0) + (ev.score_reading || 0)) / 2);
        drawLine('chart-poly-math', '--accent-green', ev => ((ev.score_logic || 0) + (ev.score_arithmetic || 0)) / 2);
      }
    }
  };

  const semSelector = document.getElementById('rapor-semester-selector');
  if (semSelector) {
    semSelector.onchange = (e) => {
      window.activeSemesterKey = e.target.value;
      renderSemesterRapor(e.target.value);
    };
  }

  // Initial render with current/selected semester
  renderSemesterRapor(semSelector ? semSelector.value : window.activeSemesterKey);

  // 7. Attach Save Handler ensuring it only sends data for the visible sliders/subject
  const btnSaveScore = document.getElementById('btn-save-score');
  if (btnSaveScore) {
    btnSaveScore.onclick = async () => {
      const semSel = document.getElementById('rapor-semester-selector');
      const { year: activeYear } = parseSemesterKey(semSel ? semSel.value : window.activeSemesterKey);
      const monthSel = document.getElementById('rapor-month-selector');
      const targetMonth = (monthSel && monthSel.value) ? monthSel.value : 'Oktober';

      const payload = {
        student_id: parseInt(studentId, 10),
        bulan: targetMonth,
        tahun: activeYear
      };

      if (currentSubject === 'English') {
        payload.score_fluency = parseInt(document.getElementById('slider-eng-fluency')?.value, 10) || 0;
        payload.score_reading = parseInt(document.getElementById('slider-eng-reading')?.value, 10) || 0;
      } else if (currentSubject === 'Matematika') {
        payload.score_logic = parseInt(document.getElementById('slider-math-logic')?.value, 10) || 0;
        payload.score_arithmetic = parseInt(document.getElementById('slider-math-arith')?.value, 10) || 0;
      } else {
        payload.score_empathy = parseInt(document.getElementById('slider-empathy')?.value, 10) || 0;
        payload.score_honesty = parseInt(document.getElementById('slider-honesty')?.value, 10) || 0;
        payload.score_responsibility = parseInt(document.getElementById('slider-responsibility')?.value, 10) || 0;
        payload.score_respect = parseInt(document.getElementById('slider-respect')?.value, 10) || 0;
        payload.score_fluency = parseInt(document.getElementById('slider-eng-fluency')?.value, 10) || 0;
        payload.score_reading = parseInt(document.getElementById('slider-eng-reading')?.value, 10) || 0;
        payload.score_logic = parseInt(document.getElementById('slider-math-logic')?.value, 10) || 0;
        payload.score_arithmetic = parseInt(document.getElementById('slider-math-arith')?.value, 10) || 0;
      }

      try {
        btnSaveScore.disabled = true;
        btnSaveScore.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
        const res = await fetch('http://localhost:5000/api/evaluations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const saveMsg = document.getElementById('save-status-msg');
          if (saveMsg) {
            saveMsg.classList.remove('hidden');
            setTimeout(() => saveMsg.classList.add('hidden'), 2500);
          }
          await openIndividualRapor(studentId, currentSubject);
        } else {
          const errData = await res.json().catch(() => ({}));
          alert('Gagal menyimpan nilai: ' + (errData.error || 'Terjadi kesalahan'));
        }
      } catch (err) {
        console.error('Error saving evaluations:', err);
        alert('Gagal menyimpan nilai: ' + err.message);
      } finally {
        btnSaveScore.disabled = false;
        btnSaveScore.innerHTML = '<i class="fas fa-save"></i> Simpan Semua Nilai';
      }
    };
  }
}
window.openIndividualRapor = openIndividualRapor;

export function openGuruStudentRapor(studentId, activeSubject) {
  return openIndividualRapor(studentId, activeSubject);
}
window.openGuruStudentRapor = openGuruStudentRapor;

export function backToGuruRaporSelection() {
  const selectionView = document.getElementById('guru-rapor-selection-view');
  const cardsContainer = document.getElementById('rapor-cards-container');
  const backBtnContainer = document.getElementById('btn-back-to-guru-list-container');
  const indivStudentName = document.getElementById('rapor-individual-student-name');
  const legacySelectorRow = document.getElementById('rapor-student-selector-row');

  if (legacySelectorRow) legacySelectorRow.style.display = 'none';
  if (selectionView) selectionView.style.display = 'block';
  if (cardsContainer) cardsContainer.style.display = 'none';
  if (backBtnContainer) backBtnContainer.style.display = 'none';
  if (indivStudentName) indivStudentName.style.display = 'none';

  renderGuruRaporView();
}
window.backToGuruRaporSelection = backToGuruRaporSelection;

