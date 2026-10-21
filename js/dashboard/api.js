/**
 * js/dashboard/api.js
 * API communication and data fetching layer for School of Character Dashboard.
 */
import { initSemesterSelector, applySemesterPeriod, parseSemesterKey } from './ui.js';

// Ensure global containers exist
if (!window.allStudents) window.allStudents = [];
if (!window.allSchedulesData) window.allSchedulesData = [];
window.allStudentsLoaded = false;

export async function loadAllStudents() {
  try {
    const res = await fetch('http://localhost:5000/api/students');
    if (res.ok) {
      const data = await res.json();
      window.allStudents = Array.isArray(data) ? data : (data.data || []);
      window.allStudentsLoaded = true;
      if (typeof window.renderDataSiswaTable === 'function') {
        window.renderDataSiswaTable();
      }
      return window.allStudents;
    }
  } catch (e) {
    console.warn('Error loading all students:', e);
  }
  return [];
}

export async function loadAllSchedulesData() {
  try {
    const res = await fetch('http://localhost:5000/api/schedules');
    if (res.ok) {
      const data = await res.json();
      window.allSchedulesData = Array.isArray(data) ? data : (data.data || []);
      return window.allSchedulesData;
    }
  } catch (e) {
    console.warn('Error loading all schedules:', e);
  }
  return [];
}

export async function loadSchedules() {
  const selector = document.getElementById('schedule-selector');
  const subjectDisplay = document.getElementById('active-subject-display');
  if (!selector) return [];

  try {
    const res = await fetch('http://localhost:5000/api/schedules');
    let schedules = [];
    if (res.ok) {
      schedules = await res.json();
    }
    schedules = Array.isArray(schedules) ? schedules : [];

    if (schedules.length === 0) {
      schedules = [
        { date: '2026-09-05', mata_pelajaran: 'English', kelas: 'English Beginner' },
        { date: '2026-09-12', mata_pelajaran: 'Matematika', kelas: 'Math Intermediate' },
        { date: '2026-09-19', mata_pelajaran: 'Karakter', kelas: 'Semua Kelas' },
        { date: '2026-09-26', mata_pelajaran: 'Outdoor Learning', kelas: 'Semua Kelas' }
      ];
    }

    selector.innerHTML = '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    schedules.forEach(item => {
      const subject = item.mata_pelajaran || item.subject || 'Karakter';
      const dateStr = item.date ? item.date.split('T')[0] : '';
      let dateLabel = dateStr;
      try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const day = parts[2].padStart(2, '0');
          const mIdx = parseInt(parts[1], 10) - 1;
          const month = months[mIdx] || parts[1];
          dateLabel = `${day} ${month} ${parts[0]}`;
        }
      } catch (e) {}

      const opt = document.createElement('option');
      opt.value = JSON.stringify({ date: dateStr, subject: subject, kelas: item.kelas || '' });
      opt.textContent = `${dateLabel} - ${subject}${item.kelas ? ' (' + item.kelas + ')' : ''}`;
      selector.appendChild(opt);
    });

    if (subjectDisplay && selector.value) {
      try {
        const parsed = JSON.parse(selector.value);
        if (parsed && parsed.subject) subjectDisplay.textContent = parsed.subject;
      } catch (e) {}
    }

    return schedules;
  } catch (err) {
    console.warn('Error loading schedules from backend:', err);
    return [];
  }
}

