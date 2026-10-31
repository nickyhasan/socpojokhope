// =====================================================
// MANAGER & ADMIN MODULE (js/dashboard/manager.js)
// =====================================================
import { formatStudentDisplayName, findStudentByInputValue, switchView, formatTeacherName, formatClassName, getRawClassName } from './ui.js';
import { loadAllStudents, loadAllSchedulesData, loadSchedules, loadManagerSchedules, loadRaporData } from './api.js';
import { renderJadwalKelas } from './teacher.js';

export async function renderManagerSummary() {
  const upcomingContainer = document.getElementById('manager-upcoming-schedules') || document.getElementById('manager-ringkasan-jadwal-list');
  const top10Container = document.getElementById('top10-students-list');

  try {
    const loggedInUser = window.currentUser || {};
    const currentRole = window.currentRole || 'manager';
    const name = (window.currentUser && (window.currentUser.full_name || window.currentUser.nama)) || (loggedInUser && (loggedInUser.full_name || loggedInUser.nama)) || (currentRole === 'admin' ? 'Administrator' : 'Manager');
    const welcomeEl = document.getElementById('manager-welcome-name') || document.querySelector('#ringkasan-manager .welcome-text h2');
    if (welcomeEl) welcomeEl.textContent = `Selamat datang, ${name}! 👋`;

    if (!window.allSchedulesData || window.allSchedulesData.length === 0) {
      await loadAllSchedulesData();
    }
    if (!window.allStudents || window.allStudents.length === 0) {
      await loadAllStudents();
    }

    const schedules = Array.isArray(window.allSchedulesData) ? window.allSchedulesData : [];
    const students = Array.isArray(window.allStudents) ? window.allStudents : [];

    if (schedules.length === 0 && upcomingContainer) {
      upcomingContainer.innerHTML = '<div class="alert alert-info" style="margin:1rem;">Belum ada data untuk ditampilkan.</div>';
    }
    if (students.length === 0 && top10Container) {
      top10Container.innerHTML = '<div class="alert alert-info" style="margin:1rem;">Belum ada data untuk ditampilkan.</div>';
    }

    // 1. Render upcoming schedules (or 4 most recent fallback)
    if (upcomingContainer && schedules.length > 0) {
      const todayTime = new Date().setHours(0, 0, 0, 0);
      const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const subjectColors = {
        'Karakter': { color: 'orange', badge: 'badge-orange' },
        'English': { color: 'teal', badge: 'badge-teal' },
        'Matematika': { color: 'green', badge: 'badge-green' },
        'Outdoor Learning': { color: 'orange', badge: 'badge-orange' }
      };

      const upcoming = schedules.filter(s => {
        if (!s || !s.date) return false;
        const [y, m, d] = String(s.date).split('T')[0].split('-').map(Number);
        return new Date(y, m - 1, d).setHours(0, 0, 0, 0) >= todayTime;
      });

      let displaySchedules = [];
      if (upcoming.length > 0) {
        upcoming.sort((a, b) => {
          const dComp = String(a.date || '').localeCompare(String(b.date || ''));
          if (dComp !== 0) return dComp;
          return String(a.start_time || '').localeCompare(String(b.start_time || ''));
        });
        displaySchedules = upcoming.slice(0, 4);
      } else {
        // Fallback: 4 most recent schedules sorted descending
        const recent = [...schedules].sort((a, b) => {
          const dComp = String(b.date || '').localeCompare(String(a.date || ''));
          if (dComp !== 0) return dComp;
          return String(b.start_time || '').localeCompare(String(a.start_time || ''));
        });
        displaySchedules = recent.slice(0, 4);
      }

      if (displaySchedules.length === 0) {
        upcomingContainer.innerHTML = '<div class="alert alert-info" style="margin:1rem;">Belum ada data untuk ditampilkan.</div>';
      } else {
        let html = '';
        displaySchedules.forEach(item => {
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
            linksList.push(`<a href="${teacherModulLink}" target="_blank" rel="noopener noreferrer" class="badge badge-teal" style="text-decoration:none; display:inline-flex; align-items:center; gap:0.35rem; padding:0.3rem 0.55rem;"><i class="fab fa-google-drive"></i> Modul Guru</a>`);
          }
          if (item.link_materi_siswa) {
            linksList.push(`<a href="${item.link_materi_siswa}" target="_blank" rel="noopener noreferrer" class="badge badge-orange" style="text-decoration:none; display:inline-flex; align-items:center; gap:0.35rem; padding:0.3rem 0.55rem;"><i class="fab fa-youtube"></i> Materi Siswa</a>`);
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
        upcomingContainer.innerHTML = html;
      }
    }

    // 2. Render ALL students (sorted by stars) without filtering by class
    await renderTop10Students();

  } catch (err) {
    console.error("renderManagerSummary error:", err);
    if (upcomingContainer) upcomingContainer.innerHTML = '<div class="alert alert-info" style="margin:1rem;">Belum ada data untuk ditampilkan.</div>';
    if (top10Container) top10Container.innerHTML = '<div class="alert alert-info" style="margin:1rem;">Belum ada data untuk ditampilkan.</div>';
  }
}
window.renderManagerSummary = renderManagerSummary;

export async function renderTop10Students() {
  const top10Container = document.getElementById('top10-students-list');
  if (!top10Container) return;

  try {
    if (!window.allStudents || window.allStudents.length === 0) {
      await loadAllStudents();
    }
    const students = Array.isArray(window.allStudents) ? window.allStudents : [];

    if (students.length === 0) {
      top10Container.innerHTML = '<div class="alert alert-info" style="margin:1rem;">Belum ada data untuk ditampilkan.</div>';
      return;
    }

    // Filter active students only (exclude alumni) and require at least 1 star
    const activeStudents = students.filter(st => {
      const s = String(st.status_siswa || 'aktif').toLowerCase();
      return s !== 'alumni' && s !== 'lulus';
    });

    const withStars = activeStudents.filter(s => Number(s.stars || s.bintang || 0) >= 1);

    if (withStars.length === 0) {
      top10Container.innerHTML = '<div style="padding:1.25rem; text-align:center; color:var(--text-muted); font-size:0.9rem;">Belum ada siswa yang memperoleh bintang keaktifan.</div>';
      return;
    }

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
              <h5 style="margin:0; font-size:0.9rem; color:var(--color-secondary-dark); font-weight:700;">${formatStudentDisplayName(st)}</h5>
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
  } catch (err) {
    console.error("renderTop10Students error:", err);
    top10Container.innerHTML = '<div class="alert alert-info" style="margin:1rem;">Belum ada data untuk ditampilkan.</div>';
  }
}
window.renderTop10Students = renderTop10Students;

export async function renderDataSiswaTable() {
  const tbody = document.getElementById('data-siswa-tbody');
  if (!tbody) return;

  // Ensure Delete Mode Toggle is wired up
  window.isDeleteStudentMode = window.isDeleteStudentMode || false;
  const btnHapusSemua = document.getElementById('btn-admin-hapus-semua');
  if (btnHapusSemua && !btnHapusSemua._hasDeleteModeListener) {
    btnHapusSemua._hasDeleteModeListener = true;
    btnHapusSemua.addEventListener('click', () => {
      window.isDeleteStudentMode = !window.isDeleteStudentMode;
      if (window.isDeleteStudentMode) {
        btnHapusSemua.innerHTML = '<i class="fas fa-times"></i> Batal Hapus';
        btnHapusSemua.style.background = '#e2e8f0';
        btnHapusSemua.style.color = '#334155';
        btnHapusSemua.style.border = '1px solid #94a3b8';
      } else {
        btnHapusSemua.innerHTML = '<i class="fas fa-trash-alt"></i> Hapus Siswa';
        btnHapusSemua.style.background = '#fee2e2';
        btnHapusSemua.style.color = '#b91c1c';
        btnHapusSemua.style.border = '1px solid #f87171';
      }
      renderDataSiswaTable();
    });
  }

  if (!window.allStudents || window.allStudents.length === 0) {
    // Skeleton loader rows while loading
    tbody.innerHTML = Array(5).fill(0).map(() => `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 0.75rem 1rem; text-align: center;"><div class="skeleton skeleton-text" style="width: 25px; margin: 0 auto;"></div></td>
        <td style="padding: 0.75rem 1rem;"><div class="skeleton skeleton-text" style="width: 75px;"></div></td>
        <td style="padding: 0.75rem 1rem;"><div class="skeleton skeleton-text" style="width: 150px;"></div></td>
        <td style="padding: 0.75rem 1rem; text-align: center;"><div class="skeleton skeleton-text" style="width: 25px; margin: 0 auto;"></div></td>
        <td style="padding: 0.75rem 1rem; text-align: center;"><div class="skeleton skeleton-text" style="width: 130px; margin: 0 auto;"></div></td>
        <td style="padding: 0.75rem 1rem; text-align: center;"><div class="skeleton skeleton-text" style="width: 140px; margin: 0 auto;"></div></td>
      </tr>
    `).join('');
    await loadAllStudents();
  }

  const students = window.allStudents || [];
  const searchInput = document.getElementById('search-data-siswa');
  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

  const filtered = students.filter(s => {
    if (s.status_siswa === 'alumni') {
      return false;
    }
    if ((s.role && s.role.toLowerCase() === 'admin') || ['0025001', '1001001'].includes(String(s.id)) || ['0025001', '1001001'].includes(String(s.nis)) || (s.username && s.username.toLowerCase() === 'admin')) {
      return false;
    }
    if (!query) return true;
    const idStr = String(s.id || '');
    const nisStr = String(s.nis || '').toLowerCase();
    const nameStr = String(s.full_name || s.name || '').toLowerCase();
    const engStr = String(s.kelas_english || '').toLowerCase();
    const mathStr = String(s.kelas_math || '').toLowerCase();
    return idStr.includes(query) || nisStr.includes(query) || nameStr.includes(query) || engStr.includes(query) || mathStr.includes(query);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted); font-size:0.9rem;">Tidak ada data siswa ditemukan.</td></tr>`;
    return;
  }

  let html = '';
  filtered.forEach((student, index) => {
    const sNo = index + 1;
    // Pure database values: no fake fallbacks or dummy calculations
    const sNis = student.nis || '-';
    const sName = student.full_name || student.name || formatStudentDisplayName(student);
    const rawG = String(student.gender || student.jenis_kelamin || '').trim().toUpperCase();
    const sGender = rawG.startsWith('P') ? 'P' : (rawG.startsWith('L') ? 'L' : '-');
    const isMale = sGender === 'L';
    
    const rawEng = student.kelas_english;
    const rawMath = student.kelas_math;
    const hasEng = rawEng && rawEng !== 'Belum Ditentukan' && rawEng !== 'null' && String(rawEng).trim() !== '';
    const hasMath = rawMath && rawMath !== 'Belum Ditentukan' && rawMath !== 'null' && String(rawMath).trim() !== '';

    const engBadge = hasEng ? `<span class="badge badge-teal" style="font-size:0.75rem;">${formatClassName(rawEng)}</span>` : `<span class="badge badge-outline">Belum Ditentukan</span>`;
    const mathBadge = hasMath ? `<span class="badge badge-green" style="font-size:0.75rem;">${formatClassName(rawMath)}</span>` : `<span class="badge badge-outline">Belum Ditentukan</span>`;

    const sNameSafe = String(sName).split("'").join("\\'");

    let actionButtonsHtml = '';
    if (window.isDeleteStudentMode) {
      actionButtonsHtml = `
        <button onclick="confirmDeleteStudent(${student.id}, '${sNameSafe}')" class="btn btn-sm btn-danger" style="background:#fee2e2; color:#b91c1c; border:1px solid #f87171; display:inline-flex; align-items:center; gap:0.4rem; padding: 0.35rem 0.85rem; font-weight:600;" title="Hapus Siswa">
          <i class="fas fa-trash-alt"></i> Hapus
        </button>
      `;
    } else {
      actionButtonsHtml = `
        <button onclick="viewRaporFromTable(${student.id})" class="btn btn-sm btn-outline"><i class="fas fa-file-invoice"></i> Rapor</button>
        <button onclick="viewDetailSiswa(${student.id})" class="btn btn-sm btn-primary"><i class="fas fa-id-card"></i> Data Siswa</button>
      `;
    }

    html += `
      <tr style="border-bottom: 1px solid var(--border-color); font-size: 0.9rem;">
        <td style="padding: 0.75rem 1rem; text-align: center !important; vertical-align: middle; font-weight: 600;">${sNo}</td>
        <td style="padding: 0.75rem 1rem; text-align: center !important; vertical-align: middle; font-family: monospace; font-size: 0.85rem; font-weight: 600; color: var(--color-primary-dark);">${sNis}</td>
        <td style="padding: 0.75rem 1rem; vertical-align: middle; font-weight: 600; color: var(--color-secondary-dark);">
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <img src="${student.photo_url || 'static/src/assets/profiles/' + student.id + '.jpg'}" onerror="this.src='static/src/assets/ui/logo.png'" alt="Foto" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 2px solid var(--color-secondary); flex-shrink: 0; background: #fff;">
            <span>${sName}</span>
          </div>
        </td>
        <td style="padding: 0.75rem 1rem; text-align: center !important; vertical-align: middle;"><span class="badge ${isMale ? 'badge-teal' : (sGender === 'P' ? 'badge-orange' : 'badge-outline')}">${sGender}</span></td>
        <td style="padding: 0.75rem 1rem; text-align: center !important; vertical-align: middle;">
          ${(rawEng && rawEng.toLowerCase().includes('calistung')) || (rawMath && rawMath.toLowerCase().includes('calistung'))
            ? `<span class="badge badge-orange" style="font-size:0.75rem; padding: 0.35rem 0.65rem;">Calistung (Baca Tulis Hitung)</span>`
            : `<div style="display: flex; flex-direction: column; gap: 0.35rem; align-items: center; justify-content: center;">
                 ${engBadge}
                 ${mathBadge}
               </div>`
          }
        </td>
        <td style="padding: 0.75rem 1rem; text-align: center !important; vertical-align: middle;">
          <div style="display: flex; flex-direction: column; gap: 0.35rem; align-items: center; justify-content: center;">
            ${actionButtonsHtml}
          </div>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}
window.renderDataSiswaTable = renderDataSiswaTable;

export async function confirmDeleteStudent(studentId, studentName) {
  const sId = parseInt(studentId, 10);
  const sName = studentName || `ID ${sId}`;

  // Step 1: First Confirmation Dialog using custom SoC modal
  const step1 = await window.socConfirm(`Apakah Anda yakin ingin menghapus data siswa "${sName}" (ID: ${sId})?`, "Hapus Data Siswa");
  if (!step1) return;

  // Step 2: Second Warning Confirmation Dialog
  const step2 = await window.showSoCModal({
    title: "Peringatan Penghapusan Permanen",
    message: `Menghapus data siswa "${sName}" akan menghapus seluruh data evaluasi nilai, absensi, dan akun pengguna terkait secara permanen! Lanjutkan penghapusan?`,
    type: "danger",
    confirmText: "Ya, Hapus Permanen",
    cancelText: "Batal"
  });
  if (!step2) return;

  try {
    const res = await fetch(`http://localhost:5000/api/students/${sId}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      alert(`Data siswa "${sName}" berhasil dihapus.`);
      await loadAllStudents();
      renderDataSiswaTable();
      if (typeof renderTop10Students === 'function') renderTop10Students();
    } else {
      const errData = await res.json().catch(() => ({}));
      alert(`Gagal menghapus siswa: ${errData.error || 'Terjadi kesalahan pada server'}`);
    }
  } catch (err) {
    console.error('Error deleting student:', err);
    alert('Gagal terhubung ke server: ' + err.message);
  }
}
window.confirmDeleteStudent = confirmDeleteStudent;

export async function viewDetailSiswa(studentId) {
  let student = (window.allStudents || []).find(s => s.id === parseInt(studentId, 10));
  if (!student) {
    try {
      const res = await fetch(`http://localhost:5000/api/students/${studentId}`);
      if (res.ok) student = await res.json();
    } catch (e) {}
  }
  if (!student) {
    alert('Data siswa tidak ditemukan.');
    return;
  }
  window.selectedStudentDetail = student;

  // Top Card: Data & Akun Siswa Form Inputs
  const idInp = document.getElementById('edit-siswa-id');
  const nisInp = document.getElementById('edit-siswa-nis');
  const pwdInp = document.getElementById('edit-siswa-password');
  const nameInp = document.getElementById('edit-siswa-nama');
  const nickInp = document.getElementById('edit-siswa-panggilan');
  const genderInp = document.getElementById('edit-siswa-gender');
  const birthPlaceInp = document.getElementById('edit-siswa-tempat-lahir');
  const birthDateInp = document.getElementById('edit-siswa-tanggal-lahir');
  const ortuInp = document.getElementById('edit-siswa-ortu');
  const hpSiswaInp = document.getElementById('edit-siswa-hp-siswa');
  const hpOrtuInp = document.getElementById('edit-siswa-hp-ortu');
  const engInp = document.getElementById('edit-siswa-kelas-eng');
  const mathInp = document.getElementById('edit-siswa-kelas-math');
  const saveContainer = document.getElementById('btn-save-detail-siswa-container');
  const fotoGroup = document.getElementById('group-edit-siswa-foto');

  if (idInp) idInp.value = student.id;
  if (nisInp) nisInp.value = student.nis || '';
  if (pwdInp) pwdInp.value = student.password_display || student.password || '';
  if (nameInp) nameInp.value = student.full_name || student.name || '';
  if (nickInp) nickInp.value = student.nickname || '';
  if (genderInp) genderInp.value = (student.gender && student.gender.startsWith('P')) ? 'Perempuan' : 'Laki-laki';
  if (birthPlaceInp) birthPlaceInp.value = student.birth_place || student.tempat_lahir || '';
  if (birthDateInp) {
    const rawDate = student.birth_date || student.tanggal_lahir || '';
    birthDateInp.value = rawDate ? String(rawDate).split('T')[0] : '';
  }
  if (ortuInp) ortuInp.value = student.parent_name || student.nama_ortu || student.parents_name || '';
  if (hpSiswaInp) hpSiswaInp.value = student.student_phone || student.phone_siswa || student.no_hp_siswa || student.hp_siswa || '';
  if (hpOrtuInp) hpOrtuInp.value = student.parent_phone || student.phone_ortu || student.no_hp_ortu || student.hp_ortu || '';
  const engBadge = document.getElementById('detail-badge-kelas-eng');
  const mathBadge = document.getElementById('detail-badge-kelas-math');
  if (engBadge) {
    engBadge.textContent = formatClassName(student.kelas_english) || student.kelas_english || 'Belum diplot';
  }
  if (mathBadge) {
    mathBadge.textContent = formatClassName(student.kelas_math) || student.kelas_math || 'Belum diplot';
  }
  if (engInp) engInp.value = getRawClassName(student.kelas_english) || student.kelas_english || '';
  if (mathInp) mathInp.value = getRawClassName(student.kelas_math) || student.kelas_math || '';

  const isAlumni = (student.status_siswa === 'alumni') || window.isAlumniDetailView;
  const idCardMockupCard = document.getElementById('student-id-card-render-area')?.closest('.dashboard-card');
  const titleEl = document.querySelector('#view-detail-siswa .view-title');
  const subtitleEl = document.getElementById('detail-siswa-subtitle');
  const backBtn = document.querySelector('#view-detail-siswa button[onclick*="data-siswa"], #view-detail-siswa button[onclick*="data-alumni"]');
  const alumniActionsContainer = document.getElementById('btn-alumni-actions-container');

  if (isAlumni) {
    if (titleEl) titleEl.innerHTML = '<i class="fas fa-graduation-cap text-teal"></i> Detail Data Alumni (Read-Only)';
    if (subtitleEl) subtitleEl.textContent = 'Informasi profil pribadi dan riwayat kelulusan alumni.';
    if (backBtn) {
      backBtn.setAttribute('onclick', "window.isAlumniDetailView = false; switchView('data-alumni');");
      backBtn.innerHTML = '<i class="fas fa-arrow-left"></i> Kembali ke Data Alumni';
    }
    if (idCardMockupCard) idCardMockupCard.style.display = 'none';

    [nisInp, pwdInp, nameInp, nickInp, birthPlaceInp, birthDateInp, ortuInp, hpSiswaInp, hpOrtuInp].forEach(inp => {
      if (inp) {
        inp.readOnly = true;
        inp.style.backgroundColor = '#f8f9fa';
      }
    });
    if (genderInp) genderInp.disabled = true;
    if (engInp) engInp.disabled = true;
    if (mathInp) mathInp.disabled = true;
    const btnLabelSiswaFoto = document.getElementById('btn-label-edit-siswa-foto');
    if (btnLabelSiswaFoto) btnLabelSiswaFoto.style.display = 'none';
    if (saveContainer) saveContainer.style.display = 'none';

    if (alumniActionsContainer) {
      alumniActionsContainer.style.display = (window.currentRole === 'admin' || window.currentRole === 'manager') ? 'flex' : 'none';
      const ungradBtn = document.getElementById('btn-un-graduate-student');
      if (ungradBtn) {
        ungradBtn.onclick = async () => {
          const st = window.selectedStudentDetail;
          if (!st || !st.id) return;
          const conf = await window.socConfirm(
            `Apakah Anda yakin ingin membatalkan status kelulusan "${st.full_name || 'siswa ini'}" dan mengembalikannya ke status Siswa Aktif?`,
            "Konfirmasi Pembatalan Kelulusan"
          );
          if (!conf) return;

          try {
            const res = await fetch(`http://localhost:5000/api/students/${st.id}/ungraduate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            const resData = await res.json();
            if (res.ok) {
              if (window.showSoCModal) {
                await window.showSoCModal({
                  title: 'Kelulusan Dibatalkan',
                  message: resData.message || 'Siswa berhasil dikembalikan ke status Siswa Aktif.',
                  type: 'success'
                });
              } else {
                alert(resData.message || 'Siswa berhasil dikembalikan ke status Siswa Aktif.');
              }
              window.isAlumniDetailView = false;
              await loadAllStudents();
              if (typeof renderDataAlumniTable === 'function') await renderDataAlumniTable();
              if (typeof renderDataSiswaTable === 'function') renderDataSiswaTable();
              switchView('data-siswa');
            } else {
              const errMsg = resData.error || 'Gagal membatalkan status kelulusan.';
              if (window.showSoCModal) {
                await window.showSoCModal({ title: 'Gagal', message: errMsg, type: 'danger' });
              } else {
                alert(errMsg);
              }
            }
          } catch (err) {
            console.error('Error ungraduating student:', err);
            alert('Terjadi kesalahan saat membatalkan kelulusan: ' + err.message);
          }
        };
      }
    }
  } else {
    if (alumniActionsContainer) alumniActionsContainer.style.display = 'none';
    if (titleEl) titleEl.innerHTML = '<i class="fas fa-id-card text-teal"></i> Detail Siswa';
    if (subtitleEl) subtitleEl.textContent = 'Informasi profil, akun login, dan kartu identitas siswa.';
    if (backBtn) {
      backBtn.setAttribute('onclick', "switchView('data-siswa');");
      backBtn.innerHTML = '<i class="fas fa-arrow-left"></i> Kembali ke Data Siswa';
    }
    if (idCardMockupCard) idCardMockupCard.style.display = 'block';

    const isAdmin = (window.currentRole === 'admin');
    const pwdGroup = document.getElementById('group-edit-siswa-password') || (pwdInp ? pwdInp.closest('.form-group') : null);
    if (pwdGroup) {
      pwdGroup.style.display = isAdmin ? 'block' : 'none';
    }
    if (pwdInp) {
      pwdInp.value = isAdmin ? (student.password_display || student.password || '') : '';
      pwdInp.readOnly = !isAdmin;
      pwdInp.style.backgroundColor = isAdmin ? '#fff' : '#f8f9fa';
    }

    [nameInp, nickInp, birthPlaceInp, birthDateInp, ortuInp, hpSiswaInp, hpOrtuInp].forEach(inp => {
      if (inp) {
        inp.readOnly = !isAdmin;
        inp.style.backgroundColor = isAdmin ? '#fff' : '#f8f9fa';
      }
    });
    if (nisInp) {
      nisInp.readOnly = true;
      nisInp.disabled = true;
    }
    if (genderInp) genderInp.disabled = !isAdmin;
    if (engInp) engInp.disabled = !isAdmin;
    if (mathInp) mathInp.disabled = !isAdmin;
    const btnLabelSiswaFoto = document.getElementById('btn-label-edit-siswa-foto');
    if (btnLabelSiswaFoto) btnLabelSiswaFoto.style.display = isAdmin ? 'inline-flex' : 'none';
    if (fotoGroup) fotoGroup.style.display = 'flex';
    if (saveContainer) saveContainer.style.display = isAdmin ? 'flex' : 'none';
  }

  // Bottom Card: Kartu Pelajar & QR Absensi
  const cardPhoto = document.getElementById('card-student-photo');
  const cardName = document.getElementById('card-student-name');
  const cardNisBadge = document.getElementById('card-student-nis-badge');
  const cardStatusBadge = document.getElementById('card-student-status-badge');
  const cardQr = document.getElementById('card-student-qr');

  const sNis = student.nis || String(student.id);
  const sName = student.full_name || student.name || 'Siswa SoC';

  if (cardPhoto) {
    cardPhoto.src = student.photo_url || `static/src/assets/profiles/${student.id}.jpg`;
    cardPhoto.onerror = () => { cardPhoto.src = 'static/src/assets/ui/logo.png'; };
  }
  const detailSiswaPhotoPrev = document.getElementById('detail-siswa-photo-preview');
  if (detailSiswaPhotoPrev) {
    detailSiswaPhotoPrev.src = student.photo_url || `static/src/assets/profiles/${student.id}.jpg`;
    detailSiswaPhotoPrev.onerror = () => { detailSiswaPhotoPrev.src = 'static/src/assets/ui/logo.png'; };
  }
  if (cardName) cardName.textContent = sName;
  if (cardNisBadge) cardNisBadge.textContent = `NIS: ${sNis}`;
  if (cardStatusBadge) {
    const isAlum = student.status_siswa === 'alumni';
    cardStatusBadge.textContent = isAlum ? 'ALUMNI • POJOK HOPE' : 'SISWA AKTIF • POJOK HOPE';
    cardStatusBadge.className = isAlum ? 'badge badge-orange' : 'badge badge-green';
  }
  if (cardQr) {
    cardQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(sNis)}`;
  }

  if (window.location.hash === '#detail-siswa') {
    switchView('detail-siswa');
  } else {
    window.location.hash = 'detail-siswa';
  }
}
window.viewDetailSiswa = viewDetailSiswa;

export function printStudentIdCard() {
  const cardArea = document.getElementById('student-id-card-render-area');
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
        <title>Kartu Pelajar - School of Character Pojok Hope</title>
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
window.printStudentIdCard = printStudentIdCard;

export async function downloadStudentIdCard() {
  const cardArea = document.getElementById('student-id-card-render-area');
  if (!cardArea) return;
  const student = window.selectedStudentDetail || {};
  const nis = student.nis || 'SoC';

  if (typeof html2canvas === 'function') {
    try {
      const canvas = await html2canvas(cardArea, { scale: 2, useCORS: true, allowTaint: true });
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `Kartu_Pelajar_${nis}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.warn('html2canvas failed, falling back to print window:', e);
      printStudentIdCard();
    }
  } else {
    printStudentIdCard();
  }
}
window.downloadStudentIdCard = downloadStudentIdCard;

export function formatSoCPhone(val) {
  if (val === null || val === undefined || val === '' || val === 'null' || val === 'undefined' || Number.isNaN(val)) {
    return '';
  }
  let str = String(val).trim().replace(/[^0-9+]/g, '');
  if (!str) return '';
  if (str.startsWith('+62')) {
    str = '0' + str.slice(3);
  } else if (str.startsWith('62')) {
    str = '0' + str.slice(2);
  } else if (str.startsWith('8')) {
    str = '0' + str;
  }
  return str;
}
window.formatSoCPhone = formatSoCPhone;

export function exportStyledSoCExcel({
  filename,
  sheetName = 'Sheet1',
  headers = [],
  rows = [],
  headerHex = '0C4A60',
  zebraHex = 'F8FAFC',
  colWidths = null
}) {
  if (typeof XLSX === 'undefined') {
    alert('Library Excel belum siap. Silakan muat ulang halaman.');
    return;
  }

  const cleanHeaderHex = String(headerHex).replace('#', '').toUpperCase();
  const cleanZebraHex = String(zebraHex).replace('#', '').toUpperCase();

  const headerBorder = {
    top: { style: 'thin', color: { rgb: '94A3B8' } },
    bottom: { style: 'thin', color: { rgb: '94A3B8' } },
    left: { style: 'thin', color: { rgb: '94A3B8' } },
    right: { style: 'thin', color: { rgb: '94A3B8' } }
  };

  const dataBorder = {
    top: { style: 'thin', color: { rgb: 'CBD5E1' } },
    bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
    left: { style: 'thin', color: { rgb: 'CBD5E1' } },
    right: { style: 'thin', color: { rgb: 'CBD5E1' } }
  };

  const centerKeywords = ['no', 'id', 'nis', 'gender', 'jenis kelamin', 'kelas', 'waktu', 'bintang', 'tanggal', 'date'];

  const ws = {};
  const numRows = rows.length + 1;
  const numCols = headers.length;
  const maxLens = headers.map(h => String(h || '').length);

  // 1. Build Header Row
  headers.forEach((h, colIdx) => {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: colIdx });
    ws[cellRef] = {
      t: 's',
      v: String(h ?? ''),
      s: {
        fill: { fgColor: { rgb: cleanHeaderHex } },
        font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: headerBorder
      }
    };
  });

  // 2. Build Data Rows
  rows.forEach((row, rowIdx) => {
    const r = rowIdx + 1;
    const isEven = rowIdx % 2 === 1;
    const rowBg = isEven ? cleanZebraHex : 'FFFFFF';

    headers.forEach((h, colIdx) => {
      const cellRef = XLSX.utils.encode_cell({ r, c: colIdx });
      let rawVal = '';
      if (Array.isArray(row)) {
        rawVal = row[colIdx];
      } else if (typeof row === 'object' && row !== null) {
        rawVal = row[h];
      }

      if (rawVal === null || rawVal === undefined || Number.isNaN(rawVal)) {
        rawVal = '';
      }

      const hLower = String(h).toLowerCase();
      const isShortCode = centerKeywords.some(k => {
        if (hLower === k) return true;
        if (hLower.includes(k) && !hLower.includes('nama') && !hLower.includes('catatan') && !hLower.includes('link') && !hLower.includes('topik') && !hLower.includes('tempat') && !hLower.includes('alamat')) {
          return true;
        }
        return false;
      });

      const mustBeString = isShortCode ||
        hLower.includes('id') ||
        hLower.includes('nis') ||
        hLower.includes('hp') ||
        hLower.includes('kontak') ||
        hLower.includes('phone') ||
        hLower.includes('tanggal') ||
        hLower.includes('date') ||
        hLower.includes('waktu');

      let cellType = 's';
      let displayVal = String(rawVal);

      if (!mustBeString && typeof rawVal === 'number') {
        cellType = 'n';
        displayVal = rawVal;
      } else {
        cellType = 's';
        displayVal = String(rawVal);
      }

      ws[cellRef] = {
        t: cellType,
        v: displayVal,
        s: {
          fill: { fgColor: { rgb: rowBg } },
          font: { name: 'Calibri', sz: 10, color: { rgb: '1E293B' } },
          alignment: {
            horizontal: isShortCode ? 'center' : (cellType === 'n' ? 'right' : 'left'),
            vertical: 'center',
            wrapText: true
          },
          border: dataBorder
        }
      };

      const len = String(displayVal).length;
      if (len > maxLens[colIdx]) {
        maxLens[colIdx] = len;
      }
    });
  });

  // Range
  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: Math.max(0, numRows - 1), c: Math.max(0, numCols - 1) }
  });

  // Row heights: row 0 is 28pt, data rows 22pt
  const rowHeights = [{ hpt: 28 }];
  for (let i = 1; i < numRows; i++) {
    rowHeights.push({ hpt: 22 });
  }
  ws['!rows'] = rowHeights;

  // Auto-fit column widths dynamically: Math.max(header.length + 5, maxCellLen + 4, 16), capped at 42
  ws['!cols'] = headers.map((h, colIdx) => {
    if (colWidths && colWidths[colIdx]) {
      return { wch: colWidths[colIdx] };
    }
    const maxLen = maxLens[colIdx] || String(h).length;
    const w = Math.min(42, Math.max(String(h).length + 5, maxLen + 4, 16));
    return { wch: w };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const outName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, outName);
}
window.exportStyledSoCExcel = exportStyledSoCExcel;

export function exportDataSiswa() {
  const students = window.allStudents || [];
  if (!students || students.length === 0) {
    alert('Tidak ada data siswa untuk diexport.');
    return;
  }

  const headers = [
    'No',
    'NIS',
    'Nama Lengkap',
    'Nama Panggilan',
    'Jenis Kelamin',
    'Tempat Lahir',
    'Tanggal Lahir',
    'Nama Orang Tua',
    'No HP Siswa',
    'No HP Orang Tua',
    'Kelas English',
    'Kelas Matematika',
    'Bintang'
  ];

  const rows = students.map((s, idx) => ({
    'No': idx + 1,
    'NIS': s.nis ? String(s.nis) : '-',
    'Nama Lengkap': s.full_name || s.name || '',
    'Nama Panggilan': s.nickname || '',
    'Jenis Kelamin': s.gender || '',
    'Tempat Lahir': s.birth_place || s.tempat_lahir || '',
    'Tanggal Lahir': s.birth_date ? String(s.birth_date).split('T')[0] : '',
    'Nama Orang Tua': s.parent_name || s.nama_ortu || '',
    'No HP Siswa': formatSoCPhone(s.student_phone || s.hp_siswa),
    'No HP Orang Tua': formatSoCPhone(s.parent_phone || s.hp_ortu),
    'Kelas English': s.kelas_english || '',
    'Kelas Matematika': s.kelas_math || '',
    'Bintang': Number(s.stars) || 0
  }));

  exportStyledSoCExcel({
    filename: 'Data_Siswa_SoC_Pojok_Hope.xlsx',
    sheetName: 'Data Siswa',
    headers,
    rows,
    headerHex: '0C4A60',
    zebraHex: 'F8FAFC'
  });
}
window.exportDataSiswa = exportDataSiswa;

export function downloadStudentTemplateExcel() {
  const headers = [
    'Nama Lengkap',
    'Nama Panggilan',
    'Jenis Kelamin',
    'Tempat Lahir',
    'Tanggal Lahir (YYYY-MM-DD)',
    'Nama Orang Tua',
    'No HP Siswa',
    'No HP Orang Tua',
    'Level English',
    'Level Matematika'
  ];

  const sampleRows = [
    {
      'Nama Lengkap': 'Muhammad Raffa',
      'Nama Panggilan': 'Raffa',
      'Jenis Kelamin': 'Laki-laki',
      'Tempat Lahir': 'Gorontalo',
      'Tanggal Lahir (YYYY-MM-DD)': '2015-05-14',
      'Nama Orang Tua': 'Ahmad Monoarfa',
      'No HP Siswa': '081234567890',
      'No HP Orang Tua': '081398765432',
      'Level English': 'English A',
      'Level Matematika': 'Math A'
    },
    {
      'Nama Lengkap': 'Aliya Humaira',
      'Nama Panggilan': 'Aliya',
      'Jenis Kelamin': 'Perempuan',
      'Tempat Lahir': 'Gorontalo',
      'Tanggal Lahir (YYYY-MM-DD)': '2016-08-20',
      'Nama Orang Tua': 'Rahman Djabar',
      'No HP Siswa': '',
      'No HP Orang Tua': '081255554444',
      'Level English': 'English B',
      'Level Matematika': 'Math B'
    }
  ];

  exportStyledSoCExcel({
    filename: 'Template_Import_Siswa_SoC.xlsx',
    sheetName: 'Template Siswa',
    headers,
    rows: sampleRows,
    headerHex: '0C4A60',
    zebraHex: 'F8FAFC'
  });
}
window.downloadStudentTemplateExcel = downloadStudentTemplateExcel;

export function parseExcelDate(val) {
  if (!val && val !== 0) return '';
  if (typeof val === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const dateObj = new Date(excelEpoch.getTime() + val * 86400000);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toISOString().split('T')[0];
    }
  }
  const s = String(val).trim();
  if (!s || s.toLowerCase() === 'null' || s.toLowerCase() === 'none' || s === '-') return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) return s.replace(/\//g, '-');
  const dmyMatch = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return s;
}
window.parseExcelDate = parseExcelDate;

export async function handleBulkStudentExcelUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (window.isUploadingStudentExcel) return;
  window.isUploadingStudentExcel = true;

  const reader = new FileReader();
  reader.onerror = () => {
    window.isUploadingStudentExcel = false;
    if (event && event.target) event.target.value = '';
    alert('Gagal membaca file Excel.');
  };
  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '', raw: false });

      if (!rows || rows.length === 0) {
        if (window.showSoCModal) {
          window.showSoCModal({ title: 'File Kosong', message: 'File Excel kosong atau format tidak sesuai.', type: 'danger' });
        } else {
          alert('File Excel kosong atau format tidak sesuai.');
        }
        return;
      }

      // Validate Student Template Headers
      const firstRowKeys = Object.keys(rows[0] || {});
      const hasStudentHeader = firstRowKeys.some(k => /nama\s*orang\s*tua|tempat\s*lahir|no\s*hp\s*orang\s*tua/i.test(k));
      const hasTeacherHeader = firstRowKeys.some(k => /jurusan\s*\/\s*lulusan|jurusan/i.test(k));

      if (hasTeacherHeader || !hasStudentHeader) {
        const errMsg = "Format File Tidak Sesuai: Anda mengunggah file selain Template Siswa. Pastikan menggunakan Template Import Siswa SoC.";
        if (typeof window.socAlert === 'function') {
          await window.socAlert(errMsg, "Format File Tidak Sesuai");
        } else if (window.showSoCModal) {
          await window.showSoCModal({ title: 'Format File Tidak Sesuai', message: errMsg, type: 'danger' });
        } else {
          alert(errMsg);
        }
        return;
      }

      const studentsPayload = rows.map(r => ({
        full_name: String(r['Nama Lengkap'] || r['Nama'] || r['nama_lengkap'] || r['full_name'] || '').trim(),
        nickname: String(r['Nama Panggilan'] || r['Panggilan'] || r['nickname'] || '').trim(),
        gender: String(r['Jenis Kelamin'] || r['Gender'] || r['gender'] || 'Laki-laki').trim(),
        birth_place: String(r['Tempat Lahir'] || r['tempat_lahir'] || r['birth_place'] || 'Gorontalo').trim(),
        birth_date: parseExcelDate(r['Tanggal Lahir (YYYY-MM-DD)'] || r['Tanggal Lahir'] || r['tanggal_lahir'] || r['birth_date'] || ''),
        parent_name: String(r['Nama Orang Tua'] || r['Nama Orang Tua / Wali'] || r['Orang Tua'] || r['nama_ortu'] || r['parent_name'] || r['parents_name'] || '').trim(),
        student_phone: String(r['No HP Siswa'] || r['HP Siswa'] || r['student_phone'] || r['phone_siswa'] || r['no_hp_siswa'] || '').trim(),
        parent_phone: String(r['No HP Orang Tua'] || r['No HP Ortu'] || r['HP Ortu'] || r['parent_phone'] || r['phone_ortu'] || r['no_hp_ortu'] || '').trim(),
        kelas_english: String(r['Level English'] || r['Kelas English'] || r['English'] || r['kelas_english'] || r['level_english'] || '').trim(),
        kelas_math: String(r['Level Matematika'] || r['Kelas Matematika'] || r['Matematika'] || r['kelas_math'] || r['level_matematika'] || '').trim()
      })).filter(s => s.full_name);

      if (studentsPayload.length === 0) {
        if (window.showSoCModal) {
          window.showSoCModal({ title: 'Data Tidak Valid', message: 'Tidak ditemukan data siswa yang valid (kolom Nama Lengkap wajib diisi).', type: 'danger' });
        } else {
          alert('Tidak ditemukan data siswa yang valid (kolom Nama Lengkap wajib diisi).');
        }
        return;
      }

      const res = await fetch('http://localhost:5000/api/students/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: studentsPayload })
      });

      const resData = await res.json();
      if (res.ok) {
        const added = resData.count || 0;
        const skipped = resData.skipped || 0;
        let msg = '';
        if (added > 0 && skipped > 0) {
          msg = `Impor selesai: ${added} data baru berhasil ditambahkan, ${skipped} data dilewati karena sudah terdaftar di database.`;
        } else if (added > 0) {
          msg = `Impor selesai: ${added} data baru berhasil ditambahkan.`;
        } else if (skipped > 0) {
          msg = `Semua data dalam file Excel (${skipped} data) sudah terdaftar di database. Tidak ada data baru yang ditambahkan.`;
        } else {
          msg = 'Tidak ada data yang dapat diimpor.';
        }
        if (window.showSoCModal) {
          await window.showSoCModal({ title: 'Status Impor Siswa', message: msg, type: added > 0 ? 'success' : 'info' });
        } else {
          alert(msg);
        }
        await loadAllStudents();
        renderDataSiswaTable();
        switchView('data-siswa');
      } else {
        const errMsg = resData.error || 'Terjadi kesalahan saat mengimpor data siswa.';
        if (window.showSoCModal) {
          await window.showSoCModal({ title: 'Gagal Impor', message: errMsg, type: 'danger' });
        } else {
          alert(errMsg);
        }
      }
    } catch (err) {
      console.error('Error parsing Excel:', err);
      if (window.showSoCModal) {
        window.showSoCModal({ title: 'Gagal Membaca Excel', message: 'Gagal membaca file Excel: ' + err.message, type: 'danger' });
      } else {
        alert('Gagal membaca file Excel: ' + err.message);
      }
    } finally {
      window.isUploadingStudentExcel = false;
      if (event && event.target) {
        event.target.value = '';
      }
    }
  };
  reader.readAsArrayBuffer(file);
}
window.handleBulkStudentExcelUpload = handleBulkStudentExcelUpload;

export function downloadTeacherTemplateExcel() {
  const headers = [
    'Nama Lengkap',
    'Nama Panggilan',
    'Jenis Kelamin',
    'Jurusan / Lulusan',
    'No HP / Kontak',
    'Email'
  ];

  const sampleRows = [
    {
      'Nama Lengkap': 'Dela Anggraini, S.Pd.',
      'Nama Panggilan': 'Dela',
      'Jenis Kelamin': 'Perempuan',
      'Jurusan / Lulusan': 'S1 Pendidikan Bahasa Inggris',
      'No HP / Kontak': '081234567891',
      'Email': 'dela@soc.org'
    },
    {
      'Nama Lengkap': 'Rizky Pratama, M.Pd.',
      'Nama Panggilan': 'Rizky',
      'Jenis Kelamin': 'Laki-laki',
      'Jurusan / Lulusan': 'S2 Pendidikan Matematika',
      'No HP / Kontak': '081234567892',
      'Email': 'rizky@soc.org'
    }
  ];

  exportStyledSoCExcel({
    filename: 'Template_Import_Pengajar_SoC.xlsx',
    sheetName: 'Template Guru',
    headers,
    rows: sampleRows,
    headerHex: '1E7E5A',
    zebraHex: 'F8FAFC'
  });
}
window.downloadTeacherTemplateExcel = downloadTeacherTemplateExcel;

export async function handleBulkTeacherExcelUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (window.isUploadingTeacherExcel) return;
  window.isUploadingTeacherExcel = true;

  const reader = new FileReader();
  reader.onerror = () => {
    window.isUploadingTeacherExcel = false;
    if (event && event.target) event.target.value = '';
    alert('Gagal membaca file Excel.');
  };
  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '', raw: false });

      if (!rows || rows.length === 0) {
        if (window.showSoCModal) {
          window.showSoCModal({ title: 'File Kosong', message: 'File Excel kosong atau format tidak sesuai.', type: 'danger' });
        } else {
          alert('File Excel kosong atau format tidak sesuai.');
        }
        return;
      }

      // Validate Teacher Template Headers
      const firstRowKeys = Object.keys(rows[0] || {});
      const hasTeacherHeader = firstRowKeys.some(k => /jurusan\s*\/\s*lulusan|email/i.test(k));
      const hasStudentHeader = firstRowKeys.some(k => /nama\s*orang\s*tua|tempat\s*lahir/i.test(k));

      if (hasStudentHeader || !hasTeacherHeader) {
        const errMsg = "Format File Tidak Sesuai: Anda mengunggah file Data Siswa ke menu Pengajar. Gunakan Template Import Pengajar SoC.";
        if (typeof window.socAlert === 'function') {
          await window.socAlert(errMsg, "Format File Tidak Sesuai");
        } else if (window.showSoCModal) {
          await window.showSoCModal({ title: 'Format File Tidak Sesuai', message: errMsg, type: 'danger' });
        } else {
          alert(errMsg);
        }
        return;
      }

      const teachersPayload = rows.map(r => ({
        full_name: String(r['Nama Lengkap'] || r['Nama'] || r['nama_lengkap'] || '').trim(),
        nickname: String(r['Nama Panggilan'] || r['Panggilan'] || '').trim(),
        gender: String(r['Jenis Kelamin'] || r['Gender'] || 'Perempuan').trim(),
        jurusan: String(r['Jurusan / Lulusan'] || r['Jurusan'] || '').trim(),
        contact: String(r['No HP / Kontak'] || r['Kontak'] || r['No HP'] || '').trim(),
        email: String(r['Email'] || '').trim()
      })).filter(t => t.full_name);

      if (teachersPayload.length === 0) {
        if (window.showSoCModal) {
          window.showSoCModal({ title: 'Data Tidak Valid', message: 'Tidak ditemukan data pengajar yang valid (kolom Nama Lengkap wajib diisi).', type: 'danger' });
        } else {
          alert('Tidak ditemukan data pengajar yang valid (kolom Nama Lengkap wajib diisi).');
        }
        return;
      }

      const res = await fetch('http://localhost:5000/api/teachers/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teachers: teachersPayload })
      });

      const resData = await res.json();
      if (res.ok) {
        const added = resData.count || 0;
        const skipped = resData.skipped || 0;
        let msg = '';
        if (added > 0 && skipped > 0) {
          msg = `Impor selesai: ${added} data baru berhasil ditambahkan, ${skipped} data dilewati karena sudah terdaftar di database.`;
        } else if (added > 0) {
          msg = `Impor selesai: ${added} data baru berhasil ditambahkan.`;
        } else if (skipped > 0) {
          msg = `Semua data dalam file Excel (${skipped} data) sudah terdaftar di database. Tidak ada data baru yang ditambahkan.`;
        } else {
          msg = 'Tidak ada data yang dapat diimpor.';
        }
        if (window.showSoCModal) {
          await window.showSoCModal({ title: 'Status Impor Pengajar', message: msg, type: added > 0 ? 'success' : 'info' });
        } else {
          alert(msg);
        }
        await renderDataGuruTable();
        switchView('data-guru');
      } else {
        const errMsg = resData.error || 'Terjadi kesalahan saat mengimpor data pengajar.';
        if (window.showSoCModal) {
          await window.showSoCModal({ title: 'Gagal Impor', message: errMsg, type: 'danger' });
        } else {
          alert(errMsg);
        }
      }
    } catch (err) {
      console.error('Error parsing Excel:', err);
      if (window.showSoCModal) {
        window.showSoCModal({ title: 'Gagal Membaca Excel', message: 'Gagal membaca file Excel: ' + err.message, type: 'danger' });
      } else {
        alert('Gagal membaca file Excel: ' + err.message);
      }
    } finally {
      window.isUploadingTeacherExcel = false;
      if (event && event.target) {
        event.target.value = '';
      }
    }
  };
  reader.readAsArrayBuffer(file);
}
window.handleBulkTeacherExcelUpload = handleBulkTeacherExcelUpload;

export function downloadScheduleTemplateExcel() {
  const headers = [
    'Tanggal (YYYY-MM-DD)',
    'Mata Pelajaran',
    'Kelas',
    'Waktu Mulai (HH:MM)',
    'Waktu Selesai (HH:MM)',
    'Lokasi',
    'Topik',
    'Link Materi',
    'Link Materi Siswa',
    'Catatan'
  ];

  const now = new Date();
  const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
  const d3 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3);
  const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const sampleRows = [
    {
      'Tanggal (YYYY-MM-DD)': fmtDate(d1),
      'Mata Pelajaran': 'English',
      'Kelas': 'English A',
      'Waktu Mulai (HH:MM)': '16:00',
      'Waktu Selesai (HH:MM)': '18:00',
      'Lokasi': 'Kelas Pojok Hope',
      'Topik': 'Alphabet & Phonics',
      'Link Materi': 'https://drive.google.com/drive/folders/1U_VJDr6YXV-3bVslE6TSRA6hd7D16SFh?usp=drive_link',
      'Link Materi Siswa': 'https://youtu.be/sample-video-link',
      'Catatan': 'Bawa buku catatan'
    },
    {
      'Tanggal (YYYY-MM-DD)': fmtDate(d2),
      'Mata Pelajaran': 'Matematika',
      'Kelas': 'Math A',
      'Waktu Mulai (HH:MM)': '16:00',
      'Waktu Selesai (HH:MM)': '18:00',
      'Lokasi': 'Kelas Pojok Hope',
      'Topik': 'Operasi Penjumlahan Dasar',
      'Link Materi': 'https://drive.google.com/drive/folders/1U_VJDr6YXV-3bVslE6TSRA6hd7D16SFh?usp=drive_link',
      'Link Materi Siswa': '',
      'Catatan': ''
    },
    {
      'Tanggal (YYYY-MM-DD)': fmtDate(d3),
      'Mata Pelajaran': 'Karakter',
      'Kelas': 'Semua',
      'Waktu Mulai (HH:MM)': '16:00',
      'Waktu Selesai (HH:MM)': '18:00',
      'Lokasi': 'Kelas Pojok Hope',
      'Topik': 'Saling Menghargai & Tanggung Jawab',
      'Link Materi': 'https://drive.google.com/drive/folders/1U_VJDr6YXV-3bVslE6TSRA6hd7D16SFh?usp=drive_link',
      'Link Materi Siswa': '',
      'Catatan': ''
    }
  ];

  exportStyledSoCExcel({
    filename: 'Template_Import_Jadwal_SoC.xlsx',
    sheetName: 'Template Jadwal',
    headers,
    rows: sampleRows,
    headerHex: 'E05A25',
    zebraHex: 'F8FAFC'
  });
}
window.downloadScheduleTemplateExcel = downloadScheduleTemplateExcel;

export async function handleBulkScheduleExcelUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (window.isUploadingScheduleExcel) return;
  window.isUploadingScheduleExcel = true;

  const reader = new FileReader();
  reader.onerror = () => {
    window.isUploadingScheduleExcel = false;
    if (event && event.target) event.target.value = '';
    alert('Gagal membaca file Excel.');
  };
  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '', raw: false });

      if (!rows || rows.length === 0) {
        if (typeof window.socAlert === 'function') {
          await window.socAlert('File Excel kosong atau format tidak sesuai.', 'File Kosong');
        } else {
          alert('File Excel kosong atau format tidak sesuai.');
        }
        return;
      }

      // Validate Schedule Template Headers
      const firstRowKeys = Object.keys(rows[0] || {});
      const hasDateHeader = firstRowKeys.some(k => /tanggal/i.test(k));
      const hasMapelHeader = firstRowKeys.some(k => /mata\s*pelajaran|mapel|pelajaran/i.test(k));

      if (!hasDateHeader || !hasMapelHeader) {
        const errMsg = "Format File Tidak Sesuai: Template Excel harus memiliki kolom Tanggal dan Mata Pelajaran. Gunakan Template Import Jadwal SoC.";
        if (typeof window.socAlert === 'function') {
          await window.socAlert(errMsg, "Format File Tidak Sesuai");
        } else if (window.showSoCModal) {
          await window.showSoCModal({ title: 'Format File Tidak Sesuai', message: errMsg, type: 'danger' });
        } else {
          alert(errMsg);
        }
        return;
      }

      const schedulesPayload = rows.map(r => {
        const mapel = String(r['Mata Pelajaran'] || r['Pelajaran'] || r['mata_pelajaran'] || 'Karakter').trim();
        const rawKelas = String(r['Kelas'] || r['kelas'] || 'Semua').trim();
        const normKelas = (typeof window.normalizeScheduleClass === 'function') 
          ? window.normalizeScheduleClass(rawKelas, mapel) 
          : rawKelas;
        return {
          date: parseExcelDate(r['Tanggal (YYYY-MM-DD)'] || r['Tanggal'] || r['date'] || ''),
          mata_pelajaran: mapel,
          kelas: normKelas,
          start_time: String(r['Waktu Mulai (HH:MM)'] || r['Waktu Mulai'] || r['start_time'] || '16:00').trim(),
          end_time: String(r['Waktu Selesai (HH:MM)'] || r['Waktu Selesai'] || r['end_time'] || '18:00').trim(),
          lokasi: String(r['Lokasi'] || r['lokasi'] || 'Kelas Pojok Hope').trim(),
          topik: String(r['Topik'] || r['Topik Materi'] || r['topik'] || '').trim(),
          materi_link: String(r['Link Materi'] || r['Link Materi Guru'] || r['materi_link'] || '').trim(),
          link_materi_siswa: String(r['Link Materi Siswa'] || r['Link Siswa'] || r['link_materi_siswa'] || '').trim(),
          catatan: String(r['Catatan'] || r['catatan'] || '').trim()
        };
      }).filter(s => s.date && s.mata_pelajaran);

      if (schedulesPayload.length === 0) {
        if (typeof window.socAlert === 'function') {
          await window.socAlert('Tidak ditemukan data jadwal yang valid (kolom Tanggal & Mata Pelajaran wajib diisi).', 'Data Tidak Valid');
        } else {
          alert('Tidak ditemukan data jadwal yang valid (kolom Tanggal & Mata Pelajaran wajib diisi).');
        }
        return;
      }

      const res = await fetch('http://localhost:5000/api/schedules/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedules: schedulesPayload })
      });

      const resData = await res.json();
      if (res.ok) {
        const inserted = resData.inserted_count !== undefined ? resData.inserted_count : (resData.count || 0);
        const updated = resData.updated_count || 0;
        const skipped = resData.skipped_count || 0;
        const skippedList = resData.skipped_duplicates || [];

        if (inserted === 0 && updated === 0 && skipped > 0) {
          const dupSummary = skippedList.slice(0, 5).map(d => `• ${d.date} | ${d.mata_pelajaran} (${d.kelas}) pukul ${d.start_time}`).join('\n');
          const moreText = skippedList.length > 5 ? `\n...dan ${skippedList.length - 5} lainnya.` : '';
          const msg = `Tidak ada perubahan jadwal baru karena seluruh ${skipped} data jadwal sudah terdaftar sebelumnya di database:\n\n${dupSummary}${moreText}`;
          if (typeof window.showSoCModal === 'function') {
            await window.showSoCModal({
              title: 'Jadwal Duplikat Terdeteksi',
              message: msg,
              type: 'warning'
            });
          } else if (typeof window.socAlert === 'function') {
            await window.socAlert(msg, 'Jadwal Duplikat Terdeteksi');
          } else {
            alert(msg);
          }
        } else if (updated > 0) {
          const msg = `Berhasil memproses jadwal: ${inserted} sesi baru ditambahkan, ${updated} sesi diperbarui, dan ${skipped} sesi dilewati.`;
          if (typeof window.showSoCModal === 'function') {
            await window.showSoCModal({
              title: 'Impor & Update Jadwal Selesai',
              message: msg,
              type: 'info'
            });
          } else if (typeof window.socAlert === 'function') {
            await window.socAlert(msg, 'Impor & Update Jadwal Selesai');
          } else {
            alert(msg);
          }
        } else if (inserted > 0 && skipped > 0) {
          const msg = `Berhasil mengimpor ${inserted} sesi jadwal belajar baru. ${skipped} sesi jadwal dilewati karena sudah ada sebelumnya.`;
          if (typeof window.showSoCModal === 'function') {
            await window.showSoCModal({
              title: 'Impor Jadwal Selesai',
              message: msg,
              type: 'info'
            });
          } else if (typeof window.socAlert === 'function') {
            await window.socAlert(msg, 'Impor Jadwal Selesai');
          } else {
            alert(msg);
          }
        } else {
          const msg = `Berhasil mengimpor ${inserted} sesi jadwal belajar secara massal!`;
          if (typeof window.showSoCModal === 'function') {
            await window.showSoCModal({
              title: 'Impor Jadwal Berhasil',
              message: msg,
              type: 'success'
            });
          } else if (typeof window.socAlert === 'function') {
            await window.socAlert(msg, 'Impor Jadwal Berhasil');
          } else {
            alert(msg);
          }
        }

        if (resData.month && resData.year) {
          window.currentViewMonth = resData.month;
          window.currentViewYear = resData.year;
          if (typeof window.updateMonthNavUI === 'function') window.updateMonthNavUI();
        }

        await loadAllSchedulesData();
        if (typeof window.loadManagerSchedules === 'function') await window.loadManagerSchedules();
        if (typeof window.renderManagerSchedules === 'function') window.renderManagerSchedules();
        if (typeof window.loadSchedules === 'function') await window.loadSchedules();
        if (typeof window.renderJadwalKelas === 'function') window.renderJadwalKelas();
        if (typeof window.renderManagerSummary === 'function') window.renderManagerSummary();
        if (typeof window.renderGuruSummary === 'function') window.renderGuruSummary();
        if (typeof window.renderStudentSummary === 'function') window.renderStudentSummary();
        if (typeof window.renderSiswaSummary === 'function') window.renderSiswaSummary();
      } else {
        const errMsg = 'Gagal mengimpor jadwal: ' + (resData.error || 'Terjadi kesalahan');
        if (typeof window.showSoCModal === 'function') {
          await window.showSoCModal({ title: 'Gagal Impor', message: errMsg, type: 'danger' });
        } else if (typeof window.socAlert === 'function') {
          await window.socAlert(errMsg, 'Gagal Impor');
        } else {
          alert(errMsg);
        }
      }
    } catch (err) {
      console.error('Error parsing Excel:', err);
      if (typeof window.showSoCModal === 'function') {
        await window.showSoCModal({ title: 'Error File Excel', message: 'Gagal membaca file Excel: ' + err.message, type: 'danger' });
      } else {
        alert('Gagal membaca file Excel: ' + err.message);
      }
    } finally {
      window.isUploadingScheduleExcel = false;
      if (event && event.target) {
        event.target.value = '';
      }
    }
  };
  reader.readAsArrayBuffer(file);
}
window.handleBulkScheduleExcelUpload = handleBulkScheduleExcelUpload;

export function renderManagerSchedules() {
  const container = document.getElementById('manager-schedules-list');
  if (!container) return;

  const isFounder = ((window.currentRole || '').toLowerCase() === 'founder');
  const bulkSchedCard = document.getElementById('btn-upload-excel-jadwal')?.closest('.dashboard-card');
  const schedFormCard = document.getElementById('btn-create-sched')?.closest('.dashboard-card');
  if (bulkSchedCard) bulkSchedCard.style.display = isFounder ? 'none' : 'block';
  if (schedFormCard) schedFormCard.style.display = isFounder ? 'none' : 'block';

  const filterEl = document.getElementById('filter-manager-sched-kelas');
  if (filterEl && !filterEl._hasChangeListener) {
    filterEl._hasChangeListener = true;
    filterEl.addEventListener('change', () => renderManagerSchedules());
  }
  const selectedFilter = filterEl ? filterEl.value : 'ALL';

  const currentViewMonth = window.currentViewMonth || (new Date().getMonth() + 1);
  const currentViewYear = window.currentViewYear || new Date().getFullYear();
  const schedules = window.allSchedulesData || [];

  // Filter by Month & Year
  let monthSchedules = schedules.filter(item => {
    if (!item || !item.date) return false;
    const parts = String(item.date).split('T')[0].split('-');
    if (parts.length < 2) return false;
    return parseInt(parts[0], 10) === currentViewYear && parseInt(parts[1], 10) === currentViewMonth;
  });

  // Filter by Class / Subject
  if (selectedFilter !== 'ALL') {
    if (selectedFilter === 'Karakter') {
      monthSchedules = monthSchedules.filter(s => (s.mata_pelajaran || '').toLowerCase() === 'karakter');
    } else {
      monthSchedules = monthSchedules.filter(s => {
        const k = (s.kelas || '').trim();
        return k === selectedFilter || k.toLowerCase().includes(selectedFilter.toLowerCase());
      });
    }
  }

  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  if (monthSchedules.length === 0) {
    container.innerHTML = `<div class="alert alert-info" style="margin:1rem 0;">Tidak ada jadwal untuk filter ini pada bulan ${monthNames[currentViewMonth - 1]} ${currentViewYear}.</div>`;
    return;
  }

  // Group by date
  const groups = {};
  monthSchedules.forEach(item => {
    const dStr = String(item.date).split('T')[0];
    if (!groups[dStr]) groups[dStr] = [];
    groups[dStr].push(item);
  });

  const sortedDates = Object.keys(groups).sort();
  // Sort items within each date by start_time
  sortedDates.forEach(dStr => {
    groups[dStr].sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || '')));
  });

  // Find nearest date to today
  const todayStr = new Date().toISOString().split('T')[0];
  let defaultOpenDate = sortedDates.find(d => d >= todayStr) || sortedDates[sortedDates.length - 1];

  let html = '<div style="display:flex; flex-direction:column; gap:0.6rem;">';

  sortedDates.forEach(dStr => {
    const sessions = groups[dStr];
    const isNearest = (dStr === defaultOpenDate);

    // Format Indonesian Date: "Sabtu, 24 Oktober 2026"
    let formattedDate = dStr;
    try {
      const parts = dStr.split('-');
      const dObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      formattedDate = dObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch(e) {}

    html += `
      <details class="schedule-date-group" ${isNearest ? 'open' : ''} style="border: 1px solid var(--border-color); border-radius: 10px; overflow: hidden; background: var(--card-bg, #fff); box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
        <summary style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; cursor: pointer; background: var(--bg-contrast, #f8fafc); font-weight: 700; font-size: 0.9rem; color: var(--color-secondary-dark, #0c4a60); user-select: none;">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <i class="fas fa-calendar-day text-teal"></i>
            <span>${formattedDate}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <span class="badge badge-teal" style="font-size: 0.75rem; padding: 0.2rem 0.55rem; font-weight: 700;">${sessions.length} Sesi Kelas</span>
            <i class="fas fa-chevron-down" style="font-size: 0.75rem; color: var(--text-muted); transition: transform 0.2s;"></i>
          </div>
        </summary>
        <div style="padding: 0.5rem 1rem; display: flex; flex-direction: column; gap: 0.35rem;">
          ${sessions.map(item => {
            const subject = item.mata_pelajaran || 'Karakter';
            const badgeClass = subject === 'English' ? 'badge-teal' : (subject === 'Matematika' ? 'badge-green' : 'badge-orange');
            const timeStr = (item.start_time && item.end_time) ? `${item.start_time}–${item.end_time} WITA` : (item.start_time ? `${item.start_time} WITA` : '14:00 WITA');
            const lokasiStr = item.lokasi || 'Kelas Pojok Hope';
            const kelasLabel = item.kelas ? (String(item.kelas).toUpperCase() === 'SEMUA' ? 'Semua Kelas' : item.kelas) : 'Semua Kelas';

            return `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.55rem 0.4rem; border-bottom: 1px solid rgba(0,0,0,0.05); gap: 0.75rem; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 0.6rem; min-width: 170px;">
                  <span class="badge ${badgeClass}" style="font-size: 0.78rem; padding: 0.2rem 0.55rem;">${kelasLabel}</span>
                  <span style="font-size: 0.88rem; font-weight: 700; color: var(--color-secondary-dark);">${subject}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 1rem; flex: 1; font-size: 0.82rem; color: var(--text-muted); flex-wrap: wrap;">
                  <span><i class="far fa-clock text-teal"></i> ${timeStr}</span>
                  ${item.topik ? `<span style="color: var(--color-secondary-dark); font-weight: 600;"><i class="fas fa-book-reader text-orange"></i> ${item.topik}</span>` : ''}
                  <span style="font-size: 0.8rem;"><i class="fas fa-map-marker-alt text-teal"></i> ${lokasiStr}</span>
                </div>
                <div style="display: flex; gap: 0.35rem; align-items: center;">
                  ${item.materi_link ? `<a href="${item.materi_link}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="padding: 0.2rem 0.45rem; font-size: 0.75rem;" title="Modul Guru"><i class="fab fa-google-drive"></i></a>` : ''}
                  ${item.link_materi_siswa ? `<a href="${item.link_materi_siswa}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="padding: 0.2rem 0.45rem; font-size: 0.75rem; color: var(--accent-orange); border-color: var(--accent-orange);" title="Materi Siswa"><i class="fab fa-youtube"></i></a>` : ''}
                  ${!isFounder ? `
                  <button class="btn btn-outline btn-sm" style="padding: 0.2rem 0.45rem; font-size: 0.75rem;" onclick="window.editSchedule(${item.id})" title="Edit Sesi"><i class="fas fa-edit"></i></button>
                  <button class="btn btn-outline btn-sm" style="color: #e53e3e; border-color: #e53e3e; padding: 0.2rem 0.45rem; font-size: 0.75rem;" onclick="window.deleteSchedule(${item.id})" title="Hapus Sesi"><i class="fas fa-trash-alt"></i></button>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </details>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}
window.renderManagerSchedules = renderManagerSchedules;

export function copyStudentCredentials() {
  const nis = document.getElementById('modal-siswa-cred-nis')?.textContent || '';
  const pwd = document.getElementById('modal-siswa-cred-password')?.textContent || '';
  const name = document.getElementById('modal-siswa-cred-name')?.textContent || '';
  const text = `Kredensial Login Siswa SoC Pojok Hope:\nNama: ${name}\nNIS (Username): ${nis}\nPassword Default: ${pwd}\nLogin di: http://localhost:5000/login.html`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      alert('Kredensial login siswa berhasil disalin ke clipboard!');
    }).catch(() => {
      prompt('Salin kredensial login siswa berikut:', text);
    });
  } else {
    prompt('Salin kredensial login siswa berikut:', text);
  }
}
window.copyStudentCredentials = copyStudentCredentials;

export function closeStudentCredentialModal() {
  const modal = document.getElementById('modal-siswa-credential');
  if (modal) modal.style.display = 'none';
  switchView('data-siswa');
}
window.closeStudentCredentialModal = closeStudentCredentialModal;

// Cache for teachers data
if (!window.allTeachersData) window.allTeachersData = [];
window.isDeleteTeacherMode = false;

export async function renderDataGuruTable() {
  const tbody = document.getElementById('data-guru-tbody');
  if (!tbody) return;

  // Show skeleton loading rows while fetching (7 columns)
  tbody.innerHTML = Array(4).fill(0).map(() => `
    <tr style="border-bottom: 1px solid var(--border-color);">
      <td style="padding: 0.75rem 1rem; text-align: center;"><div class="skeleton skeleton-text" style="width: 25px; margin: 0 auto;"></div></td>
      <td style="padding: 0.75rem 1rem; text-align: center;"><div class="skeleton skeleton-text" style="width: 70px; margin: 0 auto;"></div></td>
      <td style="padding: 0.75rem 1rem;"><div class="skeleton skeleton-text" style="width: 140px;"></div></td>
      <td style="padding: 0.75rem 1rem; text-align: center;"><div class="skeleton skeleton-text" style="width: 30px; margin: 0 auto;"></div></td>
      <td style="padding: 0.75rem 1rem;"><div class="skeleton skeleton-text" style="width: 120px;"></div></td>
      <td style="padding: 0.75rem 1rem;"><div class="skeleton skeleton-text" style="width: 120px;"></div></td>
      <td style="padding: 0.75rem 1rem; text-align: center;"><div class="skeleton skeleton-text" style="width: 80px; margin: 0 auto;"></div></td>
    </tr>
  `).join('');

  try {
    let teachers = [];
    try {
      const res = await fetch('http://localhost:5000/api/teachers');
      if (res.ok) {
        const data = await res.json();
        teachers = Array.isArray(data) ? data : (data.data || []);
      }
    } catch (e) {
      console.warn('Failed to fetch /api/teachers, trying /api/users?role=guru:', e);
    }

    if (teachers.length === 0) {
      try {
        const resFallback = await fetch('http://localhost:5000/api/users?role=guru');
        if (resFallback.ok) {
          const dataFallback = await resFallback.json();
          teachers = Array.isArray(dataFallback) ? dataFallback : (dataFallback.data || []);
        }
      } catch (e) {}
    }

    const isAdmin = (window.currentRole === 'admin');
    if (isAdmin) {
      teachers = teachers.filter(u => ['guru', 'manager', 'founder'].includes((u.role || 'guru').toLowerCase()) && (u.role || '').toLowerCase() !== 'admin' && !['0025001', '1001001'].includes(String(u.id)) && (u.username || '').toLowerCase() !== 'admin');
    } else {
      teachers = teachers.filter(u => (u.role || '').toLowerCase() === 'guru' && !['0025001', '1001001'].includes(String(u.id)) && (u.username || '').toLowerCase() !== 'admin');
    }

    const searchInput = document.getElementById('search-data-guru');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    if (query) {
      teachers = teachers.filter(t => {
        const idStr = String(t.teacher_code || t.id || '').toLowerCase();
        const nameStr = String(t.full_name || '').toLowerCase();
        const nickStr = String(t.nickname || '').toLowerCase();
        const jurStr = String(t.jurusan || t.specialization || '').toLowerCase();
        const phoneStr = String(t.contact || t.phone || '').toLowerCase();
        const emailStr = String(t.email || '').toLowerCase();
        return idStr.includes(query) || nameStr.includes(query) || nickStr.includes(query) || jurStr.includes(query) || phoneStr.includes(query) || emailStr.includes(query);
      });
    }

    window.allTeachersData = teachers;

    if (teachers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted); font-size:0.9rem;">Tidak ada data pengajar aktif.</td></tr>';
      return;
    }

    let rowsHtml = '';
    teachers.forEach((tutor, idx) => {
      try {
        const noVal = idx + 1;
        const idVal = tutor.teacher_code || tutor.id || '-';
        const nameVal = tutor.full_name || formatTeacherName(tutor);
        const genderRaw = String(tutor.gender || '').trim().toLowerCase();
        const isMale = genderRaw.startsWith('l') || genderRaw === 'male';
        const genderBadge = isMale
          ? `<span class="badge badge-teal" style="font-weight:700; padding:0.25rem 0.5rem;">L</span>`
          : `<span class="badge badge-orange" style="font-weight:700; padding:0.25rem 0.5rem;">P</span>`;
        const jurusanVal = tutor.jurusan || tutor.specialization ? formatClassName(tutor.jurusan || tutor.specialization) : '-';
        const phoneVal = tutor.contact || tutor.phone || '-';
        const emailVal = tutor.email || '-';

        const uRole = (tutor.role || 'guru').toLowerCase();
        let roleBadge = '';
        if (isAdmin) {
          if (uRole === 'founder') {
            roleBadge = `<span class="badge badge-orange" style="font-size:0.75rem; margin-left:0.4rem;">Founder</span>`;
          } else if (uRole === 'manager') {
            roleBadge = `<span class="badge badge-green" style="font-size:0.75rem; margin-left:0.4rem;">Manager</span>`;
          } else {
            roleBadge = `<span class="badge badge-teal" style="font-size:0.75rem; margin-left:0.4rem;">Guru</span>`;
          }
        }

        const btnLabel = isAdmin ? 'Detail / Edit' : 'Detail Guru';
        const btnIcon = isAdmin ? 'fa-edit' : 'fa-eye';

        const escapedName = (tutor.full_name || '').split("'").join("\\'");
        // Only allow deleting actual teachers (never delete founder or manager)
        const canDelete = isAdmin && window.isDeleteTeacherMode && uRole === 'guru';
        const deleteBtnHtml = canDelete
          ? `<button class="btn btn-sm btn-outline" style="margin-left:0.35rem; color:#e53e3e; border-color:#e53e3e; padding: 0.35rem 0.6rem; font-size: 0.8rem;" onclick="window.confirmDeleteTeacher('${tutor.id}', '${escapedName}')" title="Hapus Guru"><i class="fas fa-trash-alt"></i></button>`
          : '';

        rowsHtml += `
          <tr style="border-bottom: 1px solid var(--border-color); font-size: 0.9rem;">
            <td style="padding: 0.75rem 1rem; text-align: center !important; vertical-align: middle; font-weight: 600;">${noVal}</td>
            <td style="padding: 0.75rem 1rem; text-align: center !important; vertical-align: middle; font-weight: 600; font-family: monospace; color: var(--color-primary-dark);">${idVal}</td>
            <td style="padding: 0.75rem 1rem; vertical-align: middle; font-weight: 600; color: var(--color-secondary-dark);">
              <div style="display: flex; align-items: center; gap: 0.65rem;">
                <img src="${tutor.photo_url || 'static/src/assets/profiles/' + tutor.id + '.jpg'}" onerror="this.src='static/src/assets/ui/logo.png'" alt="Foto" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 2px solid var(--color-secondary); flex-shrink: 0; background: #fff;">
                <span>${nameVal} ${roleBadge}</span>
              </div>
            </td>
            <td style="padding: 0.75rem 1rem; text-align: center !important; vertical-align: middle;">${genderBadge}</td>
            <td style="padding: 0.75rem 1rem; text-align: center !important; vertical-align: middle;"><span class="badge badge-teal" style="font-size:0.8rem;">${jurusanVal}</span></td>
            <td style="padding: 0.75rem 1rem; text-align: center !important; vertical-align: middle;">
              <div style="font-weight:600; color:var(--color-secondary-dark); line-height:1.2;">${phoneVal}</div>
              <div style="font-size:0.78rem; color:var(--text-muted); line-height:1.2; margin-top:2px;">${emailVal}</div>
            </td>
            <td style="padding: 0.75rem 1rem; text-align: center !important; vertical-align: middle; white-space: nowrap;">
              <button class="btn btn-sm btn-outline" style="padding: 0.35rem 0.65rem; font-size: 0.8rem;" onclick="window.viewDetailGuru('${tutor.id}')">
                <i class="fas ${btnIcon}"></i> ${btnLabel}
              </button>
              ${deleteBtnHtml}
            </td>
          </tr>
        `;
      } catch (rowErr) {
        console.error('Error generating tutor row:', rowErr);
      }
    });

    tbody.innerHTML = rowsHtml;
  } catch (err) {
    console.error('Error rendering data guru table:', err);
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted); font-size:0.9rem;">Gagal memuat data pengajar dari server.</td></tr>';
  }
}
window.renderDataGuruTable = renderDataGuruTable;

export function toggleDeleteTeacherMode() {
  window.isDeleteTeacherMode = !window.isDeleteTeacherMode;
  const btn = document.getElementById('btn-toggle-delete-guru');
  if (btn) {
    if (window.isDeleteTeacherMode) {
      btn.innerHTML = '<i class="fas fa-check"></i> Selesai Hapus';
      btn.style.backgroundColor = '#e53e3e';
      btn.style.color = '#fff';
    } else {
      btn.innerHTML = '<i class="fas fa-trash-alt"></i> Hapus Guru';
      btn.style.backgroundColor = 'transparent';
      btn.style.color = '#e53e3e';
    }
  }
  renderDataGuruTable();
}
window.toggleDeleteTeacherMode = toggleDeleteTeacherMode;

export async function confirmDeleteTeacher(teacherId, teacherName) {
  const ok1 = await window.socConfirm(`Apakah Anda yakin ingin menghapus data pengajar: ${teacherName}?`, "Hapus Pengajar");
  if (!ok1) return;

  const ok2 = await window.showSoCModal({
    title: "Konfirmasi Cabut Penugasan & Hapus",
    message: `PERINGATAN: Menghapus pengajar ini akan menghapus akun pengajar dan mencabut semua penugasan kelas yang dipegangnya. Lanjutkan?`,
    type: "danger",
    confirmText: "Ya, Hapus Pengajar",
    cancelText: "Batal"
  });
  if (!ok2) return;

  try {
    const res = await fetch(`http://localhost:5000/api/teachers/${teacherId}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      alert(`Pengajar ${teacherName} berhasil dihapus.`);
      await renderDataGuruTable();
      if (typeof window.loadClassAssignments === 'function') window.loadClassAssignments();
      if (typeof window.populateTeacherDropdowns === 'function') window.populateTeacherDropdowns();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Gagal menghapus pengajar.');
    }
  } catch (e) {
    console.error('Error deleting teacher:', e);
    alert('Terjadi kesalahan saat menghapus pengajar.');
  }
}
window.confirmDeleteTeacher = confirmDeleteTeacher;

export function exportDataGuru() {
  const teachers = window.allTeachersData || [];
  if (!teachers || teachers.length === 0) {
    alert('Tidak ada data pengajar untuk diexport.');
    return;
  }

  const headers = [
    'No',
    'ID Guru',
    'Nama Lengkap',
    'Nama Panggilan',
    'Jenis Kelamin',
    'Jurusan / Lulusan',
    'No HP / Kontak',
    'Email'
  ];

  const rows = teachers.map((t, idx) => ({
    'No': idx + 1,
    'ID Guru': String(t.teacher_code || t.id || ''),
    'Nama Lengkap': t.full_name || '',
    'Nama Panggilan': t.nickname || '',
    'Jenis Kelamin': t.gender || '',
    'Jurusan / Lulusan': t.jurusan || t.specialization || '',
    'No HP / Kontak': formatSoCPhone(t.contact || t.phone),
    'Email': t.email || ''
  }));

  exportStyledSoCExcel({
    filename: 'Data_Guru_SoC_Pojok_Hope.xlsx',
    sheetName: 'Data Pengajar',
    headers,
    rows,
    headerHex: '1E7E5A',
    zebraHex: 'F8FAFC'
  });
}
window.exportDataGuru = exportDataGuru;

export async function viewDetailGuru(teacherId) {
  let teacher = (window.allTeachersData || []).find(t => String(t.id) === String(teacherId) || String(t.teacher_code) === String(teacherId));
  if (!teacher) {
    try {
      const res = await fetch(`http://localhost:5000/api/teachers/${teacherId}`);
      if (res.ok) {
        teacher = await res.json();
      }
    } catch (e) {
      console.warn('Error fetching teacher detail:', e);
    }
  }

  if (!teacher) {
    alert('Data pengajar tidak ditemukan.');
    return;
  }

  window.selectedTeacherDetail = teacher;

  const tRole = (teacher.role || 'guru').toLowerCase();
  const isFounderOrManager = ['founder', 'manager'].includes(tRole);

  // Fill Top Card form inputs
  const origId = document.getElementById('edit-guru-original-id');
  const idInput = document.getElementById('edit-guru-id');
  const pwdInput = document.getElementById('edit-guru-password');
  const nameInput = document.getElementById('edit-guru-nama');
  const nickInput = document.getElementById('edit-guru-panggilan');
  const genderSelect = document.getElementById('edit-guru-gender');
  const phoneInput = document.getElementById('edit-guru-kontak');
  const emailInput = document.getElementById('edit-guru-email');
  const jurusanInput = document.getElementById('edit-guru-jurusan');
  const fotoGroup = document.getElementById('group-edit-guru-foto');
  const saveContainer = document.getElementById('btn-save-detail-guru-container');
  const roleBadge = document.getElementById('badge-detail-guru-role');
  const subTitle = document.getElementById('detail-guru-subtitle');

  if (origId) origId.value = teacher.id;
  if (idInput) idInput.value = teacher.teacher_code || teacher.id;
  if (nameInput) nameInput.value = teacher.full_name || '';
  if (nickInput) nickInput.value = teacher.nickname || '';
  if (genderSelect) genderSelect.value = teacher.gender || 'Perempuan';
  if (phoneInput) phoneInput.value = teacher.contact || teacher.phone || '';
  if (emailInput) emailInput.value = teacher.email || '';
  if (jurusanInput) jurusanInput.value = teacher.jurusan || teacher.specialization || '';

  const isAdmin = (window.currentRole === 'admin');
  const pwdGroup = document.getElementById('group-edit-guru-password') || (pwdInput ? pwdInput.closest('.form-group') : null);
  if (isAdmin) {
    if (pwdGroup) pwdGroup.style.display = 'block';
    if (pwdInput) {
      pwdInput.value = teacher.password || teacher.password_display || '';
      pwdInput.readOnly = false;
      pwdInput.style.backgroundColor = '#fff';
    }
  } else {
    // Hide teacher password from manager and founder
    if (pwdGroup) pwdGroup.style.display = 'none';
    if (pwdInput) pwdInput.value = '';
  }

  if (roleBadge) {
    if (tRole === 'founder') roleBadge.textContent = 'Founder / Owner';
    else if (tRole === 'manager') roleBadge.textContent = 'Manager Operasional';
    else roleBadge.textContent = 'Guru / Pengajar';
  }

  if (subTitle) {
    if (isFounderOrManager) {
      subTitle.textContent = 'Informasi profil dan hak akses manajemen sistem.';
    } else {
      subTitle.textContent = 'Informasi profil, akun login, dan kartu identitas pengajar.';
    }
  }

  [nameInput, nickInput, phoneInput, emailInput, jurusanInput].forEach(inp => {
    if (inp) {
      inp.readOnly = !isAdmin;
      inp.style.backgroundColor = isAdmin ? '#fff' : '#f8f9fa';
    }
  });
  if (idInput) {
    idInput.readOnly = true;
    idInput.disabled = true;
  }
  if (genderSelect) genderSelect.disabled = !isAdmin;
  const btnLabelGuruFoto = document.getElementById('btn-label-edit-guru-foto');
  if (btnLabelGuruFoto) btnLabelGuruFoto.style.display = isAdmin ? 'inline-flex' : 'none';
  if (fotoGroup) fotoGroup.style.display = 'flex';
  if (saveContainer) saveContainer.style.display = isAdmin ? 'flex' : 'none';

  const detailGuruPhotoPrev = document.getElementById('detail-guru-photo-preview');
  if (detailGuruPhotoPrev) {
    detailGuruPhotoPrev.src = teacher.photo_url || `static/src/assets/profiles/${teacher.id}.jpg`;
    detailGuruPhotoPrev.onerror = () => { detailGuruPhotoPrev.src = 'static/src/assets/ui/team2.jpg'; };
  }

  // Bottom Card ID Mockup — HIDE FOR FOUNDER AND MANAGER
  const cardParent = document.getElementById('teacher-id-card-render-area')?.closest('.dashboard-card');
  if (cardParent) {
    cardParent.style.display = isFounderOrManager ? 'none' : 'block';
  }

  if (!isFounderOrManager) {
    const cardPhoto = document.getElementById('card-teacher-photo');
    const cardName = document.getElementById('card-teacher-name');
    const cardIdBadge = document.getElementById('card-teacher-id-badge');
    const cardJurusanBadge = document.getElementById('card-teacher-jurusan-badge');
    const cardQr = document.getElementById('card-teacher-qr');

    const teacherCode = teacher.teacher_code || teacher.id;
    if (cardPhoto) {
      cardPhoto.src = teacher.photo_url || `static/src/assets/profiles/${teacher.id}.jpg`;
      cardPhoto.onerror = () => { cardPhoto.src = 'static/src/assets/ui/team2.jpg'; };
    }
    if (cardName) cardName.textContent = teacher.full_name || 'Guru SoC';
    if (cardIdBadge) cardIdBadge.textContent = `ID: ${teacherCode}`;
    if (cardJurusanBadge) cardJurusanBadge.textContent = teacher.jurusan || teacher.specialization || 'Pengajar SoC';
    if (cardQr) {
      cardQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(teacherCode)}`;
    }
  }

  if (window.location.hash === '#detail-guru') {
    switchView('detail-guru');
  } else {
    window.location.hash = 'detail-guru';
  }
}
window.viewDetailGuru = viewDetailGuru;
export const openDetailGuru = viewDetailGuru;
window.openDetailGuru = viewDetailGuru;

export function printTeacherIdCard() {
  const cardArea = document.getElementById('teacher-id-card-render-area');
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
        <title>Kartu ID Pengajar - School of Character Pojok Hope</title>
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
window.printTeacherIdCard = printTeacherIdCard;

export async function downloadTeacherIdCard() {
  const cardArea = document.getElementById('teacher-id-card-render-area');
  if (!cardArea) return;
  const teacher = window.selectedTeacherDetail || {};
  const tCode = teacher.teacher_code || teacher.id || 'Guru';

  if (typeof html2canvas === 'function') {
    try {
      const canvas = await html2canvas(cardArea, { scale: 2, useCORS: true, allowTaint: true });
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `Kartu_Pengajar_${tCode}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.warn('html2canvas failed, falling back to print window:', e);
      printTeacherIdCard();
    }
  } else {
    printTeacherIdCard();
  }
}
window.downloadTeacherIdCard = downloadTeacherIdCard;

export function copyTeacherCredentials() {
  const id = document.getElementById('modal-cred-id')?.textContent || '';
  const pwd = document.getElementById('modal-cred-password')?.textContent || '';
  const name = document.getElementById('modal-cred-name')?.textContent || '';
  const text = `Kredensial Login Pengajar SoC Pojok Hope:\nNama: ${name}\nID Pengajar: ${id}\nPassword Default: ${pwd}\nLogin di: http://localhost:5000/login.html`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      alert('Kredensial login berhasil disalin ke clipboard!');
    }).catch(() => {
      prompt('Salin kredensial login berikut:', text);
    });
  } else {
    prompt('Salin kredensial login berikut:', text);
  }
}
window.copyTeacherCredentials = copyTeacherCredentials;

export function closeTeacherCredentialModal() {
  const modal = document.getElementById('modal-guru-credential');
  if (modal) modal.style.display = 'none';
  switchView('data-guru');
}
window.closeTeacherCredentialModal = closeTeacherCredentialModal;

export function viewRaporFromTable(studentId) {
  window.isViewingAlumniRapor = false;
  window.selectedStudentKey = studentId;
  if (window.location.hash === '#rapor') {
    switchView('rapor');
  } else {
    window.location.hash = 'rapor';
  }
  loadRaporData(studentId);

  const managerPlottingContainer = document.getElementById('manager-plotting-container');
  if (managerPlottingContainer) {
    managerPlottingContainer.style.display = 'block';
  }

  const targetStudent = (window.allStudents || []).find(s => s.id === parseInt(studentId, 10));
  if (targetStudent) {
    syncStudentPlottingUI(targetStudent);
  }

  const currentRole = window.currentRole || 'manager';
  if (currentRole === 'manager' || currentRole === 'founder' || currentRole === 'admin') {
    document.querySelectorAll('#view-rapor input[type="range"]').forEach(input => input.disabled = true);
    document.querySelectorAll('#view-rapor input.score-manual-input').forEach(input => input.readOnly = true);
    const starActionButtons = document.getElementById('star-action-buttons');
    if (starActionButtons) starActionButtons.style.display = 'none';
    const btnSaveScore = document.getElementById('btn-save-score');
    if (btnSaveScore) btnSaveScore.style.display = 'none';
  }
}
window.viewRaporFromTable = viewRaporFromTable;

export async function populateStudentSelectors() {
  const sel1 = document.getElementById('student-selector');
  const sel2 = document.getElementById('rapor-student-selector');
  const plottingSel = document.getElementById('plotting-student-selector');
  const datalist = document.getElementById('datalist-students');

  if (!window.allStudents || window.allStudents.length === 0) {
    await loadAllStudents();
  }

  const allSt = window.allStudents || [];
  const activeSt = allSt.filter(s => s.status_siswa !== 'alumni');
  const selectorList = activeSt.length > 0 ? activeSt : allSt;

  // 1. Populate global student datalist for native search
  if (datalist) {
    datalist.innerHTML = selectorList.map(s => 
      `<option value="${formatStudentDisplayName(s)}"></option>`
    ).join('');
  }

  // 2. Populate legacy select element if present
  if (sel1) {
    sel1.innerHTML = selectorList.map(s => 
      `<option value="${s.id}">${formatStudentDisplayName(s)}</option>`
    ).join('');
  }

  // 3. Set default / active student
  const loggedInUser = window.currentUser;
  const currentRole = window.currentRole || 'guru';
  if (selectorList.length > 0) {
    if (!loggedInUser || currentRole !== 'siswa') {
      if (!window.selectedStudentKey || !allSt.some(s => s.id === window.selectedStudentKey)) {
        window.selectedStudentKey = selectorList[0].id;
      }
    } else if (loggedInUser && (loggedInUser.student_id || loggedInUser.id)) {
      window.selectedStudentKey = parseInt(loggedInUser.student_id || loggedInUser.id, 10);
    }
  }

  const currentSt = allSt.find(s => s.id === window.selectedStudentKey) || selectorList[0];
  if (currentSt) {
    if (sel2 && !sel2.value) {
      sel2.value = formatStudentDisplayName(currentSt);
    }
    if (plottingSel && !plottingSel.value) {
      plottingSel.value = formatStudentDisplayName(currentSt);
      const engSel = document.getElementById('plotting-english-level');
      const mathSel = document.getElementById('plotting-math-level');
      if (engSel) engSel.value = getRawClassName(currentSt.kelas_english) || currentSt.kelas_english || '';
      if (mathSel) mathSel.value = getRawClassName(currentSt.kelas_math) || currentSt.kelas_math || '';
    }
    const starStudentName = document.getElementById('star-student-name');
    if (starStudentName) {
      starStudentName.textContent = formatStudentDisplayName(currentSt);
    }
    const indivStudentName = document.getElementById('rapor-individual-student-name');
    if (indivStudentName) {
      indivStudentName.textContent = formatStudentDisplayName(currentSt);
      indivStudentName.style.display = 'block';
    }
    if (window.currentView === 'rapor') {
      loadRaporData();
    }
  }
}
window.populateStudentSelectors = populateStudentSelectors;

export function updateTeacherAssignmentExclusivity() {
  const selects = document.querySelectorAll('.teacher-assign-select');
  if (!selects.length) return;

  // 1. Gather current assignments
  const calistungTeachers = [];
  const englishAssignments = []; // { teacher, className }
  const mathAssignments = [];    // { teacher, className }

  selects.forEach(sel => {
    const teacher = (sel.value || '').trim();
    if (!teacher) return;
    const rawClass = (sel.getAttribute('data-kelas') || '').trim();
    const lowerClass = rawClass.toLowerCase();

    if (lowerClass.includes('calistung')) {
      calistungTeachers.push({ teacher, className: rawClass });
    } else if (lowerClass.includes('english')) {
      englishAssignments.push({ teacher, className: rawClass });
    } else if (lowerClass.includes('math') || lowerClass.includes('matematika')) {
      mathAssignments.push({ teacher, className: rawClass });
    }
  });

  // 2. Iterate each select and apply mutual exclusion rules
  selects.forEach(sel => {
    const currentClass = (sel.getAttribute('data-kelas') || '').trim();
    const lowerClass = currentClass.toLowerCase();
    let currentCategory = 'other';
    if (lowerClass.includes('calistung')) currentCategory = 'calistung';
    else if (lowerClass.includes('english')) currentCategory = 'english';
    else if (lowerClass.includes('math') || lowerClass.includes('matematika')) currentCategory = 'math';

    Array.from(sel.options).forEach(opt => {
      if (!opt.value) return; // Keep placeholder enabled
      const tName = opt.value.trim();

      if (!opt.hasAttribute('data-base-label')) {
        opt.setAttribute('data-base-label', opt.textContent.trim());
      }
      const baseLabel = opt.getAttribute('data-base-label');

      // If selected in this dropdown, keep enabled
      if (opt.selected) {
        opt.disabled = false;
        opt.textContent = baseLabel;
        return;
      }

      let shouldDisable = false;
      let reason = '';

      if (currentCategory === 'calistung') {
        const inOtherCal = calistungTeachers.find(c => c.teacher.toLowerCase() === tName.toLowerCase() && c.className !== currentClass);
        const inEng = englishAssignments.find(e => e.teacher.toLowerCase() === tName.toLowerCase());
        const inMath = mathAssignments.find(m => m.teacher.toLowerCase() === tName.toLowerCase());

        if (inOtherCal) {
          shouldDisable = true;
          reason = `(Sudah mengajar ${inOtherCal.className})`;
        } else if (inEng) {
          shouldDisable = true;
          reason = `(Sudah mengajar ${inEng.className})`;
        } else if (inMath) {
          shouldDisable = true;
          reason = `(Sudah mengajar ${inMath.className})`;
        }
      } else if (currentCategory === 'english') {
        const inCal = calistungTeachers.find(c => c.teacher.toLowerCase() === tName.toLowerCase());
        const inOtherEng = englishAssignments.find(e => e.teacher.toLowerCase() === tName.toLowerCase() && e.className !== currentClass);

        if (inCal) {
          shouldDisable = true;
          reason = '(Sudah mengajar Calistung)';
        } else if (inOtherEng) {
          shouldDisable = true;
          reason = `(Sudah mengajar ${inOtherEng.className})`;
        }
        // Teaching Math is allowed!
      } else if (currentCategory === 'math') {
        const inCal = calistungTeachers.find(c => c.teacher.toLowerCase() === tName.toLowerCase());
        const inOtherMath = mathAssignments.find(m => m.teacher.toLowerCase() === tName.toLowerCase() && m.className !== currentClass);

        if (inCal) {
          shouldDisable = true;
          reason = '(Sudah mengajar Calistung)';
        } else if (inOtherMath) {
          shouldDisable = true;
          reason = `(Sudah mengajar ${inOtherMath.className})`;
        }
        // Teaching English is allowed!
      }

      opt.disabled = shouldDisable;
      opt.textContent = shouldDisable ? `${baseLabel} ${reason}` : baseLabel;
    });
  });
}
window.updateTeacherAssignmentExclusivity = updateTeacherAssignmentExclusivity;

export async function renderManajemenKelas() {
  try {
    // 1. Ensure window.allUsers is populated with system users / tutors
    if (!window.allUsers || window.allUsers.length === 0) {
      try {
        const uRes = await fetch('http://localhost:5000/api/users');
        if (uRes.ok) {
          const uData = await uRes.json();
          window.allUsers = Array.isArray(uData) ? uData : (uData.data || []);
        }
      } catch (err) {
        console.warn('Error fetching allUsers in renderManajemenKelas:', err);
      }
    }

    let guruUsers = (window.allUsers || []).filter(u => {
      const r = (u.role || '').toLowerCase();
      const n = (u.full_name || u.name || '').toLowerCase();
      return r === 'guru' && !n.includes('sity') && !n.includes('minarti');
    });
    if (guruUsers.length === 0) {
      try {
        const tRes = await fetch('http://localhost:5000/api/tutors');
        if (tRes.ok) {
          const tData = await tRes.json();
          const rawTutors = Array.isArray(tData) ? tData : (tData.data || []);
          guruUsers = rawTutors.filter(u => {
            const r = (u.role || 'guru').toLowerCase();
            const n = (u.full_name || u.name || '').toLowerCase();
            return r === 'guru' && !n.includes('sity') && !n.includes('minarti');
          });
        }
      } catch (err) {
        console.warn('Error fetching tutors in renderManajemenKelas:', err);
      }
    }

    // 2. Fetch current class assignments from backend
    let assignments = [];
    try {
      const res = await fetch('http://localhost:5000/api/classes/assignments');
      if (res.ok) {
        assignments = await res.json();
      }
    } catch (e) {
      console.warn('Error fetching class assignments:', e);
    }

    window.allClassAssignments = Array.isArray(assignments) ? assignments : [];

    // 3. Update total class count badge
    const badgeTotal = document.getElementById('badge-total-kelas');
    if (badgeTotal) {
      badgeTotal.textContent = `${window.allClassAssignments.length} Kelas`;
    }

    // 4. Role check: Founder is read-only
    const role = window.currentRole || 'admin';
    const isFounder = (role === 'founder');
    const actionsContainer = document.getElementById('class-management-actions');
    const saveContainer = document.getElementById('container-btn-simpan-penugasan');
    if (actionsContainer) actionsContainer.style.display = isFounder ? 'none' : 'flex';
    if (saveContainer) saveContainer.style.display = isFounder ? 'none' : 'block';

    const thDel = document.getElementById('th-delete-class');
    if (thDel) {
      thDel.style.display = (!isFounder && window.isDeleteClassMode) ? 'table-cell' : 'none';
    }

    // 5. Populate #teacher-assign-tbody dynamically
    const tbody = document.getElementById('teacher-assign-tbody');
    if (tbody) {
      tbody.innerHTML = '';
      window.allClassAssignments.forEach(item => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-kelas-row', item.class_name);

        let badgeCls = 'badge-orange';
        let badgeText = (item.class_name || '').slice(0, 2).toUpperCase();
        const cName = String(item.class_name || '').toLowerCase();
        const cat = String(item.category || '').toLowerCase();
        if (cName.includes('calistung') || cat.includes('calistung')) {
          badgeCls = 'badge-teal';
          badgeText = 'CL';
        } else if (cName.includes('english') || cat.includes('english')) {
          badgeCls = 'badge-teal';
          badgeText = 'EN';
        } else if (cName.includes('math') || cat.includes('matematika')) {
          badgeCls = 'badge-green';
          badgeText = 'MA';
        }

        const displayTitle = item.display_label || formatClassName(item.class_name);
        const assignedTeacher = item.teacher_name || '';

        let teacherOptions = '<option value="">— Pilih Guru —</option>';
        guruUsers.forEach(guru => {
          const tName = guru.full_name || guru.name;
          if (!tName) return;
          const isSel = (assignedTeacher && (
            tName.toLowerCase() === assignedTeacher.toLowerCase() ||
            (assignedTeacher.toLowerCase().includes('nicky') && tName.toLowerCase().includes('nicky')) ||
            (assignedTeacher.toLowerCase().includes('dela') && tName.toLowerCase().includes('dela')) ||
            (assignedTeacher.toLowerCase().includes('nisa') && tName.toLowerCase().includes('nisa')) ||
            (assignedTeacher.toLowerCase().includes('fidya') && tName.toLowerCase().includes('fidya'))
          ));
          teacherOptions += `<option value="${tName}" ${isSel ? 'selected' : ''}>${tName}</option>`;
        });

        tr.innerHTML = `
          <td style="text-align: center !important; vertical-align: middle; font-weight: 600; padding: 0.85rem 0.5rem; width: 60px;">
            ${index + 1}
          </td>
          <td style="font-weight: 600; color: var(--text-dark); vertical-align: middle; padding: 0.85rem 1rem;">
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <span class="badge ${badgeCls}" style="font-weight: 700; font-size: 0.75rem; padding: 0.25rem 0.5rem; border-radius: 6px;">${badgeText}</span>
              <span>${displayTitle}</span>
            </div>
          </td>
          <td style="padding: 0.6rem 1rem; vertical-align: middle; width: 340px;">
            <select class="form-control custom-select teacher-assign-select" data-kelas="${item.class_name}" ${isFounder ? 'disabled' : ''} style="width: 100%; max-width: 320px;">
              ${teacherOptions}
            </select>
          </td>
          <td class="td-delete-class" style="display: ${(!isFounder && window.isDeleteClassMode) ? 'table-cell' : 'none'}; text-align: center; vertical-align: middle; padding: 0.6rem 1rem; width: 80px;">
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="deleteClassAssignment('${item.class_name}')" style="padding: 0.3rem 0.65rem; border-radius: 6px;" title="Hapus Kelas ${item.class_name}">
              <i class="fas fa-trash-alt"></i>
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      // Attach change listeners for mutual exclusion locking
      tbody.querySelectorAll('.teacher-assign-select').forEach(sel => {
        if (!sel._exclListener) {
          sel._exclListener = true;
          sel.addEventListener('change', () => {
            updateTeacherAssignmentExclusivity();
          });
        }
      });
      updateTeacherAssignmentExclusivity();
    }

  } catch (e) {
    console.warn('Error loading class assignments:', e);
  }
}

export function toggleDeleteClassMode() {
  window.isDeleteClassMode = !window.isDeleteClassMode;
  const btn = document.getElementById('btn-toggle-delete-class');
  const thDel = document.getElementById('th-delete-class');
  const tdDels = document.querySelectorAll('.td-delete-class');

  if (window.isDeleteClassMode) {
    if (btn) {
      btn.className = 'btn btn-danger btn-sm';
      btn.innerHTML = '<i class="fas fa-check"></i> Selesai Hapus';
    }
    if (thDel) thDel.style.display = 'table-cell';
    tdDels.forEach(td => td.style.display = 'table-cell');
  } else {
    if (btn) {
      btn.className = 'btn btn-outline-danger btn-sm';
      btn.innerHTML = '<i class="fas fa-trash-alt"></i> Hapus Kelas';
    }
    if (thDel) thDel.style.display = 'none';
    tdDels.forEach(td => td.style.display = 'none');
  }
}
window.toggleDeleteClassMode = toggleDeleteClassMode;

export async function deleteClassAssignment(className) {
  if (!className) return;
  const confirmed = confirm(`Apakah Anda yakin ingin menghapus kelas "${className}"? Data yang terhubung akan disesuaikan.`);
  if (!confirmed) return;

  try {
    const res = await fetch(`http://localhost:5000/api/classes/assignments/${encodeURIComponent(className)}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      if (typeof renderManajemenKelas === 'function') await renderManajemenKelas();
      alert(`Kelas "${className}" berhasil dihapus.`);
    } else {
      const err = await res.json().catch(() => ({}));
      alert('Gagal menghapus kelas: ' + (err.error || 'Server error'));
    }
  } catch (err) {
    console.error('Error deleting class assignment:', err);
    alert('Gagal terhubung ke server: ' + err.message);
  }
}
window.deleteClassAssignment = deleteClassAssignment;

export function openAddClassModal() {
  let modal = document.getElementById('modal-add-class-level');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-add-class-level';
    modal.className = 'modal-backdrop';
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:9999;';
    modal.innerHTML = `
      <div class="modal-box" style="background:var(--bg-card, #fff); border-radius:12px; max-width:440px; width:90%; padding:1.5rem; box-shadow:0 10px 25px rgba(0,0,0,0.2);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem;">
          <h3 style="margin:0; font-size:1.15rem; color:var(--color-secondary-dark);"><i class="fas fa-plus-circle text-primary"></i> Tambah Level / Kelas Baru</h3>
          <button type="button" onclick="document.getElementById('modal-add-class-level').style.display='none'" style="border:none; background:transparent; font-size:1.25rem; cursor:pointer; color:var(--text-muted);">&times;</button>
        </div>
        <form id="form-add-class-level" onsubmit="event.preventDefault(); window.submitAddClassLevel();">
          <div class="form-group" style="margin-bottom:1rem;">
            <label style="font-weight:600; font-size:0.88rem; display:block; margin-bottom:0.35rem;">Kategori / Mata Pelajaran:</label>
            <select id="add-class-category" class="form-control custom-select" required>
              <option value="Calistung">Calistung</option>
              <option value="English">English</option>
              <option value="Matematika">Matematika</option>
              <option value="Umum">Umum / Lainnya</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:1rem;">
            <label style="font-weight:600; font-size:0.88rem; display:block; margin-bottom:0.35rem;">Kode / Nama Kelas (Singkat):</label>
            <input type="text" id="add-class-name" class="form-control" placeholder="Contoh: English D atau Robotika" required>
          </div>
          <div class="form-group" style="margin-bottom:1rem;">
            <label style="font-weight:600; font-size:0.88rem; display:block; margin-bottom:0.35rem;">Label Tampilan (Lengkap):</label>
            <input type="text" id="add-class-display-label" class="form-control" placeholder="Contoh: English D (Mastery)" required>
          </div>
          <div class="form-group" style="margin-bottom:1.25rem;">
            <label style="font-weight:600; font-size:0.88rem; display:block; margin-bottom:0.35rem;">Pengajar / Guru Pengampu (Opsional):</label>
            <select id="add-class-teacher" class="form-control custom-select">
              <option value="">— Belum Ditentukan —</option>
            </select>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:0.5rem;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-add-class-level').style.display='none'">Batal</button>
            <button type="submit" id="btn-submit-add-class" class="btn btn-primary"><i class="fas fa-save"></i> Simpan Kelas</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const teacherSel = document.getElementById('add-class-teacher');
  if (teacherSel) {
    teacherSel.innerHTML = '<option value="">— Belum Ditentukan —</option>';
    let guruUsers = (window.allUsers || []).filter(u => {
      const r = (u.role || '').toLowerCase();
      const n = (u.full_name || u.name || '').toLowerCase();
      return r === 'guru' && !n.includes('sity') && !n.includes('minarti');
    });
    guruUsers.forEach(g => {
      const tName = g.full_name || g.name;
      if (tName) {
        teacherSel.innerHTML += `<option value="${tName}">${tName}</option>`;
      }
    });
  }

  const nameInp = document.getElementById('add-class-name');
  const labelInp = document.getElementById('add-class-display-label');
  if (nameInp) nameInp.value = '';
  if (labelInp) labelInp.value = '';

  modal.style.display = 'flex';
}
window.openAddClassModal = openAddClassModal;

export async function submitAddClassLevel() {
  const catEl = document.getElementById('add-class-category');
  const nameEl = document.getElementById('add-class-name');
  const labelEl = document.getElementById('add-class-display-label');
  const teachEl = document.getElementById('add-class-teacher');
  const submitBtn = document.getElementById('btn-submit-add-class');

  const category = catEl ? catEl.value.trim() : 'Umum';
  const className = nameEl ? nameEl.value.trim() : '';
  const displayLabel = labelEl ? labelEl.value.trim() : className;
  const teacherName = teachEl ? teachEl.value.trim() : '';

  if (!className) {
    alert('Kode / Nama Kelas wajib diisi!');
    return;
  }

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Menyimpan...';
    }

    const res = await fetch('http://localhost:5000/api/classes/assignments/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_name: className,
        category: category,
        display_label: displayLabel,
        teacher_name: teacherName
      })
    });

    if (res.ok) {
      const modal = document.getElementById('modal-add-class-level');
      if (modal) modal.style.display = 'none';
      if (typeof renderManajemenKelas === 'function') await renderManajemenKelas();
      alert(`Kelas "${displayLabel}" berhasil ditambahkan!`);
    } else {
      const err = await res.json().catch(() => ({}));
      alert('Gagal menambah kelas: ' + (err.error || 'Terjadi kesalahan pada server'));
    }
  } catch (err) {
    console.error('Error adding class assignment:', err);
    alert('Gagal terhubung ke server: ' + err.message);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-save"></i> Simpan Kelas';
    }
  }
}
window.submitAddClassLevel = submitAddClassLevel;
window.renderManajemenKelas = renderManajemenKelas;

export async function loadClassAssignments() {
  return renderManajemenKelas();
}
window.loadClassAssignments = loadClassAssignments;

export function syncStudentPlottingUI(student) {
  if (!student) return;
  const stageSel = document.getElementById('plotting-stage-selector');
  const engSel   = document.getElementById('plotting-english-level');
  const mathSel  = document.getElementById('plotting-math-level');
  const regulerRow = document.getElementById('plotting-reguler-levels-row');
  const calistungInfo = document.getElementById('plotting-calistung-info-row');

  const rawEng = String(student.kelas_english || '').trim();
  const rawMath = String(student.kelas_math || '').trim();
  const isCal = rawEng.toLowerCase().includes('calistung') || rawMath.toLowerCase().includes('calistung');

  if (stageSel) {
    stageSel.value = isCal ? 'calistung' : 'reguler';
  }
  if (regulerRow) regulerRow.style.display = isCal ? 'none' : 'flex';
  if (calistungInfo) calistungInfo.style.display = isCal ? 'block' : 'none';

  if (engSel) engSel.value = isCal ? '' : (getRawClassName(rawEng) || rawEng || '');
  if (mathSel) mathSel.value = isCal ? '' : (getRawClassName(rawMath) || rawMath || '');
}
window.syncStudentPlottingUI = syncStudentPlottingUI;

export function attachKelasListeners() {
  const stageSel = document.getElementById('plotting-stage-selector');
  if (stageSel && !stageSel._stageListenerAttached) {
    stageSel._stageListenerAttached = true;
    stageSel.addEventListener('change', () => {
      const isCal = (stageSel.value === 'calistung');
      const regulerRow = document.getElementById('plotting-reguler-levels-row');
      const calistungInfo = document.getElementById('plotting-calistung-info-row');
      if (regulerRow) regulerRow.style.display = isCal ? 'none' : 'flex';
      if (calistungInfo) calistungInfo.style.display = isCal ? 'block' : 'none';
    });
  }

  const plottingSel = document.getElementById('plotting-student-selector');
  if (plottingSel && !plottingSel._kelasListenerAttached) {
    plottingSel._kelasListenerAttached = true;
    const updatePlottingLevels = () => {
      const student = findStudentByInputValue(plottingSel.value);
      if (student) syncStudentPlottingUI(student);
    };
    plottingSel.addEventListener('input', updatePlottingLevels);
    plottingSel.addEventListener('change', updatePlottingLevels);
  }

  const btnSimpanPenempatan = document.getElementById('btn-simpan-penempatan');
  if (btnSimpanPenempatan && !btnSimpanPenempatan._kelasListenerAttached) {
    btnSimpanPenempatan._kelasListenerAttached = true;
    btnSimpanPenempatan.addEventListener('click', async () => {
      const raporSel     = document.getElementById('rapor-student-selector');
      const plottingSel2 = document.getElementById('plotting-student-selector');
      const engSel       = document.getElementById('plotting-english-level');
      const mathSel      = document.getElementById('plotting-math-level');

      const student = (window.allStudents || []).find(s => s.id === parseInt(window.selectedStudentKey, 10))
        || findStudentByInputValue(raporSel ? raporSel.value : '')
        || findStudentByInputValue(plottingSel2 ? plottingSel2.value : '');

      const studentId   = student ? student.id : null;
      if (!studentId) {
        alert('Pilih siswa terlebih dahulu!');
        return;
      }

      const stageSel = document.getElementById('plotting-stage-selector');
      const isCal = (stageSel && stageSel.value === 'calistung');

      let rawEng = '';
      let rawMath = '';

      if (isCal) {
        rawEng = 'Calistung';
        rawMath = 'Calistung';
      } else {
        const kelasEng  = engSel  ? engSel.value.trim()  : '';
        const kelasMath = mathSel ? mathSel.value.trim() : '';
        if (!kelasEng || !kelasMath) {
          alert('Level English dan Matematika harus dipilih untuk Tahap Reguler!');
          return;
        }
        rawEng = getRawClassName(kelasEng) || kelasEng;
        rawMath = getRawClassName(kelasMath) || kelasMath;
      }

      try {
        btnSimpanPenempatan.disabled = true;
        btnSimpanPenempatan.textContent = 'Menyimpan…';

        const res = await fetch('http://localhost:5000/api/students/levels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ student_id: studentId, kelas_english: rawEng, kelas_math: rawMath })
        });

        if (res.ok) {
          const idx = (window.allStudents || []).findIndex(s => s.id === studentId);
          if (idx !== -1) {
            window.allStudents[idx].kelas_english = rawEng;
            window.allStudents[idx].kelas_math    = rawMath;
          }
          await loadAllStudents();
          const engBadge = document.getElementById('rapor-student-level-eng');
          const mathBadge = document.getElementById('rapor-student-level-math');
          if (engBadge) engBadge.innerHTML = `<i class="fas fa-language"></i> English: ${formatClassName(rawEng)}`;
          if (mathBadge) mathBadge.innerHTML = `<i class="fas fa-calculator"></i> Math: ${formatClassName(rawMath)}`;
          alert('Level siswa berhasil diupdate!');
        } else {
          const err = await res.json();
          alert('Gagal menyimpan: ' + (err.error || 'Unknown error'));
        }
      } catch (e) {
        alert('Error: ' + e.message);
      } finally {
        btnSimpanPenempatan.disabled = false;
        btnSimpanPenempatan.innerHTML = '<i class="fas fa-save"></i> Simpan Penempatan';
      }
    });
  }

  const btnGraduateStudent = document.getElementById('btn-graduate-student');
  if (btnGraduateStudent && !btnGraduateStudent._graduateListenerAttached) {
    btnGraduateStudent._graduateListenerAttached = true;
    btnGraduateStudent.addEventListener('click', async () => {
      const raporSel     = document.getElementById('rapor-student-selector');
      const plottingSel2 = document.getElementById('plotting-student-selector');

      const student = (window.allStudents || []).find(s => s.id === parseInt(window.selectedStudentKey, 10))
        || findStudentByInputValue(raporSel ? raporSel.value : '')
        || findStudentByInputValue(plottingSel2 ? plottingSel2.value : '');

      const studentId   = student ? student.id : null;
      if (!studentId) {
        alert('Pilih siswa yang akan dinyatakan lulus terlebih dahulu!');
        return;
      }

      // Strict Prerequisite Check: Student MUST have completed English C AND Math C
      const currEng = String(student.kelas_english || '').toLowerCase();
      const currMath = String(student.kelas_math || '').toLowerCase();
      const hasEngC = currEng.includes('english c') || currEng === 'c' || currEng === 'lulus';
      const hasMathC = currMath.includes('math c') || currMath.includes('matematika c') || currMath === 'c' || currMath === 'lulus';

      if (!hasEngC || !hasMathC) {
        const msg = "Siswa hanya dapat dinyatakan Lulus (Alumni) setelah mencapai dan menyelesaikan kelas English C (Advanced) dan Math C (Advanced).";
        if (typeof window.socAlert === 'function') {
          await window.socAlert(msg, 'Prasyarat Kelulusan Belum Terpenuhi');
        } else if (typeof window.showSoCModal === 'function') {
          await window.showSoCModal({ title: 'Prasyarat Kelulusan Belum Terpenuhi', message: msg, type: 'warning' });
        } else {
          alert(msg);
        }
        return;
      }

      const sName = student.full_name || student.name || 'Siswa';
      const confirmed = typeof window.socConfirm === 'function'
        ? await window.socConfirm(`Apakah Anda yakin ingin menyatakan siswa "${sName}" LULUS sebagai Alumni School of Character?\n\nStatus siswa akan diubah menjadi Alumni dengan masa akses login 6 bulan (180 hari), dan kelas English & Math diatur menjadi "Lulus".`, 'Konfirmasi Kelulusan Siswa')
        : confirm(`Apakah Anda yakin ingin menyatakan siswa "${sName}" LULUS sebagai Alumni?`);

      if (!confirmed) return;

      try {
        btnGraduateStudent.disabled = true;
        btnGraduateStudent.textContent = 'Memproses…';

        const res = await fetch(`http://localhost:5000/api/students/${studentId}/graduate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (res.ok) {
          alert(`Siswa ${sName} berhasil dinyatakan Lulus sebagai Alumni!`);
          await loadAllStudents();
          populateStudentSelectors();
          if (typeof window.renderDataSiswaTable === 'function') window.renderDataSiswaTable();
          if (typeof window.renderDataAlumniTable === 'function') window.renderDataAlumniTable();
        } else {
          const err = await res.json().catch(() => ({}));
          alert(err.error || 'Gagal memproses kelulusan siswa.');
        }
      } catch (err) {
        alert('Terjadi kesalahan: ' + err.message);
      } finally {
        btnGraduateStudent.disabled = false;
        btnGraduateStudent.innerHTML = '<i class="fas fa-graduation-cap"></i> Nyatakan Lulus';
      }
    });
  }

  const btnAddClass = document.getElementById('btn-add-class-level');
  if (btnAddClass && !btnAddClass._listenerAttached) {
    btnAddClass._listenerAttached = true;
    btnAddClass.onclick = (e) => {
      e.preventDefault();
      openAddClassModal();
    };
  }

  const btnToggleDelClass = document.getElementById('btn-toggle-delete-class');
  if (btnToggleDelClass && !btnToggleDelClass._listenerAttached) {
    btnToggleDelClass._listenerAttached = true;
    btnToggleDelClass.onclick = (e) => {
      e.preventDefault();
      toggleDeleteClassMode();
    };
  }

  const btnSimpanPenugasan = document.getElementById('btn-simpan-penugasan');
  if (btnSimpanPenugasan && !btnSimpanPenugasan._kelasListenerAttached) {
    btnSimpanPenugasan._kelasListenerAttached = true;
    btnSimpanPenugasan.addEventListener('click', async () => {
      const rows = Array.from(document.querySelectorAll('.teacher-assign-select'));
      const englishTeachers = {};
      const mathTeachers = {};
      const assignmentsPayload = [];

      for (const sel of rows) {
        const rawClass = getRawClassName(sel.getAttribute('data-kelas') || '').trim();
        const formattedClass = formatClassName(rawClass);
        const teacherName = (sel.value || '').trim();

        if (teacherName) {
          // Allow teacher to teach multiple classes (e.g. Miss Dela teaching English A & B)
        }

        if (rawClass) {
          assignmentsPayload.push({ class_name: rawClass, teacher_name: teacherName });
          assignmentsPayload.push({ class_name: formattedClass, teacher_name: teacherName });
        }
      }

      if (assignmentsPayload.length === 0) {
        alert('Tidak ada data penugasan untuk disimpan.');
        return;
      }

      try {
        btnSimpanPenugasan.disabled = true;
        btnSimpanPenugasan.textContent = 'Menyimpan…';

        const res = await fetch('http://localhost:5000/api/classes/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignments: assignmentsPayload })
        });

        if (res.ok) {
          alert('Penugasan pengajar berhasil disimpan!');
        } else {
          const err = await res.json();
          alert('Gagal menyimpan: ' + (err.error || 'Unknown error'));
        }
      } catch (e) {
        alert('Error: ' + e.message);
      } finally {
        btnSimpanPenugasan.disabled = false;
        btnSimpanPenugasan.innerHTML = '<i class="fas fa-save"></i> Simpan Penugasan';
      }
    });
  }

  const schedSubj = document.getElementById('new-sched-subject');
  if (schedSubj && !schedSubj._dynamicOptionAttached) {
    schedSubj._dynamicOptionAttached = true;
    schedSubj.addEventListener('change', () => updateScheduleClassOptions());
  }

  const btnCreateSched = document.getElementById('btn-create-sched');
  if (btnCreateSched) {
    btnCreateSched.onclick = async (e) => {
      if (e) e.preventDefault();
      if (btnCreateSched.dataset.submitting === 'true' || window.isSavingSchedule) return;

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

      const editId = editIdInput ? editIdInput.value.trim() : '';
      const dateVal = dateInput ? dateInput.value.trim() : '';
      const subjVal = subjectInput ? subjectInput.value.trim() : 'Karakter';
      const kelasVal = kelasInput ? kelasInput.value.trim() : 'Semua';
      const topicVal = topicInput ? topicInput.value.trim() : '';
      const linkVal = linkInput ? linkInput.value.trim() : '';
      const studentLinkVal = studentLinkInput ? studentLinkInput.value.trim() : '';
      const startTimeVal = startTimeInput ? startTimeInput.value.trim() : '16:00';
      const endTimeVal = endTimeInput ? endTimeInput.value.trim() : '18:00';
      const lokasiVal = lokasiInput ? lokasiInput.value.trim() : 'Kelas Pojok Hope';
      const catatanVal = catatanInput ? catatanInput.value.trim() : '';

      if (!dateVal) {
        if (typeof window.showSoCModal === 'function') {
          await window.showSoCModal({ title: 'Data Belum Lengkap', message: 'Silakan pilih tanggal pembelajaran terlebih dahulu.', type: 'warning' });
        } else {
          alert('Silakan pilih tanggal pembelajaran terlebih dahulu.');
        }
        return;
      }

      window.isSavingSchedule = true;
      btnCreateSched.dataset.submitting = 'true';
      btnCreateSched.disabled = true;
      btnCreateSched.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

      try {
        const normK = (typeof window.normalizeScheduleClass === 'function') 
          ? window.normalizeScheduleClass(kelasVal, subjVal) 
          : kelasVal;

        const payload = {
          date: dateVal,
          mata_pelajaran: subjVal,
          kelas: normK,
          topik: topicVal,
          materi_link: linkVal,
          link_materi_siswa: studentLinkVal,
          start_time: startTimeVal,
          end_time: endTimeVal,
          lokasi: lokasiVal,
          catatan: catatanVal
        };

        const url = editId ? `http://localhost:5000/api/schedules/${editId}` : 'http://localhost:5000/api/schedules';
        const method = editId ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const resData = await res.json().catch(() => ({}));

        if (res.status === 409) {
          const warnMsg = resData.error || 'Jadwal untuk sesi ini sudah ada di database!';
          if (typeof window.showSoCModal === 'function') {
            await window.showSoCModal({ title: 'Jadwal Duplikat', message: warnMsg, type: 'warning' });
          } else {
            alert(warnMsg);
          }
          return;
        }

        if (!res.ok) {
          throw new Error(resData.error || `HTTP error ${res.status}`);
        }

        const successMsg = editId ? 'Jadwal berhasil diperbarui!' : 'Jadwal baru berhasil dibuat!';
        if (typeof window.showSoCModal === 'function') {
          await window.showSoCModal({ title: 'Berhasil', message: successMsg, type: 'success' });
        } else {
          alert(successMsg);
        }

        resetScheduleForm();

        // Update active month view to schedule's month
        const p = dateVal.split('-');
        if (p.length >= 2) {
          window.currentViewYear = parseInt(p[0], 10);
          window.currentViewMonth = parseInt(p[1], 10);
          if (typeof window.updateMonthNavUI === 'function') window.updateMonthNavUI();
        }

        await loadAllSchedulesData();
        if (typeof window.loadManagerSchedules === 'function') await window.loadManagerSchedules();
        if (typeof window.renderManagerSchedules === 'function') window.renderManagerSchedules();
        if (typeof window.renderJadwalKelas === 'function') window.renderJadwalKelas();
        if (typeof window.renderManagerSummary === 'function') window.renderManagerSummary();
        if (typeof window.renderGuruSummary === 'function') window.renderGuruSummary();
        if (typeof window.renderStudentSummary === 'function') window.renderStudentSummary();
        if (typeof window.renderSiswaSummary === 'function') window.renderSiswaSummary();
      } catch (err) {
        console.error('Error saving schedule:', err);
        if (typeof window.showSoCModal === 'function') {
          await window.showSoCModal({ title: 'Gagal Menyimpan', message: err.message, type: 'danger' });
        } else {
          alert('Gagal menyimpan jadwal: ' + err.message);
        }
      } finally {
        window.isSavingSchedule = false;
        btnCreateSched.dataset.submitting = 'false';
        btnCreateSched.disabled = false;
        const currentEditId = document.getElementById('edit-schedule-id')?.value?.trim();
        btnCreateSched.innerHTML = currentEditId ? '<i class="fas fa-save"></i> Update Jadwal' : '<i class="fas fa-plus-circle"></i> Buat Jadwal Baru';
      }
    };
  }

  const btnCancelEdit = document.getElementById('btn-cancel-edit');
  if (btnCancelEdit) {
    btnCancelEdit.onclick = (e) => {
      if (e) e.preventDefault();
      resetScheduleForm();
    };
  }
}
window.attachKelasListeners = attachKelasListeners;

export function updateScheduleClassOptions(preselectedValue = null) {
  const subjectEl = document.getElementById('new-sched-subject');
  const kelasEl = document.getElementById('new-sched-kelas');
  if (!subjectEl || !kelasEl) return;

  const subject = (subjectEl.value || '').trim();
  let options = [];

  const customClasses = (window.allClassAssignments && Array.isArray(window.allClassAssignments))
    ? window.allClassAssignments
    : [];

  if (subject === 'Calistung') {
    options = [
      { value: 'Calistung', label: 'Calistung (Baca Tulis Hitung)' }
    ];
    customClasses.filter(c => c && c.category === 'Calistung' && c.class_name !== 'Calistung').forEach(c => {
      options.push({ value: c.class_name, label: c.display_label || c.class_name });
    });
  } else if (subject === 'English') {
    options = [
      { value: 'English A', label: 'English A (Beginner)' },
      { value: 'English B', label: 'English B (Intermediate)' },
      { value: 'English C', label: 'English C (Advanced)' },
      { value: 'Semua', label: 'Semua Kelas (English)' }
    ];
    customClasses.filter(c => c && c.category === 'English' && !['English A', 'English B', 'English C', 'English D'].includes(c.class_name)).forEach(c => {
      options.splice(options.length - 1, 0, { value: c.class_name, label: c.display_label || c.class_name });
    });
  } else if (subject === 'Matematika' || subject === 'Math') {
    options = [
      { value: 'Math A', label: 'Math A (Beginner)' },
      { value: 'Math B', label: 'Math B (Intermediate)' },
      { value: 'Math C', label: 'Math C (Advanced)' },
      { value: 'Semua', label: 'Semua Kelas (Matematika)' }
    ];
    customClasses.filter(c => c && c.category === 'Matematika' && !['Math A', 'Math B', 'Math C', 'Math D'].includes(c.class_name)).forEach(c => {
      options.splice(options.length - 1, 0, { value: c.class_name, label: c.display_label || c.class_name });
    });
  } else {
    // Karakter / Outdoor Learning / Umum
    options = [
      { value: 'Semua', label: 'Semua Kelas' }
    ];
    customClasses.filter(c => c && c.category === subject).forEach(c => {
      options.push({ value: c.class_name, label: c.display_label || c.class_name });
    });
  }

  const currentVal = preselectedValue !== null ? preselectedValue : kelasEl.value;
  kelasEl.innerHTML = options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('');

  const match = options.find(o => o.value === currentVal || o.value.toLowerCase() === (currentVal || '').toLowerCase());
  if (match) {
    kelasEl.value = match.value;
  } else {
    kelasEl.value = options[0].value;
  }
}
window.updateScheduleClassOptions = updateScheduleClassOptions;

export function resetScheduleForm() {
  window.isSavingSchedule = false;
  const editIdInput = document.getElementById('edit-schedule-id');
  const dateInput = document.getElementById('new-sched-date');
  const subjectInput = document.getElementById('new-sched-subject');
  const topicInput = document.getElementById('new-sched-topic');
  const linkInput = document.getElementById('new-sched-link');
  const studentLinkInput = document.getElementById('new-sched-student-link');
  const startTimeInput = document.getElementById('new-sched-start-time');
  const endTimeInput = document.getElementById('new-sched-end-time');
  const lokasiInput = document.getElementById('new-sched-lokasi');
  const catatanInput = document.getElementById('new-sched-catatan');
  const btnCreateSched = document.getElementById('btn-create-sched');
  const btnCancelEdit = document.getElementById('btn-cancel-edit');

  if (editIdInput) editIdInput.value = '';
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
  if (subjectInput) subjectInput.value = 'Karakter';
  updateScheduleClassOptions('Semua');
  if (topicInput) topicInput.value = '';
  if (linkInput) linkInput.value = 'https://drive.google.com/drive/folders/1U_VJDr6YXV-3bVslE6TSRA6hd7D16SFh?usp=drive_link';
  if (studentLinkInput) studentLinkInput.value = '';
  if (startTimeInput) startTimeInput.value = '16:00';
  if (endTimeInput) endTimeInput.value = '18:00';
  if (lokasiInput) lokasiInput.value = '';
  if (catatanInput) catatanInput.value = '';

  if (btnCreateSched) {
    btnCreateSched.dataset.submitting = 'false';
    btnCreateSched.disabled = false;
    btnCreateSched.innerHTML = '<i class="fas fa-plus-circle"></i> Buat Jadwal Baru';
  }
  if (btnCancelEdit) {
    btnCancelEdit.style.display = 'none';
  }
}
window.resetScheduleForm = resetScheduleForm;

export function editSchedule(id) {
  const schedules = window.allSchedulesData || [];
  const item = schedules.find(s => s.id == id);
  if (!item) {
    alert('Data jadwal tidak ditemukan.');
    return;
  }

  const editIdInput = document.getElementById('edit-schedule-id');
  const dateInput = document.getElementById('new-sched-date');
  const subjectInput = document.getElementById('new-sched-subject');
  const topicInput = document.getElementById('new-sched-topic');
  const linkInput = document.getElementById('new-sched-link');
  const studentLinkInput = document.getElementById('new-sched-student-link');
  const startTimeInput = document.getElementById('new-sched-start-time');
  const endTimeInput = document.getElementById('new-sched-end-time');
  const lokasiInput = document.getElementById('new-sched-lokasi');
  const catatanInput = document.getElementById('new-sched-catatan');
  const btnCreateSched = document.getElementById('btn-create-sched');
  const btnCancelEdit = document.getElementById('btn-cancel-edit');

  if (editIdInput) editIdInput.value = item.id;
  if (dateInput && item.date) dateInput.value = item.date.split('T')[0];
  if (subjectInput && item.mata_pelajaran) subjectInput.value = item.mata_pelajaran;
  updateScheduleClassOptions(item.kelas || 'Semua');
  if (topicInput) topicInput.value = item.topik || '';
  if (linkInput) linkInput.value = item.materi_link || '';
  if (studentLinkInput) studentLinkInput.value = item.link_materi_siswa || '';
  if (startTimeInput) startTimeInput.value = item.start_time || '14:00';
  if (endTimeInput) endTimeInput.value = item.end_time || '15:30';
  if (lokasiInput) lokasiInput.value = item.lokasi || '';
  if (catatanInput) catatanInput.value = item.catatan || '';

  window.isSavingSchedule = false;
  if (btnCreateSched) {
    btnCreateSched.dataset.submitting = 'false';
    btnCreateSched.disabled = false;
    btnCreateSched.innerHTML = '<i class="fas fa-save"></i> Update Jadwal';
  }
  if (btnCancelEdit) {
    btnCancelEdit.style.display = 'inline-block';
  }

  const formSection = document.getElementById('view-manajemen-jadwal');
  if (formSection) {
    formSection.scrollIntoView({ behavior: 'smooth' });
  }
}
window.editSchedule = editSchedule;

export async function deleteSchedule(id) {
  const ok = await window.socConfirm("Yakin ingin menghapus jadwal ini?", "Hapus Jadwal");
  if (!ok) return;
  try {
    const res = await fetch(`http://localhost:5000/api/schedules/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}`);
    }
    if (typeof window.showSoCModal === 'function') {
      await window.showSoCModal({ title: 'Berhasil', message: 'Jadwal berhasil dihapus!', type: 'success' });
    } else {
      alert('Jadwal berhasil dihapus!');
    }
    const editIdInput = document.getElementById('edit-schedule-id');
    if (editIdInput && editIdInput.value == id) {
      resetScheduleForm();
    }
    await loadAllSchedulesData();
    if (typeof window.loadManagerSchedules === 'function') await window.loadManagerSchedules();
    if (typeof window.renderManagerSchedules === 'function') window.renderManagerSchedules();
    if (typeof renderJadwalKelas === 'function') renderJadwalKelas();
    if (typeof renderManagerSummary === 'function') renderManagerSummary();
    if (typeof window.renderGuruSummary === 'function') window.renderGuruSummary();
    if (typeof window.renderStudentSummary === 'function') window.renderStudentSummary();
    if (typeof window.renderSiswaSummary === 'function') window.renderSiswaSummary();
  } catch (err) {
    console.error('Error deleting schedule:', err);
    if (typeof window.showSoCModal === 'function') {
      await window.showSoCModal({ title: 'Gagal Menghapus', message: err.message, type: 'danger' });
    } else {
      alert('Gagal menghapus jadwal: ' + err.message);
    }
  }
}
window.deleteSchedule = deleteSchedule;

