/**
 * js/dashboard/student.js
 * Student specific dashboard rendering and live attendance calendar.
 */

import { loadAllStudents, loadAllSchedulesData } from './api.js';
import { formatStudentDisplayName, SEMESTER_CONFIG, parseSemesterKey, initSemesterSelector, applySemesterPeriod } from './ui.js';

export { SEMESTER_CONFIG, parseSemesterKey, initSemesterSelector, applySemesterPeriod };

export async function renderStudentLiveCalendar() {
  let hadirCount = 0;
  let sakitCount = 0;
  let izinCount = 0;
  let alpaCount = 0;

  const calendarContainer = document.getElementById('student-live-calendar');
  if (!calendarContainer) return;

  const loggedInUser = window.currentUser;
  let targetStudentId = window.selectedStudentKey || 1;
  const urlParams = new URLSearchParams(window.location.search);
  const urlStudentId = urlParams.get('student_id');

  if (window.currentRole === 'siswa' && loggedInUser && loggedInUser.student_id) {
    targetStudentId = loggedInUser.student_id;
  } else if (urlStudentId) {
    targetStudentId = urlStudentId;
  } else if (window.selectedStudentKey) {
    targetStudentId = window.selectedStudentKey;
  }

  try {
    const res = await fetch(`http://localhost:5000/api/attendance?student_id=${targetStudentId}`);
    let records = [];
    if (res.ok) {
      records = await res.json();
    }
    records = Array.isArray(records) ? records : [];

    const latestRecordsMap = {};
    records.forEach(record => {
      if (!record.date) return;
      const dStr = record.date.split('T')[0];
      if (!dStr.startsWith('2026-09')) return;

      latestRecordsMap[dStr] = {
        status: record.status,
        mata_pelajaran: record.mata_pelajaran || 'Karakter'
      };
    });

    Object.keys(latestRecordsMap).forEach(dStr => {
      const status = latestRecordsMap[dStr].status;
      if (status === 'Hadir') hadirCount++;
      else if (status === 'Sakit') sakitCount++;
      else if (status === 'Izin') izinCount++;
      else if (status === 'Alpa') alpaCount++;
    });

    const totalTracked = hadirCount + sakitCount + izinCount + alpaCount;
    const pct = totalTracked > 0 ? Math.round((hadirCount / totalTracked) * 100) : 0;

    const hadirEl = document.getElementById('att-sum-hadir-val');
    const sakitEl = document.getElementById('att-sum-sakit-val');
    const izinEl  = document.getElementById('att-sum-izin-val');
    const alpaEl  = document.getElementById('att-sum-alpa-val');
    const pctEl   = document.getElementById('att-sum-pct-val');

    if (hadirEl) hadirEl.textContent = hadirCount;
    if (sakitEl) sakitEl.textContent = sakitCount;
    if (izinEl)  izinEl.textContent  = izinCount;
    if (alpaEl)  alpaEl.textContent  = alpaCount;
    if (pctEl)   pctEl.textContent   = `${pct}%`;

    let gridHtml = `
      <div class="cal-day-name">Min</div>
      <div class="cal-day-name">Sen</div>
      <div class="cal-day-name">Sel</div>
      <div class="cal-day-name">Rab</div>
      <div class="cal-day-name">Kam</div>
      <div class="cal-day-name">Jum</div>
      <div class="cal-day-name">Sab</div>
    `;

    gridHtml += `<div class="cal-day empty"></div><div class="cal-day empty"></div>`;
    const weekends = [5, 6, 12, 13, 19, 20, 26, 27];

    for (let day = 1; day <= 30; day++) {
      const dayStr = `2026-09-${String(day).padStart(2, '0')}`;
      const record = latestRecordsMap[dayStr];
      const status = record ? record.status : '';

      let dayClass = 'day-no-class';
      if (status === 'Hadir') dayClass = 'day-hadir';
      else if (status === 'Sakit') dayClass = 'day-sakit';
      else if (status === 'Izin') dayClass = 'day-izin';
      else if (status === 'Alpa') dayClass = 'day-alpa';
      else if (weekends.includes(day)) dayClass = 'day-weekend';

      const titleAttr = record
        ? `${record.mata_pelajaran} - ${record.status}`
        : (weekends.includes(day) ? 'Akhir Pekan' : 'Tidak Ada Kelas');

      gridHtml += `
        <div class="cal-day ${dayClass}" title="${titleAttr}">
          <span class="day-num">${day}</span>
        </div>
      `;
    }

    calendarContainer.innerHTML = gridHtml;
  } catch (err) {
    console.error('Error rendering live calendar:', err);
  }
}