export async function loadAttendanceHistory() {
  const container = document.getElementById('absensi-history-rows');
  const badgeEl = document.getElementById('hist-class-badge');
  const miniProgList = document.getElementById('mini-progress-list');
  if (!container) return;

  if (badgeEl) badgeEl.textContent = 'Riwayat Kelas';

  try {
    const res = await fetch('http://localhost:5000/api/attendance/history');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const history = await res.json();

    container.innerHTML = '';

    if (!history || history.length === 0) {
      container.innerHTML = `<div style="padding:1rem; font-size:0.85rem; color:var(--text-muted); text-align:center;">Belum ada riwayat absensi.</div>`;
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      const recentHistory = (Array.isArray(history) ? history : []).slice(0, 15);

      recentHistory.forEach(item => {
        const row = document.createElement('div');
        const isToday = item.date === todayStr;
        row.className = `absensi-hist-row ${isToday ? 'absensi-hist-today' : ''}`;

        const subjectDisplay = item.mata_pelajaran || 'Karakter';
        row.title = `${item.date} — ${subjectDisplay}`;

        let dateDisplay = item.date;
        try {
          const parts = item.date.split('-');
          if (parts.length === 3) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            const mIdx = parseInt(parts[1], 10) - 1;
            dateDisplay = `${parseInt(parts[2], 10)} ${months[mIdx] || parts[1]}`;
          }
        } catch (e) {}

        row.innerHTML = `
          <span>${dateDisplay}</span>
          <span>${subjectDisplay}</span>
          <span class="hist-hadir">${item.hadir_count}</span>
          <span class="hist-alpha">${item.alpa_count}</span>
        `;

        container.appendChild(row);
      });
    }

    if (miniProgList) {
      await loadStudentProgressRates();
    }
  } catch (err) {
    console.error('Error loading attendance history:', err);
    container.innerHTML = `<div style="padding:1rem; font-size:0.85rem; color:#dc2626; text-align:center;">Gagal memuat riwayat absensi.</div>`;
  }
}

export async function loadStudentProgressRates() {
  const miniProgList = document.getElementById('mini-progress-list');
  if (!miniProgList) return;

  try {
    if (!window.allStudents || window.allStudents.length === 0) {
      await loadAllStudents();
    }
    const students = window.allStudents || [];

    let html = '';
    for (const s of students.slice(0, 10)) {
      let pct = 100;
      try {
        const attRes = await fetch(`http://localhost:5000/api/attendance?student_id=${s.id}`);
        if (attRes.ok) {
          const records = await attRes.json();
          if (records.length > 0) {
            const hadirCount = records.filter(r => r.status === 'Hadir').length;
            pct = Math.round((hadirCount / records.length) * 100);
          }
        }
      } catch (e) {}

      const shortName = (s.nickname || s.full_name || s.name || 'Siswa').split(' ')[0];
      const fillColor = pct >= 80 ? 'var(--accent-green)' : 'var(--accent-orange)';

      html += `
        <div class="mini-prog-item">
          <span>${shortName}</span>
          <div class="mini-bar">
            <div class="mini-bar-fill" style="width:${pct}%;background:${fillColor}"></div>
          </div>
          <span>${pct}%</span>
        </div>
      `;
    }

    miniProgList.innerHTML = html || '<div style="font-size:0.8rem;color:var(--text-muted);padding:0.5rem 0;">Belum ada data kehadiran.</div>';
  } catch (e) {
    console.warn('Error loading student progress rates:', e);
  }
}

export async function markRealAttendance(btn, status) {
  if (window.currentRole === 'guru') {
    alert('Mode Lihat Saja: Guru tidak memiliki izin untuk mengubah status kehadiran.');
    return;
  }
  const row = btn.closest('.absensi-actions');
  if (!row) return;

  const studentId = row.getAttribute('data-student-id');
  let selectedDate = new Date().toISOString().split('T')[0];
  let mataPelajaran = 'Karakter';

  const selector = document.getElementById('schedule-selector');
  if (selector && selector.value) {
    try {
      const parsed = JSON.parse(selector.value);
      if (parsed.date) selectedDate = parsed.date;
      if (parsed.subject) mataPelajaran = parsed.subject;
    } catch (e) {}
  }

  try {
    const response = await fetch('http://localhost:5000/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: parseInt(studentId, 10) || studentId,
        date: selectedDate,
        status: status,
        mata_pelajaran: mataPelajaran
      })
    });

    if (response.ok) {
      row.querySelectorAll('.absensi-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      await loadAttendanceHistory();
      if (typeof window.renderStudentLiveCalendar === 'function') {
        window.renderStudentLiveCalendar();
      }
    } else {
      const errorData = await response.json().catch(() => ({}));
      alert(`Gagal mencatat absensi: ${errorData.error || 'Terjadi kesalahan pada server'}`);
    }
  } catch (error) {
    console.error('Gagal mengirim data absensi:', error);
    alert('Gagal terhubung ke backend Python (http://localhost:5000).');
  }
}