export function toggleDeleteAlumniMode() {
  window.isDeleteAlumniMode = !window.isDeleteAlumniMode;
  const btnHapusAlumni = document.getElementById('btn-admin-hapus-alumni');
  if (btnHapusAlumni) {
    if (window.isDeleteAlumniMode) {
      btnHapusAlumni.innerHTML = '<i class="fas fa-times"></i> Batal Hapus';
      btnHapusAlumni.style.background = '#e2e8f0';
      btnHapusAlumni.style.color = '#334155';
      btnHapusAlumni.style.border = '1px solid #94a3b8';
    } else {
      btnHapusAlumni.innerHTML = '<i class="fas fa-trash-alt"></i> Hapus Alumni';
      btnHapusAlumni.style.background = '#fee2e2';
      btnHapusAlumni.style.color = '#b91c1c';
      btnHapusAlumni.style.border = '1px solid #f87171';
    }
  }
  renderDataAlumniTable();
}
window.toggleDeleteAlumniMode = toggleDeleteAlumniMode;

export async function renderDataAlumniTable() {
  const tbody = document.getElementById('data-alumni-tbody');
  if (!tbody) return;

  if (!window.allStudents || window.allStudents.length === 0) {
    await loadAllStudents();
  }

  const allSt = window.allStudents || [];
  const searchInput = document.getElementById('search-data-alumni');
  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

  const alumni = allSt.filter(s => s.status_siswa === 'alumni');
  const filtered = alumni.filter(s => {
    if (!query) return true;
    const idStr = String(s.id || '');
    const nisStr = String(s.nis || '').toLowerCase();
    const nameStr = String(s.full_name || s.name || '').toLowerCase();
    return idStr.includes(query) || nisStr.includes(query) || nameStr.includes(query);
  });

  const countBadge = document.getElementById('badge-total-alumni') || document.getElementById('alumni-count-badge');
  if (countBadge) {
    countBadge.textContent = `${alumni.length} Alumni`;
  }

  // Show Hapus Alumni toggle only for admin
  const btnHapusAlumni = document.getElementById('btn-admin-hapus-alumni');
  if (btnHapusAlumni) {
    btnHapusAlumni.style.display = (window.currentRole === 'admin') ? 'inline-flex' : 'none';
  }

  // Wire search input once
  if (searchInput && !searchInput._listenerAttached) {
    searchInput._listenerAttached = true;
    searchInput.addEventListener('input', () => renderDataAlumniTable());
  }

  // Wire export excel button once
  const btnExportAlumni = document.getElementById('btn-export-excel-alumni');
  if (btnExportAlumni && !btnExportAlumni._listenerAttached) {
    btnExportAlumni._listenerAttached = true;
    btnExportAlumni.addEventListener('click', () => exportDataAlumni());
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2.5rem; color:var(--text-muted); font-size:0.95rem;"><i class="fas fa-user-graduate" style="font-size:2.2rem; display:block; margin-bottom:0.5rem; opacity:0.35;"></i>Belum ada data alumni terdaftar.</td></tr>`;
    return;
  }

  const isStaff = ['admin', 'manager'].includes((window.currentRole || '').toLowerCase());

  tbody.innerHTML = filtered.map((s, index) => {
    const sNo = index + 1;
    const sNis = s.nis || '-';
    const sName = s.full_name || s.name || '-';
    const rawG = String(s.gender || s.jenis_kelamin || '').trim().toUpperCase();
    const sGender = rawG.startsWith('P') ? 'P' : (rawG.startsWith('L') ? 'L' : '-');
    const isMale = sGender === 'L';
    const gradDate = s.graduated_at ? new Date(s.graduated_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-';

    let daysLeft = s.days_left;
    if (daysLeft === undefined || daysLeft === null) {
      if (s.alumni_access_until) {
        daysLeft = Math.ceil((new Date(s.alumni_access_until) - new Date()) / (1000 * 60 * 60 * 24));
      } else {
        daysLeft = 180;
      }
    }

    let countdownBadge = '';
    if (daysLeft > 0) {
      countdownBadge = `<span class="badge badge-teal" style="font-weight:700;"><i class="fas fa-clock"></i> ${daysLeft} Hari Lagi</span>`;
    } else {
      countdownBadge = `<span class="badge" style="background:#fee2e2; color:#b91c1c; font-weight:700;"><i class="fas fa-times-circle"></i> Kedaluwarsa</span>`;
    }

    let actionButtons = '';
    if (window.isDeleteAlumniMode && window.currentRole === 'admin') {
      const sNameSafe = String(sName).split("'").join("\\'");
      actionButtons = `
        <button onclick="confirmDeleteStudent(${s.id}, '${sNameSafe}')" class="btn btn-sm btn-danger" style="background:#fee2e2; color:#b91c1c; border:1px solid #f87171; display:inline-flex; align-items:center; gap:0.4rem; padding: 0.35rem 0.85rem; font-weight:600;" title="Hapus Data Alumni">
          <i class="fas fa-trash-alt"></i> Hapus
        </button>
      `;
    } else {
      actionButtons = `
        <button onclick="window.viewAlumniRapor(${s.id})" class="btn btn-sm btn-outline"><i class="fas fa-file-invoice"></i> Rapor</button>
        <button onclick="window.viewAlumniProfile(${s.id})" class="btn btn-sm btn-primary"><i class="fas fa-id-card"></i> Data Siswa</button>
        ${isStaff ? `
          <button onclick="window.restoreAlumniStudent(${s.id})" class="btn btn-sm btn-success" style="background:#10b981; border:1px solid #059669; color:#fff;" title="Aktifkan Kembali jadi Siswa">
            <i class="fas fa-undo"></i> Aktifkan Kembali jadi Siswa
          </button>
        ` : ''}
      `;
    }

    return `
      <tr style="border-bottom: 1px solid var(--border-color); font-size: 0.9rem;">
        <td style="padding: 0.75rem 1rem; text-align: center !important; vertical-align: middle; font-weight: 600;">${sNo}</td>
        <td style="padding: 0.75rem 1rem; text-align: center !important; vertical-align: middle; font-family: monospace; font-size: 0.85rem; font-weight: 600; color: var(--color-primary-dark);">${sNis}</td>
        <td style="padding: 0.75rem 1rem; vertical-align: middle; font-weight: 600; color: var(--color-secondary-dark);">
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <img src="${s.photo_url || 'static/src/assets/profiles/' + s.id + '.jpg'}" onerror="this.src='static/src/assets/ui/logo.png'" alt="Foto" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 2px solid var(--color-secondary); flex-shrink: 0; background: #fff;">
            <span>${sName}</span>
          </div>
        </td>
        <td style="padding: 0.75rem 1rem; text-align: center !important; vertical-align: middle;"><span class="badge ${isMale ? 'badge-teal' : (sGender === 'P' ? 'badge-orange' : 'badge-outline')}">${sGender}</span></td>
        <td style="padding: 0.75rem 1rem; text-align: center !important; vertical-align: middle; font-size: 0.88rem; color: var(--text-muted);">${gradDate}</td>
        <td style="padding: 0.75rem 1rem; text-align: center !important; vertical-align: middle;">${countdownBadge}</td>
        <td style="padding: 0.75rem 1rem; text-align: center !important; vertical-align: middle;">
          <div style="display: flex; flex-direction: column; gap: 0.35rem; align-items: center; justify-content: center;">
            ${actionButtons}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}
window.renderDataAlumniTable = renderDataAlumniTable;

export function exportDataAlumni() {
  const currentAlumni = (window.allStudents || []).filter(s => s.status_siswa === 'alumni');
  if (currentAlumni.length === 0) {
    if (window.showSoCModal) {
      window.showSoCModal({ title: 'Export Data Alumni', message: 'Tidak ada data alumni untuk diekspor.', type: 'info' });
    } else {
      alert('Tidak ada data alumni untuk diekspor.');
    }
    return;
  }
  const headers = [
    'No',
    'NIS',
    'Nama Lengkap',
    'Nama Panggilan',
    'Jenis Kelamin',
    'Tempat Lahir',
    'Tanggal Lahir',
    'Nama Orang Tua',
    'No HP Siswa',
    'No HP Orang Tua',
    'Tahun Lulus',
    'Tanggal Kelulusan'
  ];
  const rows = currentAlumni.map((s, idx) => {
    let gradYear = '-';
    let gradDate = '-';
    if (s.graduated_at) {
      try {
        const gd = new Date(s.graduated_at);
        if (!isNaN(gd.getTime())) {
          gradYear = gd.getFullYear();
          gradDate = gd.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
        }
      } catch (e) {}
    }
    const bDate = s.birth_date ? String(s.birth_date).split('T')[0] : (s.tanggal_lahir || '-');
    const rawG = String(s.gender || '').trim().toUpperCase();
    const genderStr = rawG.startsWith('P') ? 'Perempuan' : 'Laki-laki';

    return [
      idx + 1,
      s.nis || '-',
      s.full_name || s.nama || '-',
      s.nickname || s.panggilan || '-',
      genderStr,
      s.birth_place || s.tempat_lahir || 'Gorontalo',
      bDate,
      s.parent_name || s.parents_name || s.nama_ortu || '-',
      s.student_phone || s.phone_siswa || s.no_hp_siswa || '-',
      s.parent_phone || s.phone_ortu || s.no_hp_ortu || '-',
      gradYear,
      gradDate
    ];
  });

  if (typeof window.exportStyledSoCExcel === 'function') {
    window.exportStyledSoCExcel({
      filename: 'Data_Alumni_SoC_Pojok_Hope.xlsx',
      sheetName: 'Data Alumni',
      headers: headers,
      rows: rows,
      headerHex: '0C4A60',
      zebraHex: 'F8FAFC',
      colWidths: [6, 15, 26, 16, 14, 18, 16, 24, 18, 18, 14, 20]
    });
  }
}
window.exportDataAlumni = exportDataAlumni;

export async function restoreAlumniStudent(studentId) {
  let student = (window.allStudents || []).find(s => s.id === parseInt(studentId, 10));
  const sName = student ? (student.full_name || student.name || 'Siswa') : 'Siswa';
  const conf = typeof window.socConfirm === 'function'
    ? await window.socConfirm(`Apakah Anda yakin ingin mengaktifkan kembali alumni "${sName}" sebagai Siswa Aktif? Siswa akan dikembalikan ke status aktif di English C dan Math C.`, 'Konfirmasi Pengaktifan Siswa')
    : confirm(`Apakah Anda yakin ingin mengaktifkan kembali alumni "${sName}" sebagai Siswa Aktif?`);
  if (!conf) return;

  try {
    const res = await fetch(`http://localhost:5000/api/students/${studentId}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const resData = await res.json().catch(() => ({}));
    if (res.ok) {
      if (window.showSoCModal) {
        await window.showSoCModal({
          title: 'Siswa Berhasil Diaktifkan',
          message: resData.message || `Siswa ${sName} telah berhasil diaktifkan kembali.`,
          type: 'success'
        });
      } else {
        alert(resData.message || `Siswa ${sName} telah berhasil diaktifkan kembali.`);
      }
      await loadAllStudents();
      if (typeof window.renderDataAlumniTable === 'function') await window.renderDataAlumniTable();
      if (typeof window.renderDataSiswaTable === 'function') window.renderDataSiswaTable();
    } else {
      const errMsg = resData.error || 'Gagal mengaktifkan kembali siswa.';
      if (window.showSoCModal) {
        await window.showSoCModal({ title: 'Gagal', message: errMsg, type: 'danger' });
      } else {
        alert(errMsg);
      }
    }
  } catch (err) {
    console.error('Error restoring student:', err);
    alert('Terjadi kesalahan: ' + err.message);
  }
}
window.restoreAlumniStudent = restoreAlumniStudent;

export function viewAlumniProfile(studentId) {
  window.isAlumniDetailView = true;
  viewDetailSiswa(studentId);
}
window.viewAlumniProfile = viewAlumniProfile;

export function viewAlumniRapor(studentId) {
  window.isViewingAlumniRapor = true;
  window.selectedStudentKey = studentId;
  const sel1 = document.getElementById('student-selector');
  const sel2 = document.getElementById('rapor-student-selector');
  const student = (window.allStudents || []).find(s => s.id === studentId);
  if (student) {
    if (sel1) sel1.value = student.id;
    if (sel2) sel2.value = formatStudentDisplayName(student);
  }
  switchView('rapor');
}
window.viewAlumniRapor = viewAlumniRapor;

export function downloadRaporSiswaPDF() {
  const studentId = window.selectedStudentKey || (window.currentUser && (window.currentUser.student_id || window.currentUser.id));
  const student = (window.allStudents || []).find(s => s.id === parseInt(studentId, 10)) || window.currentUser || {};

  const sName = student.full_name || student.name || 'Siswa SoC';
  const sNis = student.nis || '-';
  const sGender = (student.gender && student.gender.startsWith('P')) ? 'Perempuan' : 'Laki-laki';

  const semSel = document.getElementById('rapor-semester-selector');
  const activeSemLabel = semSel ? semSel.options[semSel.selectedIndex]?.text : 'Semester Genap (Jul – Des 2026)';

  const engLevel = document.getElementById('rapor-student-level-eng')?.textContent.replace(/.*English:\s*/i, '').trim() || student.kelas_english || '-';
  const mathLevel = document.getElementById('rapor-student-level-math')?.textContent.replace(/.*Math:\s*/i, '').trim() || student.kelas_math || '-';

  // Read traits scores
  const getTraitVal = (id) => {
    const el = document.getElementById(id);
    return el ? el.textContent.replace('/ 100', '').trim() : '0';
  };

  const traitEmp = getTraitVal('score-empathy');
  const traitHon = getTraitVal('score-honesty');
  const traitResp = getTraitVal('score-responsibility');
  const traitRespct = getTraitVal('score-respect');
  const engFlu = getTraitVal('score-eng-fluency');
  const engRead = getTraitVal('score-eng-reading');
  const mathLog = getTraitVal('score-math-logic');
  const mathArith = getTraitVal('score-math-arith');

  // Clone evaluations table
  const evalTbody = document.getElementById('rapor-evaluations-tbody');
  const tableRowsHtml = evalTbody ? evalTbody.innerHTML : '<tr><td colspan="9" style="text-align:center;">Belum ada evaluasi nilai</td></tr>';

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const printWin = window.open('', '_blank', 'width=1000,height=850');
  if (!printWin) {
    alert('Pop-up terblokir oleh browser. Silakan izinkan pop-up untuk mendownload/mencetak Rapor PDF.');
    return;
  }

  printWin.document.write(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Rapor Siswa - ${sName} (${sNis})</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      <style>
        @page { size: A4 portrait; margin: 1.2cm; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; background: #fff; margin: 0; padding: 20px; font-size: 11pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2.5px solid #0c4a60; padding-bottom: 12px; margin-bottom: 18px; }
        .logo-wrap { display: flex; align-items: center; gap: 14px; }
        .logo-wrap img { width: 56px; height: 56px; object-fit: contain; }
        .school-info h1 { margin: 0; font-size: 16pt; font-weight: 800; color: #0c4a60; letter-spacing: 0.5px; }
        .school-info p { margin: 2px 0 0; font-size: 9pt; color: #64748b; }
        .report-title { text-align: center; margin-bottom: 18px; }
        .report-title h2 { margin: 0; font-size: 13pt; font-weight: 800; color: #ff6b35; text-transform: uppercase; letter-spacing: 0.5px; }
        .report-title span { font-size: 9.5pt; color: #475569; font-weight: 600; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 18px; font-size: 10pt; }
        .info-item { display: flex; }
        .info-label { width: 130px; font-weight: 600; color: #475569; }
        .info-val { font-weight: 700; color: #0c4a60; }
        .section-heading { font-size: 11pt; font-weight: 700; color: #0c4a60; margin: 16px 0 8px; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 4px; display: flex; align-items: center; gap: 6px; }
        .scores-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 18px; }
        .score-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; text-align: center; }
        .score-box .label { font-size: 8.5pt; font-weight: 600; color: #64748b; margin-bottom: 4px; }
        .score-box .val { font-size: 13pt; font-weight: 800; color: #0c4a60; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 22px; font-size: 9.5pt; }
        th, td { border: 1px solid #cbd5e1; padding: 7px 10px; }
        th { background: #0c4a60; color: #fff; font-weight: 700; text-align: center; }
        td { text-align: center; }
        .sig-container { display: flex; justify-content: space-between; margin-top: 35px; page-break-inside: avoid; }
        .sig-box { text-align: center; width: 200px; font-size: 9.5pt; }
        .sig-space { height: 60px; }
        .sig-name { font-weight: 700; border-top: 1px solid #94a3b8; padding-top: 4px; color: #0c4a60; }
        .sig-title { font-size: 8.5pt; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-wrap">
          <img src="static/src/assets/ui/logo.png" alt="Logo SoC" onerror="this.style.display='none'">
          <div class="school-info">
            <h1>SCHOOL OF CHARACTER</h1>
            <p>Pojok Hope Gorontalo • Karakter • Literasi • Masa Depan Cemerlang</p>
          </div>
        </div>
        <div style="text-align:right; font-size:8.5pt; color:#64748b;">
          Dokumen Resmi<br>Sistem Akademik Terpadu
        </div>
      </div>

      <div class="report-title">
        <h2>Laporan Hasil Belajar &amp; Evaluasi Karakter</h2>
        <span>${activeSemLabel}</span>
      </div>

      <div class="info-grid">
        <div class="info-item"><span class="info-label">Nama Siswa:</span><span class="info-val">${sName}</span></div>
        <div class="info-item"><span class="info-label">Level English:</span><span class="info-val">${engLevel}</span></div>
        <div class="info-item"><span class="info-label">NIS (No. Induk):</span><span class="info-val">${sNis}</span></div>
        <div class="info-item"><span class="info-label">Level Matematika:</span><span class="info-val">${mathLevel}</span></div>
        <div class="info-item"><span class="info-label">Jenis Kelamin:</span><span class="info-val">${sGender}</span></div>
        <div class="info-item"><span class="info-label">Status Siswa:</span><span class="info-val">${student.status_siswa === 'alumni' ? 'Lulus (Alumni)' : 'Siswa Aktif'}</span></div>
      </div>

      <div class="section-heading"><i class="fas fa-star text-orange"></i> Ringkasan Nilai Karakter &amp; Kemampuan</div>
      <div class="scores-grid">
        <div class="score-box"><div class="label">Empati</div><div class="val">${traitEmp}</div></div>
        <div class="score-box"><div class="label">Kejujuran</div><div class="val">${traitHon}</div></div>
        <div class="score-box"><div class="label">Tanggung Jawab</div><div class="val">${traitResp}</div></div>
        <div class="score-box"><div class="label">Respek</div><div class="val">${traitRespct}</div></div>
        <div class="score-box"><div class="label">English Fluency</div><div class="val">${engFlu}</div></div>
        <div class="score-box"><div class="label">English Reading</div><div class="val">${engRead}</div></div>
        <div class="score-box"><div class="label">Math Logic</div><div class="val">${mathLog}</div></div>
        <div class="score-box"><div class="label">Math Arithmetic</div><div class="val">${mathArith}</div></div>
      </div>

      <div class="section-heading"><i class="fas fa-table text-teal"></i> Tabel Raport Nilai Semester</div>
      <table>
        <thead>
          <tr>
            <th>Bulan</th>
            <th>Empati</th>
            <th>Kejujuran</th>
            <th>Tanggung Jawab</th>
            <th>Respek</th>
            <th>Eng Fluency</th>
            <th>Eng Reading</th>
            <th>Math Logic</th>
            <th>Math Arith</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>

      <div class="sig-container">
        <div class="sig-box">
          <p style="margin:0 0 4px 0; color:#64748b;">Mengetahui,</p>
          <p style="margin:0; font-weight:600;">Founder SoC</p>
          <div class="sig-space"></div>
          <p class="sig-name">Minarti Monoarfa</p>
          <p class="sig-title">Pendiri SoC Pojok Hope</p>
        </div>
        <div class="sig-box">
          <p style="margin:0 0 4px 0; color:#64748b;">Gorontalo, ${dateFormatted}</p>
          <p style="margin:0; font-weight:600;">Manager Operasional</p>
          <div class="sig-space"></div>
          <p class="sig-name">Sity Djabar, M.Pd.</p>
          <p class="sig-title">Kepala / Manager Sekolah</p>
        </div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 350);
        };
      <\/script>
    </body>
    </html>
  `);
  printWin.document.close();
}
window.downloadRaporSiswaPDF = downloadRaporSiswaPDF;