export const renderStudentAttendance = renderStudentLiveCalendar;

export async function renderJadwalSiswa(student) {
  const schedContainer = document.getElementById('siswa-ringkasan-jadwal-list');
  if (!schedContainer) return;

  if (!window.allSchedulesData || window.allSchedulesData.length === 0) {
    await loadAllSchedulesData();
  }

  const todayTime = new Date().setHours(0, 0, 0, 0);
  const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const subjectColors = {
    'Karakter': { color: 'orange', badge: 'badge-orange' },
    'English': { color: 'teal', badge: 'badge-teal' },
    'Matematika': { color: 'green', badge: 'badge-green' },
    'Outdoor Learning': { color: 'orange', badge: 'badge-orange' }
  };

  const engLevel = String(student?.kelas_english || '').trim().toUpperCase();
  const mathLevel = String(student?.kelas_math || '').trim().toUpperCase();

  const upcoming = (window.allSchedulesData || []).filter(item => {
    if (!item || !item.date) return false;
    const k = String(item.kelas || '').trim().toUpperCase();
    const matches = (!k || k === 'SEMUA' || k === 'SEMUA KELAS' || (engLevel && k === engLevel) || (mathLevel && k === mathLevel));
    if (!matches) return false;
    const [y, m, d] = String(item.date).split('T')[0].split('-').map(Number);
    const schedDate = new Date(y, m - 1, d).setHours(0, 0, 0, 0);
    return schedDate >= todayTime;
  });

  upcoming.sort((a, b) => {
    const dComp = String(a.date || '').localeCompare(String(b.date || ''));
    if (dComp !== 0) return dComp;
    return String(a.start_time || '').localeCompare(String(b.start_time || ''));
  });

  const top3 = upcoming.slice(0, 3);
  if (top3.length === 0) {
    schedContainer.innerHTML = '<p style="padding:1.5rem; color:var(--text-muted); text-align:center;"><i class="fas fa-calendar-check" style="font-size:2rem; display:block; margin-bottom:0.5rem; opacity:0.5;"></i>Belum ada jadwal kelas mendatang untuk Anda.</p>';
  } else {
    let html = '';
    top3.forEach(item => {
      const subject = item.mata_pelajaran || 'Karakter';
      const dateStr = item.date ? String(item.date).split('T')[0] : '';
      const kelasRaw = item.kelas ? String(item.kelas) : '';
      const kelasLabel = kelasRaw ? (kelasRaw.toUpperCase() === 'SEMUA' ? 'Semua Kelas' : kelasRaw) : 'Semua Kelas';

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
      const timeStr = (item.start_time && item.end_time) ? `${item.start_time}–${item.end_time} WITA` : (item.start_time ? `${item.start_time} WITA` : '14:00 WITA');
      const lokasiStr = item.lokasi || 'Kelas Pojok Hope';

      const studentLinkBtn = item.link_materi_siswa ? `
        <div style="margin-top:0.4rem;">
          <a href="${item.link_materi_siswa}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="padding:0.25rem 0.6rem; font-size:0.75rem; display:inline-flex; align-items:center; gap:0.35rem; color:#e67e22; border-color:#e67e22;">
            <i class="fab fa-youtube text-orange"></i> Buka Materi Belajar
          </a>
        </div>
      ` : '';

      html += `
        <div class="schedule-item">
          <div class="schedule-date ${styleConfig.color}"><span class="date-day">${day}</span><span class="date-month">${monthStr}</span></div>
          <div class="schedule-details">
            <h4>${subject}</h4>
            <p><i class="far fa-clock"></i> ${timeStr} &nbsp;|&nbsp; <i class="fas fa-map-marker-alt"></i> ${lokasiStr}</p>
            <span class="badge ${styleConfig.badge}" style="font-size:0.7rem; padding:0.15rem 0.45rem;">${kelasLabel}</span>
            ${studentLinkBtn}
          </div>
        </div>
      `;
    });
    schedContainer.innerHTML = html;
  }
}

