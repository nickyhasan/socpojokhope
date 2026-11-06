/**
 * js/dashboard/student.js
 * Student specific dashboard rendering and live attendance calendar.
 */

import { loadAllStudents, loadAllSchedulesData } from './api.js';
import { formatStudentDisplayName, SEMESTER_CONFIG, parseSemesterKey, initSemesterSelector, applySemesterPeriod } from './ui.js';

export { SEMESTER_CONFIG, parseSemesterKey, initSemesterSelector, applySemesterPeriod };

export async function renderStudentLiveCalendar() {
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
    records = Array.isArray(records) ? records : (records.data || []);

    // 1. Group records by semester key (e.g. 2026-1, 2026-2)
    const semMap = {};
    records.forEach(rec => {
      if (!rec.date) return;
      const parts = rec.date.split('T')[0].split('-');
      if (parts.length < 2) return;
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const semKey = `${y}-${m <= 6 ? 1 : 2}`;
      if (!semMap[semKey]) semMap[semKey] = [];
      semMap[semKey].push(rec);
    });

    const distinctSemesters = Object.keys(semMap).sort().reverse();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    const defaultSemesterKey = currentMonth <= 6 ? `${currentYear}-1` : `${currentYear}-2`;

    const semContainer = document.getElementById('student-att-semester-container');
    const semSelect = document.getElementById('student-att-semester-select');
    const multiSemContainer = document.getElementById('student-att-multi-sem-container');
    const multiSemTbody = document.getElementById('student-att-multi-sem-tbody');

    // Multi-semester handling: show dropdown and history table if records span > 1 semester
    if (distinctSemesters.length > 1) {
      if (semContainer) semContainer.style.display = 'flex';
      if (multiSemContainer) multiSemContainer.style.display = 'block';

      if (semSelect && !semSelect._populated) {
        semSelect.innerHTML = distinctSemesters.map(k => {
          const cfg = SEMESTER_CONFIG[k] || { label: k };
          return `<option value="${k}">${cfg.label}</option>`;
        }).join('');
        semSelect.value = distinctSemesters.includes(defaultSemesterKey) ? defaultSemesterKey : distinctSemesters[0];
        semSelect._populated = true;
        semSelect.onchange = () => {
          populateMonthSelector(semSelect.value);
        };
      }

      // Populate multi-semester summary table
      if (multiSemTbody) {
        multiSemTbody.innerHTML = distinctSemesters.map(k => {
          const sRecs = semMap[k] || [];
          let h = 0, s = 0, i = 0, a = 0;
          const dateMap = {};
          sRecs.forEach(r => {
            const d = r.date.split('T')[0];
            dateMap[d] = r.status;
          });
          Object.values(dateMap).forEach(st => {
            if (st === 'Hadir') h++;
            else if (st === 'Sakit') s++;
            else if (st === 'Izin') i++;
            else if (st === 'Alpa') a++;
          });
          const tot = h + s + i + a;
          const pct = tot > 0 ? Math.round((h / tot) * 100) : 0;
          const cfg = SEMESTER_CONFIG[k] || { label: k };
          return `
            <tr style="border-bottom: 1px solid var(--border-color);">
              <td style="padding: 0.65rem 1rem; font-weight: 700; color: var(--color-secondary-dark);">${cfg.label}</td>
              <td style="padding: 0.65rem 1rem; text-align: center;"><span class="badge badge-green">${h}</span></td>
              <td style="padding: 0.65rem 1rem; text-align: center;"><span class="badge badge-teal">${s}</span></td>
              <td style="padding: 0.65rem 1rem; text-align: center;"><span class="badge badge-orange">${i}</span></td>
              <td style="padding: 0.65rem 1rem; text-align: center;"><span class="badge badge-danger">${a}</span></td>
              <td style="padding: 0.65rem 1rem; text-align: center; font-weight: 700; color: var(--color-primary-dark);">${pct}%</td>
            </tr>
          `;
        }).join('');
      }
    } else {
      if (semContainer) semContainer.style.display = 'none';
      if (multiSemContainer) multiSemContainer.style.display = 'none';
    }

    // 2. Month Selector population and scoping
    const monthSelect = document.getElementById('student-att-month-select');

    function populateMonthSelector(selectedSemKey) {
      const semKey = selectedSemKey || (semSelect ? semSelect.value : defaultSemesterKey) || defaultSemesterKey;
      const [yStr, halfStr] = semKey.split('-');
      const y = parseInt(yStr || currentYear, 10);
      const isHalf1 = (halfStr === '1');

      const halfMonths = isHalf1
        ? [
            { num: 1, name: 'Januari' },
            { num: 2, name: 'Februari' },
            { num: 3, name: 'Maret' },
            { num: 4, name: 'April' },
            { num: 5, name: 'Mei' },
            { num: 6, name: 'Juni' }
          ]
        : [
            { num: 7, name: 'Juli' },
            { num: 8, name: 'Agustus' },
            { num: 9, name: 'September' },
            { num: 10, name: 'Oktober' },
            { num: 11, name: 'November' },
            { num: 12, name: 'Desember' }
          ];

      if (monthSelect) {
        monthSelect.innerHTML = halfMonths.map(m => {
          return `<option value="${m.num}">${m.name} ${y}</option>`;
        }).join('');

        // Default to real-time month if in this semester, otherwise first month of semester
        const matchRealTime = halfMonths.find(m => m.num === currentMonth && y === currentYear);
        if (matchRealTime) {
          monthSelect.value = String(matchRealTime.num);
        } else {
          monthSelect.value = String(halfMonths[0].num);
        }

        monthSelect.onchange = () => {
          renderGridForMonth(y, parseInt(monthSelect.value, 10));
        };
      }

      const activeMonthNum = monthSelect ? parseInt(monthSelect.value, 10) : currentMonth;
      renderGridForMonth(y, activeMonthNum);
    }

    // 3. Render Calendar Grid and 5 Summary Cards
    function renderGridForMonth(year, month) {
      const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];

      const calTitle = document.getElementById('student-att-calendar-title');
      if (calTitle) {
        calTitle.innerHTML = `<i class="fas fa-calendar text-teal"></i> Kalender Kehadiran - ${monthNames[month - 1]} ${year}`;
      }

      // Map of date string -> latest status
      const latestRecordsMap = {};
      records.forEach(record => {
        if (!record.date) return;
        const dStr = record.date.split('T')[0];
        if (dStr.startsWith(monthPrefix)) {
          latestRecordsMap[dStr] = {
            status: record.status,
            mata_pelajaran: record.mata_pelajaran || 'Karakter'
          };
        }
      });

      let hadirCount = 0;
      let sakitCount = 0;
      let izinCount = 0;
      let alpaCount = 0;

      Object.keys(latestRecordsMap).forEach(dStr => {
        const st = latestRecordsMap[dStr].status;
        if (st === 'Hadir') hadirCount++;
        else if (st === 'Sakit') sakitCount++;
        else if (st === 'Izin') izinCount++;
        else if (st === 'Alpa') alpaCount++;
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

      // Build Calendar Grid HTML
      let gridHtml = `
        <div class="cal-day-name">Min</div>
        <div class="cal-day-name">Sen</div>
        <div class="cal-day-name">Sel</div>
        <div class="cal-day-name">Rab</div>
        <div class="cal-day-name">Kam</div>
        <div class="cal-day-name">Jum</div>
        <div class="cal-day-name">Sab</div>
      `;

      const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0 = Sunday
      const daysInMonth = new Date(year, month, 0).getDate();

      // Empty leading slots
      for (let i = 0; i < firstDayIndex; i++) {
        gridHtml += `<div class="cal-day empty"></div>`;
      }

      // Day cells
      for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const record = latestRecordsMap[dayStr];
        const status = record ? record.status : '';

        const dayOfWeek = new Date(year, month - 1, day).getDay();
        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

        let dayClass = isWeekend ? 'day-weekend' : 'day-no-class';
        if (status === 'Hadir') dayClass = 'day-hadir';
        else if (status === 'Sakit') dayClass = 'day-sakit';
        else if (status === 'Izin') dayClass = 'day-izin';
        else if (status === 'Alpa') dayClass = 'day-alpa';

        const titleAttr = record
          ? `${record.mata_pelajaran} - ${record.status}`
          : (isWeekend ? 'Akhir Pekan' : 'Tidak Ada Kelas');

        gridHtml += `
          <div class="cal-day ${dayClass}" title="${titleAttr}">
            <span class="day-num">${day}</span>
          </div>
        `;
      }

      calendarContainer.innerHTML = gridHtml;
    }

    // Initial load for month selector and grid
    const initialSemKey = (semSelect && semSelect.value) ? semSelect.value : defaultSemesterKey;
    populateMonthSelector(initialSemKey);

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

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const subjectColors = {
    'Karakter': { color: 'orange', badge: 'badge-orange' },
    'English': { color: 'teal', badge: 'badge-teal' },
    'Matematika': { color: 'green', badge: 'badge-green' },
    'Outdoor Learning': { color: 'orange', badge: 'badge-orange' },
    'Calistung': { color: 'teal', badge: 'badge-teal' }
  };

  const rawEng = String(student?.kelas_english || '').trim();
  const rawMath = String(student?.kelas_math || '').trim();
  const engLevel = (typeof window.normalizeScheduleClass === 'function' ? window.normalizeScheduleClass(rawEng, 'English') : rawEng).toUpperCase();
  const mathLevel = (typeof window.normalizeScheduleClass === 'function' ? window.normalizeScheduleClass(rawMath, 'Matematika') : rawMath).toUpperCase();
  const isCalistungStudent = rawEng.toUpperCase().includes('CALISTUNG') || rawMath.toUpperCase().includes('CALISTUNG');

  const upcoming = (window.allSchedulesData || []).filter(item => {
    if (!item) return false;
    const subj = item.mata_pelajaran || 'Karakter';
    const normK = (typeof window.normalizeScheduleClass === 'function' ? window.normalizeScheduleClass(item.kelas, subj) : (item.kelas || '')).trim().toUpperCase();
    const isUniversal = !normK || normK === 'SEMUA' || normK === 'SEMUA KELAS' || subj === 'Karakter' || subj === 'Outdoor Learning';
    const isCalistungMatch = (subj === 'Calistung' || normK === 'CALISTUNG') && isCalistungStudent;
    const matches = isUniversal || isCalistungMatch || (engLevel && normK === engLevel) || (mathLevel && normK === mathLevel);
    if (!matches) return false;
    const dStr = String(item.tanggal || item.date || '').slice(0, 10);
    return dStr >= todayStr;
  });

  upcoming.sort((a, b) => {
    const aDate = String(a.tanggal || a.date || '').slice(0, 10);
    const bDate = String(b.tanggal || b.date || '').slice(0, 10);
    const dComp = aDate.localeCompare(bDate);
    if (dComp !== 0) return dComp;
    return String(a.start_time || '').localeCompare(String(b.start_time || ''));
  });

  const top3 = upcoming.slice(0, 3);
  if (top3.length === 0) {
    schedContainer.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.9rem;">Belum ada jadwal kelas mendatang yang terdaftar.</div>';
  } else {
    let html = '';
    top3.forEach(item => {
      const subject = item.mata_pelajaran || 'Karakter';
      const dateStr = String(item.tanggal || item.date || '').slice(0, 10);
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

    // Render Top 10 Siswa (Global) in Siswa Summary
    const top10Container = document.getElementById('siswa-top10-students-list');
    if (top10Container) {
      const activeStudents = (window.allStudents || []).filter(st => {
        const s = String(st.status_siswa || 'aktif').toLowerCase();
        return s !== 'alumni' && s !== 'lulus';
      });
      const withStars = activeStudents.filter(s => Number(s.stars || s.bintang || 0) >= 1);
      if (withStars.length === 0) {
        top10Container.innerHTML = '<div style="padding:1.25rem; text-align:center; color:var(--text-muted); font-size:0.9rem;">Belum ada siswa yang memperoleh bintang keaktifan.</div>';
      } else {
        const sortedStudents = [...withStars].sort((a, b) => {
          const starA = Number(a.stars || a.bintang || 0);
          const starB = Number(b.stars || b.bintang || 0);
          if (starB !== starA) return starB - starA;
          const scoreA = Number(a.avg_score || 0);
          const scoreB = Number(b.avg_score || 0);
          return scoreB - scoreA;
        });
        const top10 = sortedStudents.slice(0, 10);
        let html = '<div style="display:flex; flex-direction:column; gap:0.5rem; padding-bottom:0.25rem;">';
        top10.forEach((st, idx) => {
          const rank = idx + 1;
          let rankBadgeStyle = 'background: rgba(0,0,0,0.05); color: var(--text-dark); font-weight: 700;';
          let rankIcon = `<span style="font-size:0.85rem;">#${rank}</span>`;
          if (rank === 1) {
            rankBadgeStyle = 'background: #fef3c7; color: #d97706; font-weight: 800;';
            rankIcon = '<i class="fas fa-medal" style="font-size: 1.05rem;" title="Juara 1"></i>';
          } else if (rank === 2) {
            rankBadgeStyle = 'background: #f1f5f9; color: #475569; font-weight: 800;';
            rankIcon = '<i class="fas fa-medal" style="font-size: 1.05rem;" title="Juara 2"></i>';
          } else if (rank === 3) {
            rankBadgeStyle = 'background: #ffedd5; color: #c2410c; font-weight: 800;';
            rankIcon = '<i class="fas fa-medal" style="font-size: 1.05rem;" title="Juara 3"></i>';
          }
          const starsVal = Number(st.stars || st.bintang || 0);
          const photoSrc = (st.photo_url && st.photo_url.trim()) ? st.photo_url : 'static/src/assets/ui/logo.png';
          html += `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:0.6rem 0.85rem; background:var(--bg-contrast); border-radius:var(--border-radius-sm); border:1px solid var(--border-color);">
              <div style="display:flex; align-items:center; gap:0.75rem;">
                <span style="width:36px; height:36px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; ${rankBadgeStyle}">
                  ${rankIcon}
                </span>
                <img src="${photoSrc}" alt="${st.full_name || 'Siswa'}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:1.5px solid var(--border-color); flex-shrink:0;" onerror="this.onerror=null; this.src='static/src/assets/ui/logo.png';">
                <div>
                  <h5 style="margin:0; font-size:0.9rem; color:var(--color-secondary-dark); font-weight:700;">${st.nickname ? `${(st.full_name || st.name || '').trim()} (${st.nickname})` : (st.full_name || st.name || 'Siswa')}</h5>
                  <div style="display:flex; gap:0.3rem; flex-wrap:wrap; margin-top:0.2rem;">
                    ${st.kelas_english ? `<span class="badge badge-teal" style="font-size:0.68rem; padding:0.1rem 0.4rem;">${st.kelas_english}</span>` : ''}
                    ${st.kelas_math ? `<span class="badge badge-green" style="font-size:0.68rem; padding:0.1rem 0.4rem;">${st.kelas_math}</span>` : ''}
                  </div>
                </div>
              </div>
              <div style="display:flex; align-items:center; gap:0.75rem;">
                <span class="text-orange" style="font-weight:700; font-size:0.85rem;" title="Bintang Karakter">
                  <i class="fas fa-star"></i> ${starsVal} Bintang
                </span>
              </div>
            </div>
          `;
        });
        html += '</div>';
        top10Container.innerHTML = html;
      }
    }

    await renderJadwalSiswa(student);

    // If student is alumni, render and populate graduation certificate in Rapor
    renderAlumniCertificate(student);

  } catch (err) {
    console.error('renderSiswaSummary error:', err);
  }
}
window.renderSiswaSummary = renderSiswaSummary;
window.renderStudentSummary = renderSiswaSummary;
export const renderStudentSummary = renderSiswaSummary;

// =====================================================
// ALUMNI GRADUATION CERTIFICATE RENDERING & ACTIONS
// =====================================================
export function renderAlumniCertificate(student) {
  const certContainer = document.getElementById('alumni-certificate-container');
  if (!certContainer) return;

  if (!student) {
    certContainer.style.display = 'none';
    return;
  }

  const isAlumni = (student.status_siswa === 'alumni') || (window.isViewingAlumniRapor && student.status_siswa === 'alumni');
  if (!isAlumni) {
    certContainer.style.display = 'none';
    return;
  }

  certContainer.style.display = 'block';

  const nameEl = document.getElementById('cert-student-name');
  const nisEl = document.getElementById('cert-student-nis');
  const dateEl = document.getElementById('cert-date');
  const predEl = document.getElementById('cert-predicate');
  const numEl = document.getElementById('cert-number');

  const sName = student.full_name || student.name || 'Siswa';
  const sNis = student.nis || '-';
  let sDate = '25 Oktober 2026';
  let sYear = '2026';

  if (student.graduated_at) {
    try {
      const gd = new Date(student.graduated_at);
      if (!isNaN(gd.getTime())) {
        sYear = String(gd.getFullYear());
        sDate = gd.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      }
    } catch (e) {}
  }

  if (nameEl) nameEl.textContent = sName;
  if (nisEl) nisEl.textContent = `NIS: ${sNis}`;
  if (dateEl) dateEl.textContent = sDate;
  if (numEl) numEl.textContent = `Nomor: ${sYear}/SoC-PH/ALUMNI/${String(student.id || 1).padStart(3, '0')}`;

  const avg = Number(student.avg_score || 0);
  let predicate = 'DENGAN PUJIAN (CUM LAUDE)';
  if (avg > 0 && avg < 85) predicate = 'SANGAT MEMUASKAN';
  if (predEl) predEl.textContent = predicate;
}
window.renderAlumniCertificate = renderAlumniCertificate;

export function printAlumniCertificate() {
  const el = document.getElementById('alumni-certificate-render-area');
  if (!el) return;
  const printWin = window.open('', '_blank', 'width=950,height=750');
  if (!printWin) {
    alert('Pop-up window diblokir oleh browser. Izinkan pop-up untuk mencetak sertifikat.');
    return;
  }
  printWin.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Sertifikat Kelulusan - School of Character Pojok Hope</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
          @page { size: A4 landscape; margin: 1.2cm; }
          body { margin: 0; padding: 20px; font-family: 'Georgia', serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #cert-print-wrap { width: 100%; box-sizing: border-box; }
        </style>
      </head>
      <body>
        <div id="cert-print-wrap">${el.outerHTML}</div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 350);
          };
        <\/script>
      </body>
    </html>
  `);
  printWin.document.close();
}
window.printAlumniCertificate = printAlumniCertificate;

export async function downloadAlumniCertificate() {
  const el = document.getElementById('alumni-certificate-render-area');
  if (!el) return;
  try {
    if (typeof html2canvas === 'undefined') {
      alert('Modul html2canvas belum siap. Silakan gunakan tombol Cetak Sertifikat.');
      return;
    }
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const nis = (document.getElementById('cert-student-nis')?.textContent || '').replace(/[^0-9]/g, '') || 'alumni';
    const link = document.createElement('a');
    link.download = `Sertifikat_Kelulusan_SoC_${nis}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    console.error('Download certificate error:', err);
    alert('Gagal mengunduh sertifikat: ' + err.message);
  }
}
window.downloadAlumniCertificate = downloadAlumniCertificate;
