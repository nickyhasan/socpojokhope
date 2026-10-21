// =====================================================
// MANAGER & ADMIN MODULE (js/dashboard/manager.js)
// =====================================================
import { formatStudentDisplayName, findStudentByInputValue, switchView, formatTeacherName, formatClassName, getRawClassName } from './ui.js';
import { loadAllStudents, loadAllSchedulesData, loadSchedules, loadManagerSchedules, loadRaporData } from './api.js';
import { renderJadwalKelas } from './teacher.js';

export async function renderManagerSummary() {
  const upcomingContainer = document.getElementById('manager-upcoming-schedules');
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

    // 1. Render ALL upcoming schedules
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

      upcoming.sort((a, b) => {
        const dComp = String(a.date || '').localeCompare(String(b.date || ''));
        if (dComp !== 0) return dComp;
        return String(a.start_time || '').localeCompare(String(b.start_time || ''));
      });

      const top3Upcoming = (upcoming.length > 0 ? upcoming : schedules).slice(0, 3);

      if (top3Upcoming.length === 0) {
        upcomingContainer.innerHTML = '<div class="alert alert-info" style="margin:1rem;">Belum ada data untuk ditampilkan.</div>';
      } else {
        let html = '';
        top3Upcoming.forEach(item => {
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

    const sortedStudents = [...students].sort((a, b) => {
      const starA = Number(a.stars || 0);
      const starB = Number(b.stars || 0);
      return starB - starA;
    });

    const top10 = sortedStudents.slice(0, 10);

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

      const starsVal = (st.stars !== undefined && st.stars !== null) ? st.stars : Math.max(10, 20 - idx);

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
        <td style="padding: 0.75rem 1rem;"><div class="skeleton skeleton-text" style="width: 100px;"></div></td>
        <td style="padding: 0.75rem 1rem;"><div class="skeleton skeleton-text" style="width: 100px;"></div></td>
        <td style="padding: 0.75rem 1rem; text-align: center;"><div class="skeleton skeleton-text" style="width: 140px; margin: 0 auto;"></div></td>
      </tr>
    `).join('');
    await loadAllStudents();
  }

  const students = window.allStudents || [];
  const searchInput = document.getElementById('search-data-siswa');
  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

  const filtered = students.filter(s => {
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
        <td style="padding: 0.75rem 1rem; text-align: center !important; vertical-align: middle; font-weight: 600; color: var(--color-secondary-dark);">${sName}</td>
        <td style="padding: 0.75rem 1rem; text-align: center !important; vertical-align: middle;"><span class="badge ${isMale ? 'badge-teal' : (sGender === 'P' ? 'badge-orange' : 'badge-outline')}">${sGender}</span></td>
        <td style="padding: 0.75rem 1rem; text-align: center !important; vertical-align: middle;">${engBadge}</td>
        <td style="padding: 0.75rem 1rem; text-align: center !important; vertical-align: middle;">${mathBadge}</td>
        <td style="padding: 0.75rem 1rem; text-align: center !important; vertical-align: middle;">
          <div style="display: inline-flex; gap: 0.4rem; justify-content: center; align-items: center; flex-wrap: wrap;">
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
  if (ortuInp) ortuInp.value = student.parent_name || student.nama_ortu || '';
  if (hpSiswaInp) hpSiswaInp.value = student.student_phone || student.hp_siswa || '';
  if (hpOrtuInp) hpOrtuInp.value = student.parent_phone || student.hp_ortu || '';
  if (engInp) engInp.value = getRawClassName(student.kelas_english) || student.kelas_english || '';
  if (mathInp) mathInp.value = getRawClassName(student.kelas_math) || student.kelas_math || '';

  const isAdmin = (window.currentRole === 'admin');
  [nisInp, pwdInp, nameInp, nickInp, birthPlaceInp, birthDateInp, ortuInp, hpSiswaInp, hpOrtuInp].forEach(inp => {
    if (inp) {
      inp.readOnly = !isAdmin;
      inp.style.backgroundColor = isAdmin ? '#fff' : '#f8f9fa';
    }
  });
  if (genderInp) genderInp.disabled = !isAdmin;
  if (engInp) engInp.disabled = !isAdmin;
  if (mathInp) mathInp.disabled = !isAdmin;
  const btnLabelSiswaFoto = document.getElementById('btn-label-edit-siswa-foto');
  if (btnLabelSiswaFoto) btnLabelSiswaFoto.style.display = isAdmin ? 'inline-flex' : 'none';
  if (fotoGroup) fotoGroup.style.display = 'flex';
  if (saveContainer) saveContainer.style.display = isAdmin ? 'flex' : 'none';

  // Bottom Card: Kartu Pelajar & QR Absensi
  const cardPhoto = document.getElementById('card-student-photo');
  const cardName = document.getElementById('card-student-name');
  const cardNisBadge = document.getElementById('card-student-nis-badge');
  const cardEngBadge = document.getElementById('card-student-eng-badge');
  const cardMathBadge = document.getElementById('card-student-math-badge');
  const cardGenderBadge = document.getElementById('card-student-gender-badge');
  const cardQr = document.getElementById('card-student-qr');

  const sNis = student.nis || String(student.id);
  const sName = student.full_name || student.name || 'Siswa SoC';
  const sEng = student.kelas_english && student.kelas_english !== 'Belum Ditentukan' ? formatClassName(student.kelas_english) : '-';
  const sMath = student.kelas_math && student.kelas_math !== 'Belum Ditentukan' ? formatClassName(student.kelas_math) : '-';
  const rawG = String(student.gender || '').trim().toUpperCase();
  const sGender = rawG.startsWith('P') ? 'P' : 'L';

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
  if (cardEngBadge) cardEngBadge.textContent = `English: ${sEng}`;
  if (cardMathBadge) cardMathBadge.textContent = `Math: ${sMath}`;
  if (cardGenderBadge) cardGenderBadge.textContent = sGender;
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

export async function handleBulkStudentExcelUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '', raw: false });

      if (!rows || rows.length === 0) {
        alert('File Excel kosong atau format tidak sesuai.');
        return;
      }

      const studentsPayload = rows.map(r => ({
        full_name: String(r['Nama Lengkap'] || r['Nama'] || r['nama_lengkap'] || '').trim(),
        nickname: String(r['Nama Panggilan'] || r['Panggilan'] || r['nickname'] || '').trim(),
        gender: String(r['Jenis Kelamin'] || r['Gender'] || r['gender'] || 'Laki-laki').trim(),
        birth_place: String(r['Tempat Lahir'] || r['tempat_lahir'] || '').trim(),
        birth_date: String(r['Tanggal Lahir (YYYY-MM-DD)'] || r['Tanggal Lahir'] || r['tanggal_lahir'] || '').trim(),
        parent_name: String(r['Nama Orang Tua'] || r['Orang Tua'] || r['nama_ortu'] || '').trim(),
        student_phone: String(r['No HP Siswa'] || r['HP Siswa'] || r['student_phone'] || '').trim(),
        parent_phone: String(r['No HP Orang Tua'] || r['HP Ortu'] || r['parent_phone'] || '').trim(),
        kelas_english: String(r['Level English'] || r['Kelas English'] || r['English'] || '').trim(),
        kelas_math: String(r['Level Matematika'] || r['Kelas Matematika'] || r['Matematika'] || '').trim()
      })).filter(s => s.full_name);

      if (studentsPayload.length === 0) {
        alert('Tidak ditemukan data siswa yang valid (kolom Nama Lengkap wajib diisi).');
        return;
      }

      const res = await fetch('http://localhost:5000/api/students/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: studentsPayload })
      });

      const resData = await res.json();
      if (res.ok) {
        alert(`Berhasil mengimpor ${resData.count || studentsPayload.length} data siswa secara massal!`);
        await loadAllStudents();
        renderDataSiswaTable();
        switchView('data-siswa');
      } else {
        alert('Gagal mengimpor data siswa: ' + (resData.error || 'Terjadi kesalahan'));
      }
    } catch (err) {
      console.error('Error parsing Excel:', err);
      alert('Gagal membaca file Excel: ' + err.message);
    } finally {
      event.target.value = '';
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

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '', raw: false });

      if (!rows || rows.length === 0) {
        alert('File Excel kosong atau format tidak sesuai.');
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
        alert('Tidak ditemukan data pengajar yang valid (kolom Nama Lengkap wajib diisi).');
        return;
      }

      const res = await fetch('http://localhost:5000/api/teachers/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teachers: teachersPayload })
      });

      const resData = await res.json();
      if (res.ok) {
        alert(`Berhasil mengimpor ${resData.count || teachersPayload.length} akun pengajar secara massal!`);
        await renderDataGuruTable();
        switchView('data-guru');
      } else {
        alert('Gagal mengimpor data pengajar: ' + (resData.error || 'Terjadi kesalahan'));
      }
    } catch (err) {
      console.error('Error parsing Excel:', err);
      alert('Gagal membaca file Excel: ' + err.message);
    } finally {
      event.target.value = '';
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

  const sampleRows = [
    {
      'Tanggal (YYYY-MM-DD)': '2026-09-21',
      'Mata Pelajaran': 'English',
      'Kelas': 'English A',
      'Waktu Mulai (HH:MM)': '14:00',
      'Waktu Selesai (HH:MM)': '15:30',
      'Lokasi': 'Kelas Pojok Hope',
      'Topik': 'Alphabet & Phonics',
      'Link Materi': 'https://drive.google.com/drive/folders/1U_VJDr6YXV-3bVslE6TSRA6hd7D16SFh?usp=drive_link',
      'Link Materi Siswa': 'https://youtu.be/sample-video-link',
      'Catatan': 'Bawa buku catatan'
    },
    {
      'Tanggal (YYYY-MM-DD)': '2026-09-22',
      'Mata Pelajaran': 'Matematika',
      'Kelas': 'Math A',
      'Waktu Mulai (HH:MM)': '14:00',
      'Waktu Selesai (HH:MM)': '15:30',
      'Lokasi': 'Kelas Pojok Hope',
      'Topik': 'Operasi Penjumlahan Dasar',
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

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '', raw: false });

      if (!rows || rows.length === 0) {
        alert('File Excel kosong atau format tidak sesuai.');
        return;
      }

      const schedulesPayload = rows.map(r => ({
        date: String(r['Tanggal (YYYY-MM-DD)'] || r['Tanggal'] || r['date'] || '').trim(),
        mata_pelajaran: String(r['Mata Pelajaran'] || r['Pelajaran'] || r['mata_pelajaran'] || 'Karakter').trim(),
        kelas: String(r['Kelas'] || r['kelas'] || 'Semua').trim(),
        start_time: String(r['Waktu Mulai (HH:MM)'] || r['Waktu Mulai'] || '14:00').trim(),
        end_time: String(r['Waktu Selesai (HH:MM)'] || r['Waktu Selesai'] || '15:30').trim(),
        lokasi: String(r['Lokasi'] || 'Kelas Pojok Hope').trim(),
        topik: String(r['Topik'] || r['Topik Materi'] || r['topik'] || '').trim(),
        materi_link: String(r['Link Materi'] || r['Link Materi Guru'] || r['materi_link'] || '').trim(),
        link_materi_siswa: String(r['Link Materi Siswa'] || r['Link Siswa'] || r['link_materi_siswa'] || '').trim(),
        catatan: String(r['Catatan'] || '').trim()
      })).filter(s => s.date);

      if (schedulesPayload.length === 0) {
        alert('Tidak ditemukan data jadwal yang valid (kolom Tanggal wajib diisi).');
        return;
      }

      const res = await fetch('http://localhost:5000/api/schedules/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedules: schedulesPayload })
      });

      const resData = await res.json();
      if (res.ok) {
        alert(`Berhasil mengimpor ${resData.count || schedulesPayload.length} sesi jadwal belajar secara massal!`);
        await loadManagerSchedules();
        loadSchedules();
      } else {
        alert('Gagal mengimpor jadwal: ' + (resData.error || 'Terjadi kesalahan'));
      }
    } catch (err) {
      console.error('Error parsing Excel:', err);
      alert('Gagal membaca file Excel: ' + err.message);
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsArrayBuffer(file);
}
window.handleBulkScheduleExcelUpload = handleBulkScheduleExcelUpload;

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
            <td style="padding: 0.75rem 1rem; text-align: center !important; vertical-align: middle; font-weight: 600; color: var(--color-secondary-dark);">${nameVal} ${roleBadge}</td>
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
  const pwdGroup = pwdInput ? pwdInput.closest('.form-group') : null;
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

  [idInput, nameInput, nickInput, phoneInput, emailInput, jurusanInput].forEach(inp => {
    if (inp) {
      inp.readOnly = !isAdmin;
      inp.style.backgroundColor = isAdmin ? '#fff' : '#f8f9fa';
    }
  });
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
    const engSel = document.getElementById('plotting-english-level');
    const mathSel = document.getElementById('plotting-math-level');
    if (engSel) engSel.value = getRawClassName(targetStudent.kelas_english) || targetStudent.kelas_english || '';
    if (mathSel) mathSel.value = getRawClassName(targetStudent.kelas_math) || targetStudent.kelas_math || '';
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

  // 1. Populate global student datalist for native search
  if (datalist) {
    datalist.innerHTML = allSt.map(s => 
      `<option value="${formatStudentDisplayName(s)}"></option>`
    ).join('');
  }

  // 2. Populate legacy select element if present
  if (sel1) {
    sel1.innerHTML = allSt.map(s => 
      `<option value="${s.id}">${formatStudentDisplayName(s)}</option>`
    ).join('');
  }

  // 3. Set default / active student
  const loggedInUser = window.currentUser;
  const currentRole = window.currentRole || 'guru';
  if (allSt.length > 0) {
    if (!loggedInUser || currentRole !== 'siswa') {
      if (!window.selectedStudentKey) window.selectedStudentKey = allSt[0].id;
    } else if (loggedInUser && (loggedInUser.student_id || loggedInUser.id)) {
      window.selectedStudentKey = parseInt(loggedInUser.student_id || loggedInUser.id, 10);
    }
  }

  const currentSt = allSt.find(s => s.id === window.selectedStudentKey) || allSt[0];
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
  // Ensure options are not disabled so teachers can teach multiple levels (e.g. Miss Dela teaching English A & B)
  document.querySelectorAll('.teacher-assign-select option').forEach(opt => {
    opt.disabled = false;
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

    const asgnMap = {};
    if (Array.isArray(assignments)) {
      assignments.forEach(item => {
        if (item.class_name && item.teacher_name) {
          const rawKey = getRawClassName(item.class_name).toLowerCase();
          const formattedKey = formatClassName(item.class_name).toLowerCase();
          const exactKey = String(item.class_name).trim().toLowerCase();
          asgnMap[rawKey] = item.teacher_name;
          asgnMap[formattedKey] = item.teacher_name;
          asgnMap[exactKey] = item.teacher_name;
        }
      });
    }

    // 3. Populate .teacher-assign-select dropdowns and set saved assignment values
    const selectElements = document.querySelectorAll('.teacher-assign-select');
    selectElements.forEach(sel => {
      const dataKelas = (sel.getAttribute('data-kelas') || '').trim();
      const rawK = getRawClassName(dataKelas).toLowerCase();
      const formattedK = formatClassName(dataKelas).toLowerCase();
      const matchedTeacher = asgnMap[rawK] || asgnMap[formattedK] || asgnMap[dataKelas.toLowerCase()] || '';

      sel.innerHTML = '<option value="">— Pilih Guru —</option>';
      let selectedVal = '';
      guruUsers.forEach(guru => {
        const tName = guru.full_name || guru.name;
        if (!tName) return;
        const opt = document.createElement('option');
        opt.value = tName;
        opt.textContent = tName;
        if (matchedTeacher) {
          const tLower = tName.toLowerCase();
          const mLower = matchedTeacher.toLowerCase();
          if (tLower === mLower ||
              (tLower.includes('nicky') && mLower.includes('nicky')) ||
              (tLower.includes('dela') && mLower.includes('dela')) ||
              (tLower.includes('nisa') && mLower.includes('nisa')) ||
              (tLower.includes('fidya') && mLower.includes('fidya'))) {
            opt.selected = true;
            selectedVal = tName;
          }
        }
        sel.appendChild(opt);
      });

      if (selectedVal) {
        sel.value = selectedVal;
      }
    });

  } catch (e) {
    console.warn('Error loading class assignments:', e);
  }
}
window.renderManajemenKelas = renderManajemenKelas;

export async function loadClassAssignments() {
  return renderManajemenKelas();
}
window.loadClassAssignments = loadClassAssignments;

export function attachKelasListeners() {
  const plottingSel = document.getElementById('plotting-student-selector');
  if (plottingSel && !plottingSel._kelasListenerAttached) {
    plottingSel._kelasListenerAttached = true;
    const updatePlottingLevels = () => {
      const student = findStudentByInputValue(plottingSel.value);
      const engSel  = document.getElementById('plotting-english-level');
      const mathSel = document.getElementById('plotting-math-level');
      if (student) {
        if (engSel)  engSel.value  = getRawClassName(student.kelas_english) || student.kelas_english || '';
        if (mathSel) mathSel.value = getRawClassName(student.kelas_math) || student.kelas_math || '';
      }
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
      const kelasEng    = engSel  ? engSel.value.trim()  : '';
      const kelasMath   = mathSel ? mathSel.value.trim() : '';

      if (!studentId) {
        alert('Pilih siswa terlebih dahulu!');
        return;
      }
      if (!kelasEng || !kelasMath) {
        alert('Level English dan Matematika harus dipilih!');
        return;
      }

      const rawEng = getRawClassName(kelasEng) || kelasEng;
      const rawMath = getRawClassName(kelasMath) || kelasMath;

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
}
window.attachKelasListeners = attachKelasListeners;

export function resetScheduleForm() {
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
  const btnCreateSched = document.getElementById('btn-create-sched');
  const btnCancelEdit = document.getElementById('btn-cancel-edit');

  if (editIdInput) editIdInput.value = '';
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
  if (subjectInput) subjectInput.value = 'Karakter';
  if (kelasInput) kelasInput.value = 'A';
  if (topicInput) topicInput.value = '';
  if (linkInput) linkInput.value = 'https://drive.google.com/drive/folders/1U_VJDr6YXV-3bVslE6TSRA6hd7D16SFh?usp=drive_link';
  if (studentLinkInput) studentLinkInput.value = '';
  if (startTimeInput) startTimeInput.value = '14:00';
  if (endTimeInput) endTimeInput.value = '15:30';
  if (lokasiInput) lokasiInput.value = '';
  if (catatanInput) catatanInput.value = '';

  if (btnCreateSched) {
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
  const kelasInput = document.getElementById('new-sched-kelas');
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
  if (kelasInput && item.kelas) kelasInput.value = item.kelas;
  if (topicInput) topicInput.value = item.topik || '';
  if (linkInput) linkInput.value = item.materi_link || '';
  if (studentLinkInput) studentLinkInput.value = item.link_materi_siswa || '';
  if (startTimeInput) startTimeInput.value = item.start_time || '14:00';
  if (endTimeInput) endTimeInput.value = item.end_time || '15:30';
  if (lokasiInput) lokasiInput.value = item.lokasi || '';
  if (catatanInput) catatanInput.value = item.catatan || '';

  if (btnCreateSched) {
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
    alert('Jadwal berhasil dihapus!');
    const editIdInput = document.getElementById('edit-schedule-id');
    if (editIdInput && editIdInput.value == id) {
      resetScheduleForm();
    }
    await loadManagerSchedules();
    loadSchedules();
    renderJadwalKelas();
    renderManagerSummary();
  } catch (err) {
    console.error('Error deleting schedule:', err);
    alert('Gagal menghapus jadwal: ' + err.message);
  }
}
window.deleteSchedule = deleteSchedule;