export async function loadClassAssignments() {
  if (typeof window.loadClassAssignments === 'function' && window.loadClassAssignments !== loadClassAssignments) {
    return window.loadClassAssignments();
  }
  try {
    const res = await fetch('http://localhost:5000/api/classes/assignments');
    if (!res.ok) return;
    const assignments = await res.json();
    if (!Array.isArray(assignments)) return;

    const asgnMap = {};
    assignments.forEach(item => {
      if (item.class_name && item.teacher_name) {
        asgnMap[item.class_name.trim().toLowerCase()] = item.teacher_name;
      }
    });

    document.querySelectorAll('.teacher-assign-select').forEach(sel => {
      const rowClass = (sel.getAttribute('data-kelas') || '').trim().toLowerCase();
      if (asgnMap[rowClass]) {
        sel.value = asgnMap[rowClass];
      }
    });

    if (typeof window.updateTeacherAssignmentExclusivity === 'function') {
      window.updateTeacherAssignmentExclusivity();
    }
  } catch (e) {
    console.warn('Error loading class assignments:', e);
  }
}

export async function loadManagerSchedules() {
  const container = document.getElementById('manager-schedules-list') || document.getElementById('manager-schedules-tbody');
  if (!container) return;

  const currentViewMonth = window.currentViewMonth || (new Date().getMonth() + 1);
  const currentViewYear = window.currentViewYear || new Date().getFullYear();

  try {
    const res = await fetch('http://localhost:5000/api/schedules');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const schedules = Array.isArray(data) ? data : (data.data || []);
    window.allSchedulesData = schedules;

    const filtered = schedules.filter(item => {
      if (!item || !item.date) return false;
      const parts = String(item.date).split('T')[0].split('-');
      if (parts.length < 2) return false;
      return parseInt(parts[0], 10) === currentViewYear && parseInt(parts[1], 10) === currentViewMonth;
    });

    filtered.sort((a, b) => {
      const dComp = String(a.date || '').localeCompare(String(b.date || ''));
      if (dComp !== 0) return dComp;
      return String(a.start_time || '').localeCompare(String(b.start_time || ''));
    });

    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    const isTable = container.tagName === 'TBODY';

    if (filtered.length === 0) {
      if (isTable) {
        container.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:var(--text-muted);">Tidak ada jadwal untuk bulan ${monthNames[currentViewMonth - 1]} ${currentViewYear}.</td></tr>`;
      } else {
        container.innerHTML = `<div class="alert alert-info" style="margin:1rem 0;">Tidak ada jadwal untuk bulan ${monthNames[currentViewMonth - 1]} ${currentViewYear}.</div>`;
      }
      return;
    }

    if (isTable) {
      container.innerHTML = filtered.map(item => {
        const dStr = item.date ? String(item.date).split('T')[0] : '';
        let dateLabel = dStr;
        if (dStr) {
          const parts = dStr.split('-');
          if (parts.length === 3) {
            dateLabel = `${parseInt(parts[2], 10)} ${monthNamesShort[parseInt(parts[1], 10) - 1] || parts[1]} ${parts[0]}`;
          }
        }
        const timeStr = (item.start_time && item.end_time) ? `${item.start_time} - ${item.end_time}` : (item.start_time || '-');
        const subject = item.mata_pelajaran || '-';
        const badgeClass = subject === 'English' ? 'badge-teal' : (subject === 'Matematika' ? 'badge-green' : 'badge-orange');

        return `
          <tr style="border-bottom: 1px solid var(--border-color); font-size: 0.9rem;">
            <td style="padding: 0.75rem 1rem; font-weight: 600;">${dateLabel}</td>
            <td style="padding: 0.75rem 1rem;"><span class="badge ${badgeClass}">${subject}</span></td>
            <td style="padding: 0.75rem 1rem; font-weight: 600; color: var(--color-secondary-dark);">${item.kelas || 'Semua'}</td>
            <td style="padding: 0.75rem 1rem;">${timeStr}</td>
            <td style="padding: 0.75rem 1rem;">${item.lokasi || 'Kelas Pojok Hope'}</td>
            <td style="padding: 0.75rem 1rem;">${item.topik || '-'}</td>
            <td style="padding: 0.75rem 1rem; text-align: center; white-space: nowrap;">
              <button class="btn btn-outline btn-sm" onclick="editSchedule(${item.id})"><i class="fas fa-edit"></i> Edit</button>
              <button class="btn btn-outline btn-sm" style="color:#e74c3c; border-color:#e74c3c; margin-left:0.35rem;" onclick="deleteSchedule(${item.id})"><i class="fas fa-trash"></i> Hapus</button>
            </td>
          </tr>
        `;
      }).join('');
    } else {
      const subjectColors = {
        'Karakter': { color: 'orange', badge: 'badge-orange' },
        'English': { color: 'teal', badge: 'badge-teal' },
        'Matematika': { color: 'green', badge: 'badge-green' },
        'Outdoor Learning': { color: 'orange', badge: 'badge-orange' }
      };

      container.innerHTML = filtered.map(item => {
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
        const topicHtml = item.topik ? `<div style="margin-top:0.35rem; font-size:0.83rem; color:var(--color-secondary-dark); font-weight:600;"><i class="fas fa-book-reader text-orange"></i> Topik: ${item.topik}</div>` : '';
        const catatanHtml = item.catatan ? `<div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;"><i class="fas fa-info-circle text-teal"></i> Catatan: ${item.catatan}</div>` : '';
        const guruLink = item.materi_link ? `<a href="${item.materi_link}" target="_blank" rel="noopener noreferrer" style="font-size:0.78rem; color:var(--color-secondary); display:inline-flex; align-items:center; gap:0.3rem;"><i class="fab fa-google-drive"></i> Modul Guru</a>` : '';
        const siswaLink = item.link_materi_siswa ? `<a href="${item.link_materi_siswa}" target="_blank" rel="noopener noreferrer" style="font-size:0.78rem; color:var(--accent-orange); display:inline-flex; align-items:center; gap:0.3rem;"><i class="fab fa-youtube"></i> Materi Siswa</a>` : '';
        const linksHtml = (guruLink || siswaLink) ? `<div style="display:flex; gap:0.75rem; margin-top:0.35rem; flex-wrap:wrap;">${guruLink} ${siswaLink}</div>` : '';

        return `
          <div class="schedule-item" style="align-items:flex-start; justify-content:space-between; gap:1rem; padding: 0.85rem 0;">
            <div style="display:flex; gap:1rem; flex:1;">
              <div class="schedule-date ${styleConfig.color}">
                <span class="date-day">${day}</span>
                <span class="date-month">${monthStr}</span>
              </div>
              <div class="schedule-details" style="flex:1;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <h4 style="margin:0; font-weight:700;">${subject}</h4>
                  <span class="badge ${styleConfig.badge}">${kelasLabel}</span>
                </div>
                <p style="margin:0.25rem 0 0; color:var(--text-muted); font-size:0.8rem;">
                  <i class="far fa-calendar-alt"></i> ${dateStr} &nbsp;|&nbsp;
                  <i class="far fa-clock"></i> ${timeStr} &nbsp;|&nbsp;
                  <i class="fas fa-map-marker-alt"></i> ${lokasiStr}
                </p>
                ${topicHtml}
                ${catatanHtml}
                ${linksHtml}
              </div>
            </div>
            <div style="display:flex; flex-direction:column; gap:0.4rem; align-items:flex-end;">
              <button class="btn btn-outline btn-sm" style="padding:0.25rem 0.65rem; font-size:0.8rem;" onclick="editSchedule(${item.id})">
                <i class="fas fa-edit"></i> Edit
              </button>
              <button class="btn btn-outline btn-sm" style="color:#e53e3e; border-color:#e53e3e; padding:0.25rem 0.65rem; font-size:0.8rem;" onclick="deleteSchedule(${item.id})">
                <i class="fas fa-trash-alt"></i> Hapus
              </button>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Error loading manager schedules:', err);
    if (container.tagName === 'TBODY') {
      container.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:#dc2626;">Gagal memuat data jadwal dari server.</td></tr>`;
    } else {
      container.innerHTML = `<div class="alert alert-danger" style="margin:1rem 0;">Gagal memuat data jadwal dari server.</div>`;
    }
  }
}

export async function loadRaporData(customStudentId) {
  let targetStudentId = customStudentId || window.selectedStudentKey || 1;
  const urlParams = new URLSearchParams(window.location.search);
  const urlStudentId = urlParams.get('student_id');

  if (customStudentId) {
    targetStudentId = customStudentId;
  } else if (window.currentRole === 'siswa' && window.currentUser && window.currentUser.student_id) {
    targetStudentId = window.currentUser.student_id;
  } else if (urlStudentId) {
    targetStudentId = urlStudentId;
  } else if (window.selectedStudentKey) {
    targetStudentId = window.selectedStudentKey;
  }
  window.selectedStudentKey = targetStudentId;

  const targetStudent = (window.allStudents || []).find(s => s.id === parseInt(targetStudentId, 10));

  const sel2 = document.getElementById('rapor-student-selector');
  if (sel2 && targetStudent) {
    const full = (targetStudent.full_name || targetStudent.name || '').trim();
    const nick = targetStudent.nickname;
    sel2.value = nick ? `${full} (${nick})` : full;
  }

  const starStudentName = document.getElementById('star-student-name');
  if (starStudentName && targetStudent) {
    const full = (targetStudent.full_name || targetStudent.name || '').trim();
    const nick = targetStudent.nickname;
    starStudentName.textContent = nick ? `${full} (${nick})` : full;
  }

  const indivStudentName = document.getElementById('rapor-individual-student-name');
  if (indivStudentName && targetStudent) {
    const full = (targetStudent.full_name || targetStudent.name || '').trim();
    const nick = targetStudent.nickname;
    indivStudentName.textContent = nick ? `${full} (${nick})` : full;
    indivStudentName.style.display = 'block';
  }

  let allEvals = [];
  try {
    const res = await fetch(`http://localhost:5000/api/evaluations?student_id=${targetStudentId}`);
    if (res.ok) {
      const data = await res.json();
      allEvals = Array.isArray(data) ? data : [];
    }
  } catch (err) {
    console.error('Error fetching evaluation data:', err);
  }

  // 1. Group evaluations by semester to determine conditional visibility of selector
  const semGroups = {};
  allEvals.forEach(ev => {
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
    // ONLY show semester selector if the student has evaluations in MORE THAN 1 semester
    semContainer.style.display = (distinctSemesters.length > 1) ? 'flex' : 'none';
  }

  // 2. Dynamic Semester Initialization
  initSemesterSelector();
  const semSelector = document.getElementById('rapor-semester-selector');
  const activeSemesterKey = semSelector ? semSelector.value : (window.activeSemesterKey || '2026-2');
  const { year, half, config } = applySemesterPeriod(activeSemesterKey);

  // 3. Historical Class Badges for Selected Semester (fallback to current student placement)
  const evsInSem = semGroups[activeSemesterKey] || [];
  const evWithEng = evsInSem.find(e => e.kelas_english && e.kelas_english !== 'Belum Ditentukan' && String(e.kelas_english).trim() !== '');
  const evWithMath = evsInSem.find(e => e.kelas_math && e.kelas_math !== 'Belum Ditentukan' && String(e.kelas_math).trim() !== '');

  const histEng = (evWithEng && evWithEng.kelas_english) ? evWithEng.kelas_english : (targetStudent?.kelas_english || 'Belum ditentukan');
  const histMath = (evWithMath && evWithMath.kelas_math) ? evWithMath.kelas_math : (targetStudent?.kelas_math || 'Belum ditentukan');

  const engBadge = document.getElementById('rapor-student-level-eng');
  const mathBadge = document.getElementById('rapor-student-level-math');
  if (engBadge) {
    engBadge.innerHTML = `<i class="fas fa-language"></i> English: ${formatClassName(histEng) || 'Belum ditentukan'}`;
  }
  if (mathBadge) {
    mathBadge.innerHTML = `<i class="fas fa-calculator"></i> Math: ${formatClassName(histMath) || 'Belum ditentukan'}`;
  }

  if (window.currentRole === 'manager' || window.currentRole === 'founder' || window.currentRole === 'admin') {
    const engSel = document.getElementById('plotting-english-level');
    const mathSel = document.getElementById('plotting-math-level');
    if (engSel && targetStudent) engSel.value = targetStudent.kelas_english || '';
    if (mathSel && targetStudent) mathSel.value = targetStudent.kelas_math || '';
  }

  if (typeof window.applyRaporSubjectFilter === 'function') {
    window.applyRaporSubjectFilter();
  }

  const monthSel = document.getElementById('rapor-month-selector');
  const selectedMonth = monthSel ? monthSel.value : config.fullMonths[0];

  const monthEvalMap = {};
  allEvals.forEach(ev => {
    const evYear = parseInt(ev.tahun || 2026, 10);
    if (evYear === year && ev && ev.bulan) {
      monthEvalMap[ev.bulan.trim().toLowerCase()] = ev;
    }
  });

  const currentEval = monthEvalMap[selectedMonth.toLowerCase()] || null;

  const empathy = currentEval ? (currentEval.score_empathy ?? 50) : 50;
  const honesty = currentEval ? (currentEval.score_honesty ?? 50) : 50;
  const responsibility = currentEval ? (currentEval.score_responsibility ?? 50) : 50;
  const respect = currentEval ? (currentEval.score_respect ?? 50) : 50;
  const fluency = currentEval ? (currentEval.score_fluency ?? 50) : 50;
  const reading = currentEval ? (currentEval.score_reading ?? 50) : 50;
  const logic = currentEval ? (currentEval.score_logic ?? 50) : 50;
  const arithmetic = currentEval ? (currentEval.score_arithmetic ?? 50) : 50;
  const stars = currentEval ? (currentEval.stars ?? 0) : 0;

  const sliderMappings = [
    ['slider-empathy', 'slider-empathy-val', empathy],
    ['slider-honesty', 'slider-honesty-val', honesty],
    ['slider-responsibility', 'slider-responsibility-val', responsibility],
    ['slider-respect', 'slider-respect-val', respect],
    ['slider-eng-fluency', 'slider-eng-fluency-val', fluency],
    ['slider-eng-reading', 'slider-eng-reading-val', reading],
    ['slider-math-logic', 'slider-math-logic-val', logic],
    ['slider-math-arith', 'slider-math-arith-val', arithmetic],
  ];

  sliderMappings.forEach(([sliderId, valId, val]) => {
    const sEl = document.getElementById(sliderId);
    const vEl = document.getElementById(valId);
    if (sEl) sEl.value = val;
    if (vEl) {
      if ('value' in vEl) vEl.value = val;
      else vEl.textContent = val;
    }
  });

  const studentStarCount = document.getElementById('student-star-count');
  const teacherStarCount = document.getElementById('teacher-star-count');
  if (studentStarCount) studentStarCount.textContent = stars;
  if (teacherStarCount) teacherStarCount.textContent = stars;

  // Populate Table cells
  const aspects = [
    'score_empathy', 'score_honesty', 'score_responsibility', 'score_respect',
    'score_fluency', 'score_reading', 'score_logic', 'score_arithmetic'
  ];
  const slotSuffixes = ['jul', 'ags', 'sep', 'okt', 'nov', 'des'];

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
    aspects.forEach(asp => {
      if (ev[asp] !== undefined && ev[asp] !== null) { sum += ev[asp]; count++; }
    });

    if (count > 0) {
      const avg = (sum / count).toFixed(1);
      avgCell.innerHTML = `<strong>${avg}</strong>`;
    } else {
      avgCell.innerHTML = '<strong>-</strong>';
    }
  });

  // SVG Chart rendering
  const xCoords = [58, 175, 292, 408, 525, 641];
  const chartSvg = document.querySelector('#view-rapor .chart-svg');

  if (chartSvg) {
    chartSvg.querySelectorAll('circle.dynamic-dot').forEach(c => c.remove());

    const scoreToY = (score) => {
      const num = parseFloat(score);
      if (isNaN(num) || num <= 0) return null;
      const clamped = Math.max(0, Math.min(100, num));
      return Math.round((1 - clamped / 100) * 140);
    };

    const buildChartLine = (polyId, colorVar, getScore) => {
      const poly = document.getElementById(polyId);
      const pointsArr = [];
      config.fullMonths.forEach((m, i) => {
        const ev = monthEvalMap[m.toLowerCase()];
        if (!ev) return;
        const avg = getScore(ev);
        const y = scoreToY(avg);
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

    buildChartLine('chart-poly-char', '--accent-orange', ev => ((ev.score_empathy || 0) + (ev.score_honesty || 0) + (ev.score_responsibility || 0) + (ev.score_respect || 0)) / 4);
    buildChartLine('chart-poly-eng', '--color-secondary', ev => ((ev.score_fluency || 0) + (ev.score_reading || 0)) / 2);
    buildChartLine('chart-poly-math', '--accent-green', ev => ((ev.score_logic || 0) + (ev.score_arithmetic || 0)) / 2);
  }

  if (semSelector) {
    semSelector.onchange = (e) => {
      window.activeSemesterKey = e.target.value;
      loadRaporData(targetStudentId);
    };
  }
}