export async function renderSiswaSummary() {
  try {
    if (!window.allStudents || window.allStudents.length === 0) {
      await loadAllStudents();
    }
    if (!window.allSchedulesData || window.allSchedulesData.length === 0) {
      await loadAllSchedulesData();
    }

    const loggedInUser = window.currentUser;
    const targetId = (loggedInUser && (loggedInUser.student_id || loggedInUser.id)) 
      ? parseInt(loggedInUser.student_id || loggedInUser.id, 10) 
      : (window.selectedStudentKey || 1);
    const student = (window.allStudents || []).find(s => s.id === targetId) || (window.allStudents || [])[0];

    if (!student) return;

    const welcomeHeading = document.querySelector('#ringkasan-siswa .welcome-text h2');
    if (welcomeHeading) {
      const nick = student.nickname || (student.full_name || student.name || 'Siswa').split(' ')[0];
      welcomeHeading.innerHTML = `Selamat datang kembali, ${nick}! 👋`;
    }

    const engBadge = document.getElementById('siswa-level-english-badge');
    const mathBadge = document.getElementById('siswa-level-math-badge');
    if (engBadge) {
      const text = student.kelas_english || 'English: Belum ditentukan';
      engBadge.innerHTML = `<i class="fas fa-language"></i> ${text.startsWith('English') ? text : 'English: ' + text}`;
    }
    if (mathBadge) {
      const text = student.kelas_math || 'Math: Belum ditentukan';
      mathBadge.innerHTML = `<i class="fas fa-calculator"></i> ${text.startsWith('Math') ? text : 'Math: ' + text}`;
    }

    const statEng = document.getElementById('stat-english-grade');
    const statMath = document.getElementById('stat-math-grade');

    const setTraitScore = (scoreId, value) => {
      const el = document.getElementById(scoreId);
      if (el) {
        el.textContent = `${value} / 100`;
        const box = el.closest('.trait-progress-box');
        if (box) {
          const bar = box.querySelector('.progress-bar');
          if (bar) bar.style.width = `${value}%`;
        }
      }
    };

    let evalScoreEng = '0';
    let evalScoreMath = '0';
    try {
      const evRes = await fetch(`http://localhost:5000/api/evaluations?student_id=${student.id}`);
      if (evRes.ok) {
        const evData = await evRes.json();
        const evList = Array.isArray(evData) ? evData : [];
        if (evList.length > 0) {
          const latest = evList[evList.length - 1];
          const sEmp = latest.score_empathy ?? 0;
          const sHon = latest.score_honesty ?? 0;
          const sResp = latest.score_responsibility ?? 0;
          const sRespct = latest.score_respect ?? 0;
          const sFlu = latest.score_fluency ?? 0;
          const sRead = latest.score_reading ?? 0;
          const sLog = latest.score_logic ?? 0;
          const sArith = latest.score_arithmetic ?? 0;

          setTraitScore('score-empathy', sEmp);
          setTraitScore('score-honesty', sHon);
          setTraitScore('score-responsibility', sResp);
          setTraitScore('score-respect', sRespct);
          setTraitScore('score-eng-fluency', sFlu);
          setTraitScore('score-eng-reading', sRead);
          setTraitScore('score-math-logic', sLog);
          setTraitScore('score-math-arith', sArith);

          evalScoreEng = Math.round((sFlu + sRead) / 2);
          evalScoreMath = Math.round((sLog + sArith) / 2);
        } else {
          ['score-empathy', 'score-honesty', 'score-responsibility', 'score-respect',
           'score-eng-fluency', 'score-eng-reading', 'score-math-logic', 'score-math-arith'].forEach(id => setTraitScore(id, 0));
        }
      }
    } catch (e) {
      console.warn('Error fetching student evaluation scores:', e);
    }
    if (statEng) statEng.textContent = evalScoreEng;
    if (statMath) statMath.textContent = evalScoreMath;

    try {
      const res = await fetch(`http://localhost:5000/api/attendance?student_id=${student.id}`);
      if (res.ok) {
        const records = await res.json();
        const attList = Array.isArray(records) ? records : (records.data || []);
        if (attList.length > 0) {
          const hadirCount = attList.filter(r => r.status === 'Hadir').length;
          const pct = Math.round((hadirCount / attList.length) * 100);
          const statAtt = document.getElementById('stat-attendance');
          const attPct = document.getElementById('attendance-percent');
          if (statAtt) statAtt.textContent = `${pct}%`;
          if (attPct) attPct.textContent = `${pct}%`;
        }
      }
    } catch (e) {
      console.warn('Error fetching attendance for siswa summary:', e);
    }

    await renderJadwalSiswa(student);

  } catch (err) {
    console.error('renderSiswaSummary error:', err);
  }
}
