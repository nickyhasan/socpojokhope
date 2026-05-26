/*
  School of Character (SoC) - Pojok Hope
  DASHBOARD CONTROLLER v5
  - URL ?role= and ?kelas= auto-detection
  - Full tab-switching for all 4 views
  - Role-aware sidebar labels and view routing
  - Strict Teacher Class Isolation (Class A & B student lists)
  - Interactive Star Reward System (Bintang Keaktifan)
*/

// =====================================================
// MOCK STUDENT DATABASE
// =====================================================
const mockStudents = {
  budi: {
    name: "Budi Santoso", avatar: "assets/team2.jpg", attendance: 95, kelas: 'A',
    hadir: 19, sakit: 1, izin: 0, alpa: 0, stars: 15,
    scores: { empathy:88, honesty:95, responsibility:85, respect:90, engFluency:82, engReading:78, mathLogic:91, mathArith:87 },
    notes: {
      empathy: "Budi menunjukkan sikap peduli tinggi dengan membantu merapikan ruang kelas.",
      honesty: "Sangat jujur mengakui kesalahan saat memecahkan pensil milik teman.",
      responsibility: "Menyelesaikan semua latihan Matematika tepat waktu.",
      respect: "Selalu menyapa guru dengan salam ramah sebelum masuk kelas."
    }
  },
  aisyah: {
    name: "Aisyah Putri", avatar: "assets/team2.jpg", attendance: 100, kelas: 'A',
    hadir: 20, sakit: 0, izin: 0, alpa: 0, stars: 22,
    scores: { empathy:94, honesty:90, responsibility:92, respect:96, engFluency:89, engReading:91, mathLogic:85, mathArith:88 },
    notes: { empathy:"Berbagi makanan ringan kepada teman-teman saat istirahat.", honesty:"Mengembalikan sisa uang kembalian koperasi kejujuran.", responsibility:"Menjadi pemimpin barisan dan merapikan buku.", respect:"Bertutur kata santun menggunakan kata tolong dan terima kasih." }
  },
  rendi: {
    name: "Rendi Pratama", avatar: "assets/team2.jpg", attendance: 75, kelas: 'A',
    hadir: 15, sakit: 3, izin: 2, alpa: 0, stars: 12,
    scores: { empathy:80, honesty:85, responsibility:78, respect:82, engFluency:75, engReading:70, mathLogic:82, mathArith:78 },
    notes: { empathy:"Aktif membantu merapikan alat olahraga.", honesty:"Jujur mengakui saat lupa mengerjakan tugas rumah.", responsibility:"Melaksanakan tugas piket kelas dengan tertib.", respect:"Selalu mendengarkan saat guru menjelaskan." }
  },
  dewi: {
    name: "Dewi Rahayu", avatar: "assets/team2.jpg", attendance: 90, kelas: 'A',
    hadir: 18, sakit: 1, izin: 1, alpa: 0, stars: 16,
    scores: { empathy:85, honesty:88, responsibility:82, respect:90, engFluency:80, engReading:82, mathLogic:80, mathArith:84 },
    notes: { empathy:"Cepat menolong teman yang terjatuh di halaman.", honesty:"Mengaku secara terbuka ketika meminjam mainan.", responsibility:"Merawat tanaman pojok kelas dengan rajin.", respect:"Menghormati teman yang sedang berdiskusi." }
  },
  fajar: {
    name: "Fajar Ramadhan", avatar: "assets/team2.jpg", attendance: 85, kelas: 'B',
    hadir: 17, sakit: 1, izin: 1, alpa: 1, stars: 8,
    scores: { empathy:82, honesty:85, responsibility:88, respect:80, engFluency:72, engReading:75, mathLogic:90, mathArith:86 },
    notes: { empathy:"Mulai menunjukkan kepedulian, mau berbagi kursi lipat.", honesty:"Menyampaikan hasil pekerjaan matematika secara jujur.", responsibility:"Melaksanakan piket menyapu karpet Pojok Hope.", respect:"Belajar mengantre dengan lebih tenang." }
  },
  siti: {
    name: "Siti Nurhaliza", avatar: "assets/team2.jpg", attendance: 100, kelas: 'B',
    hadir: 20, sakit: 0, izin: 0, alpa: 0, stars: 18,
    scores: { empathy:90, honesty:92, responsibility:90, respect:95, engFluency:86, engReading:88, mathLogic:83, mathArith:85 },
    notes: { empathy:"Menenangkan temannya yang sedang menangis.", honesty:"Berkata jujur mengenai alasan terlambat.", responsibility:"Mengumpulkan sampah plastik setelah makan bersama.", respect:"Etika mendengarkan sangat baik saat mentor bercerita." }
  },
  yoga: {
    name: "Yoga Pratama", avatar: "assets/team2.jpg", attendance: 90, kelas: 'B',
    hadir: 18, sakit: 0, izin: 2, alpa: 0, stars: 14,
    scores: { empathy:84, honesty:86, responsibility:80, respect:85, engFluency:78, engReading:80, mathLogic:85, mathArith:82 },
    notes: { empathy:"Peduli membantu merapikan bangku setelah kelas usai.", honesty:"Jujur mengakui saat kesulitan memahami soal Matematika.", responsibility:"Selalu menyelesaikan latihan soal tepat waktu.", respect:"Selalu berkata santun kepada teman sebangku." }
  }
};

// =====================================================
// STATE
// =====================================================
let currentRole = 'siswa'; // 'siswa' or 'guru'
let selectedStudentKey = 'budi';
let currentView = 'ringkasan'; // active view id

// =====================================================
// DOM READY
// =====================================================
document.addEventListener('DOMContentLoaded', () => {

  // Detect role & kelas from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const urlRole = urlParams.get('role');
  const urlKelas = urlParams.get('kelas') || 'A';
  window.currentKelas = urlKelas;

  if (urlRole === 'guru' || urlRole === 'siswa') {
    currentRole = urlRole;
    const rc = document.getElementById('role-selector-container');
    if (rc) rc.style.display = 'none'; // hide toggle when role auto-detected
  }

  // Set the dynamic title for absensi view harian
  const absensiClassTitle = document.getElementById('absensi-class-title');
  if (absensiClassTitle) {
    absensiClassTitle.innerHTML = `<i class="fas fa-users text-teal"></i> Daftar Siswa: Kelas ${window.currentKelas}`;
  }

  // Populate student dropdown lists & rosters dynamically
  populateStudentSelectors();
  renderTeacherAttendanceRoster();

  // Apply initial role view
  applyRole(currentRole, false);

  // Sidebar menu tab switching
  document.querySelectorAll('.sidebar-menu .menu-item[data-view]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.getAttribute('data-view');
      switchView(view);
    });
  });

  // Role toggle button (demo mode)
  const roleToggleBtn = document.getElementById('role-toggle-btn');
  if (roleToggleBtn) {
    roleToggleBtn.addEventListener('click', () => {
      const newRole = currentRole === 'siswa' ? 'guru' : 'siswa';
      applyRole(newRole, true);
    });
  }

  // Sidebar toggle (mobile)
  const sidebar = document.querySelector('.sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle-btn');
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('active');
    });
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && !sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
        sidebar.classList.remove('active');
      }
    });
  }

  // Student selector (teacher Ringkasan)
  const studentSelector = document.getElementById('student-selector');
  if (studentSelector) {
    studentSelector.addEventListener('change', (e) => {
      selectedStudentKey = e.target.value;
      const raporSel = document.getElementById('rapor-student-selector');
      if (raporSel) raporSel.value = selectedStudentKey;
      loadStudentScoresToSliders(selectedStudentKey);
      updateRaporViewForStudent(selectedStudentKey);
      updateStudentRingkasan();
    });
  }

  // Student selector (teacher Rapor)
  const raporStudentSelector = document.getElementById('rapor-student-selector');
  if (raporStudentSelector) {
    raporStudentSelector.addEventListener('change', (e) => {
      selectedStudentKey = e.target.value;
      if (studentSelector) studentSelector.value = selectedStudentKey;
      loadStudentScoresToSliders(selectedStudentKey);
      updateRaporViewForStudent(selectedStudentKey);
      updateStudentRingkasan();
    });
  }

  // Slider real-time badge updates
  const sliders = [
    ['slider-empathy','slider-empathy-val'],
    ['slider-honesty','slider-honesty-val'],
    ['slider-responsibility','slider-responsibility-val'],
    ['slider-respect','slider-respect-val'],
    ['slider-eng-fluency','slider-eng-fluency-val'],
    ['slider-eng-reading','slider-eng-reading-val'],
    ['slider-math-logic','slider-math-logic-val'],
    ['slider-math-arith','slider-math-arith-val'],
  ];
  sliders.forEach(([slId, valId]) => {
    const sl = document.getElementById(slId);
    const vl = document.getElementById(valId);
    if (sl && vl) sl.addEventListener('input', () => { vl.textContent = sl.value; });
  });

  // Save scores button
  const btnSave = document.getElementById('btn-save-score');
  const saveMsg = document.getElementById('save-status-msg');
  if (btnSave) {
    btnSave.addEventListener('click', () => {
      const d = mockStudents[selectedStudentKey];
      if (!d) return;
      d.scores.empathy       = parseInt(document.getElementById('slider-empathy').value);
      d.scores.honesty       = parseInt(document.getElementById('slider-honesty').value);
      d.scores.responsibility= parseInt(document.getElementById('slider-responsibility').value);
      d.scores.respect       = parseInt(document.getElementById('slider-respect').value);
      d.scores.engFluency    = parseInt(document.getElementById('slider-eng-fluency').value);
      d.scores.engReading    = parseInt(document.getElementById('slider-eng-reading').value);
      d.scores.mathLogic     = parseInt(document.getElementById('slider-math-logic').value);
      d.scores.mathArith     = parseInt(document.getElementById('slider-math-arith').value);
      
      updateRaporViewForStudent(selectedStudentKey);
      updateStudentRingkasan();

      if (saveMsg) { saveMsg.classList.remove('hidden'); setTimeout(()=>saveMsg.classList.add('hidden'), 2500); }
    });
  }

  // Save absensi button
  const btnAbsensi = document.getElementById('btn-save-absensi');
  if (btnAbsensi) {
    btnAbsensi.addEventListener('click', () => {
      alert('✓ Absensi harian berhasil disimpan! Data kehadiran telah diperbarui.');
    });
  }

  // Broadcast planner
  const btnBroadcast = document.getElementById('btn-broadcast-planner');
  if (btnBroadcast) {
    btnBroadcast.addEventListener('click', () => {
      alert('Siaran berhasil! Notifikasi WhatsApp dikirim to volunteer dan koordinator Outdoor Learning.');
    });
  }

  // Star reward control buttons
  const btnStarAdd = document.getElementById('btn-star-add');
  const btnStarSub = document.getElementById('btn-star-sub');
  const btnStarReset = document.getElementById('btn-star-reset');

  if (btnStarAdd) {
    btnStarAdd.addEventListener('click', () => {
      const student = mockStudents[selectedStudentKey];
      if (student) {
        student.stars = (student.stars || 0) + 1;
        updateStarDisplay();
      }
    });
  }

  if (btnStarSub) {
    btnStarSub.addEventListener('click', () => {
      const student = mockStudents[selectedStudentKey];
      if (student && student.stars > 0) {
        student.stars -= 1;
        updateStarDisplay();
      }
    });
  }

  if (btnStarReset) {
    btnStarReset.addEventListener('click', () => {
      const student = mockStudents[selectedStudentKey];
      if (student) {
        if (confirm(`Apakah Anda yakin ingin me-reset bintang untuk ${student.name}?`)) {
          student.stars = 0;
          updateStarDisplay();
        }
      }
    });
  }

  // Initialize student displays
  updateStudentRingkasan();
  updateStarDisplay();
});

// =====================================================
// DYNAMIC ROSTER AND SELECTOR FILTERING
// =====================================================
function populateStudentSelectors() {
  const studentSelector = document.getElementById('student-selector');
  const raporStudentSelector = document.getElementById('rapor-student-selector');
  
  const kelasVal = window.currentKelas || 'A';
  
  // Filter students based on teacher's class
  let filteredEntries = Object.entries(mockStudents);
  if (currentRole === 'guru') {
    filteredEntries = filteredEntries.filter(([key, d]) => d.kelas === kelasVal);
  }

  const updateSelector = (el) => {
    if (!el) return;
    const currentVal = el.value || selectedStudentKey;
    el.innerHTML = '';
    filteredEntries.forEach(([key, d]) => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = d.name;
      el.appendChild(opt);
    });
    // Restore or select first available
    if (filteredEntries.some(([key]) => key === currentVal)) {
      el.value = currentVal;
    } else if (filteredEntries.length > 0) {
      el.value = filteredEntries[0][0];
    }
  };

  updateSelector(studentSelector);
  updateSelector(raporStudentSelector);

  // Set the selectedStudentKey to the first student of the filtered class if current isn't in the list
  if (!filteredEntries.some(([key]) => key === selectedStudentKey) && filteredEntries.length > 0) {
    selectedStudentKey = filteredEntries[0][0];
  }
}

function renderTeacherAttendanceRoster() {
  const rosterContainer = document.getElementById('absensi-dynamic-roster');
  if (!rosterContainer) return;

  const kelasVal = window.currentKelas || 'A';
  
  // Filter students by class
  const filteredStudents = Object.entries(mockStudents).filter(([key, d]) => d.kelas === kelasVal);

  rosterContainer.innerHTML = ''; // clear existing

  filteredStudents.forEach(([key, d]) => {
    const row = document.createElement('div');
    row.className = 'absensi-row';
    row.innerHTML = `
      <span class="absensi-name">${d.name}</span>
      <div class="absensi-actions" data-student-key="${key}">
        <button class="absensi-btn hadir active" onclick="markAttendance(this,'hadir')">H</button>
        <button class="absensi-btn sakit" onclick="markAttendance(this,'sakit')">S</button>
        <button class="absensi-btn izin" onclick="markAttendance(this,'izin')">I</button>
        <button class="absensi-btn alpa" onclick="markAttendance(this,'alpa')">A</button>
      </div>
    `;
    rosterContainer.appendChild(row);
  });
}

// =====================================================
// VIEW SWITCHING
// =====================================================
function switchView(viewKey) {
  // Hide all dashboard views
  document.querySelectorAll('.dashboard-view').forEach(v => v.classList.remove('active'));

  // Update sidebar active state
  document.querySelectorAll('.sidebar-menu .menu-item[data-view]').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-view') === viewKey);
  });

  // Update header title
  const titles = {
    ringkasan: 'Panel Dashboard',
    jadwal:    'Jadwal Kelas',
    rapor:     'Rapor Siswa',
    kehadiran: currentRole === 'guru' ? 'Kelola Absensi' : 'Kehadiran Saya',
  };
  const titleEl = document.getElementById('header-title-text');
  if (titleEl) titleEl.textContent = titles[viewKey] || 'Dashboard';

  currentView = viewKey;

  // Show the correct view
  if (viewKey === 'ringkasan') {
    const v = document.getElementById('view-ringkasan');
    if (v) v.classList.add('active');
    updateStudentRingkasan();

  } else if (viewKey === 'jadwal') {
    const v = document.getElementById('view-jadwal');
    if (v) v.classList.add('active');

  } else if (viewKey === 'rapor') {
    const v = document.getElementById('view-rapor');
    if (v) v.classList.add('active');
    // show student selector and class badge in teacher mode
    const row = document.getElementById('rapor-student-selector-row');
    const badgeContainer = document.getElementById('rapor-class-badge-container');
    if (row) row.style.display = currentRole === 'guru' ? 'flex' : 'none';
    if (badgeContainer) badgeContainer.style.display = currentRole === 'guru' ? 'block' : 'none';

    // Show appropriate star card based on role
    const sStarCard = document.getElementById('student-star-card');
    const tStarCard = document.getElementById('teacher-star-card');
    if (sStarCard) sStarCard.style.display = currentRole === 'siswa' ? 'block' : 'none';
    if (tStarCard) tStarCard.style.display = currentRole === 'guru' ? 'block' : 'none';

    updateRaporViewForStudent(selectedStudentKey);

  } else if (viewKey === 'kehadiran') {
    if (currentRole === 'guru') {
      const v = document.getElementById('view-kehadiran-guru');
      if (v) v.classList.add('active');
    } else {
      const v = document.getElementById('view-kehadiran-siswa');
      if (v) v.classList.add('active');
    }
  }
}

// =====================================================
// ROLE APPLICATION
// =====================================================
function applyRole(role, updateToggle = true) {
  currentRole = role;

  // Sidebar user card
  const sidebarAvatar   = document.getElementById('sidebar-avatar-img');
  const userDisplayName = document.getElementById('user-display-name');
  const userDisplayRole = document.getElementById('user-display-role');
  const kehadiranLabel  = document.getElementById('kehadiran-label');
  const roleToggleBtn   = document.getElementById('role-toggle-btn');

  // Repopulate and filter the selectors and roster based on updated role
  populateStudentSelectors();
  renderTeacherAttendanceRoster();

  if (role === 'guru') {
    if (sidebarAvatar)   sidebarAvatar.src = "assets/team1.jpg";
    
    // Class A and B dynamic name & welcome text
    const kelasVal = window.currentKelas || 'A';
    const teacherWelcomeText = document.querySelector('#ringkasan-guru .welcome-text h2');
    
    if (kelasVal === 'B') {
      if (userDisplayName) userDisplayName.textContent = "Sir Nicky / Miss Fidya";
      if (teacherWelcomeText) teacherWelcomeText.textContent = "Selamat datang kembali, Sir Nicky / Miss Fidya! 👨‍🏫👩‍🏫";
      const badgeEl = document.getElementById('rapor-class-badge');
      if (badgeEl) badgeEl.textContent = "Mengelola: Kelas B";
    } else {
      if (userDisplayName) userDisplayName.textContent = "Miss Nisa / Miss Dela";
      if (teacherWelcomeText) teacherWelcomeText.textContent = "Selamat datang kembali, Miss Nisa / Miss Dela! 👩‍🏫";
      const badgeEl = document.getElementById('rapor-class-badge');
      if (badgeEl) badgeEl.textContent = "Mengelola: Kelas A";
    }

    if (userDisplayRole) userDisplayRole.textContent = "Guru / Pengajar";
    if (kehadiranLabel)  kehadiranLabel.textContent  = "Kelola Absensi";
    if (updateToggle && roleToggleBtn) roleToggleBtn.innerHTML = '<i class="fas fa-user-graduate"></i> Switch ke Siswa';
    
    // Show Guru Ringkasan, hide Siswa Ringkasan
    const gR = document.getElementById('ringkasan-guru');
    const sR = document.getElementById('ringkasan-siswa');
    if (gR) gR.style.display = 'block';
    if (sR) sR.style.display = 'none';
    loadStudentScoresToSliders(selectedStudentKey);
  } else {
    // If returning to student view, default back to 'budi'
    selectedStudentKey = 'budi';
    if (sidebarAvatar)   sidebarAvatar.src = mockStudents[selectedStudentKey].avatar;
    if (userDisplayName) userDisplayName.textContent = mockStudents[selectedStudentKey].name;
    if (userDisplayRole) userDisplayRole.textContent = "Siswa";
    if (kehadiranLabel)  kehadiranLabel.textContent  = "Kehadiran";
    if (updateToggle && roleToggleBtn) roleToggleBtn.innerHTML = '<i class="fas fa-chalkboard-teacher"></i> Switch ke Guru';
    
    // Show Siswa Ringkasan, hide Guru Ringkasan
    const gR = document.getElementById('ringkasan-guru');
    const sR = document.getElementById('ringkasan-siswa');
    if (gR) gR.style.display = 'none';
    if (sR) sR.style.display = 'block';
    updateStudentRingkasan();
  }

  // Re-switch to current view to apply role-specific routing
  switchView(currentView);
}

// =====================================================
// STUDENT RINGKASAN — update progress bars & stats
// =====================================================
function updateStudentRingkasan() {
  const d = mockStudents[selectedStudentKey];
  if (!d) return;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  
  // Update scores in view-ringkasan
  const scores = [
    {id:'score-empathy', score:d.scores.empathy},
    {id:'score-honesty', score:d.scores.honesty},
    {id:'score-responsibility', score:d.scores.responsibility},
    {id:'score-respect', score:d.scores.respect},
    {id:'score-eng-fluency', score:d.scores.engFluency},
    {id:'score-eng-reading', score:d.scores.engReading},
    {id:'score-math-logic', score:d.scores.mathLogic},
    {id:'score-math-arith', score:d.scores.mathArith},
  ];
  scores.forEach(item => {
    const el = document.getElementById(item.id);
    if (el) el.textContent = `${item.score} / 100`;
  });

  // Update progress bar widths in view-ringkasan
  const boxes = document.querySelectorAll('#view-ringkasan .trait-progress-box');
  const scoreValues = [
    d.scores.empathy, d.scores.honesty, d.scores.responsibility, d.scores.respect,
    d.scores.engFluency, d.scores.engReading, d.scores.mathLogic, d.scores.mathArith
  ];
  boxes.forEach((box, i) => {
    const bar = box.querySelector('.progress-bar');
    if (bar && scoreValues[i] !== undefined) bar.style.width = `${scoreValues[i]}%`;
  });

  // Attendance summary in welcome banner
  set('stat-attendance', `${d.attendance}%`);
  set('attendance-percent', `${d.attendance}%`);

  // Kehadiran tab stats
  set('att-sum-hadir-val', d.hadir !== undefined ? d.hadir : 19);
  set('att-sum-sakit-val', d.sakit !== undefined ? d.sakit : 1);
  set('att-sum-izin-val', d.izin !== undefined ? d.izin : 0);
  set('att-sum-alpa-val', d.alpa !== undefined ? d.alpa : 0);
  set('att-sum-pct-val', `${d.attendance}%`);

  // Grade badges
  const grade = (s) => s >= 90 ? 'A' : s >= 85 ? 'A-' : s >= 80 ? 'B+' : s >= 75 ? 'B' : 'B-';
  const engAvg = Math.round((d.scores.engFluency + d.scores.engReading) / 2);
  const mathAvg = Math.round((d.scores.mathLogic + d.scores.mathArith) / 2);
  set('stat-english-grade', grade(engAvg));
  set('stat-math-grade', grade(mathAvg));
}

// =====================================================
// TEACHER SLIDERS — load student data
// =====================================================
function loadStudentScoresToSliders(key) {
  const d = mockStudents[key];
  if (!d) return;
  const sl = (slId, valId, val) => {
    const s = document.getElementById(slId); const v = document.getElementById(valId);
    if (s) s.value = val; if (v) v.textContent = val;
  };
  sl('slider-empathy','slider-empathy-val',d.scores.empathy);
  sl('slider-honesty','slider-honesty-val',d.scores.honesty);
  sl('slider-responsibility','slider-responsibility-val',d.scores.responsibility);
  sl('slider-respect','slider-respect-val',d.scores.respect);
  sl('slider-eng-fluency','slider-eng-fluency-val',d.scores.engFluency);
  sl('slider-eng-reading','slider-eng-reading-val',d.scores.engReading);
  sl('slider-math-logic','slider-math-logic-val',d.scores.mathLogic);
  sl('slider-math-arith','slider-math-arith-val',d.scores.mathArith);
}

// =====================================================
// STAR DISPLAY & RAPOR SYSTEM
// =====================================================
function updateStarDisplay() {
  const student = mockStudents[selectedStudentKey];
  if (!student) return;
  const sCountEl = document.getElementById('student-star-count');
  const tCountEl = document.getElementById('teacher-star-count');
  const starNameEl = document.getElementById('star-student-name');
  
  if (sCountEl) sCountEl.textContent = student.stars !== undefined ? student.stars : 0;
  if (tCountEl) tCountEl.textContent = student.stars !== undefined ? student.stars : 0;
  if (starNameEl) starNameEl.textContent = student.name;
}

function updateRaporViewForStudent(key) {
  const d = mockStudents[key];
  if (!d) return;

  // Update gauges (calculate average for each category)
  const charAvg = Math.round((d.scores.empathy + d.scores.honesty + d.scores.responsibility + d.scores.respect) / 4);
  const engAvg = Math.round((d.scores.engFluency + d.scores.engReading) / 2);
  const mathAvg = Math.round((d.scores.mathLogic + d.scores.mathArith) / 2);

  const setGauge = (valId, circleId, val) => {
    const v = document.getElementById(valId);
    const c = document.getElementById(circleId);
    if (v) v.textContent = val;
    if (c) {
      c.style.setProperty('--gauge-pct', val);
      c.style.background = `conic-gradient(var(--gauge-color) calc(${val} * 1%), var(--bg-contrast) 0%)`;
    }
  };

  setGauge('gauge-char-val', 'gauge-char-circle', charAvg);
  setGauge('gauge-eng-val', 'gauge-eng-circle', engAvg);
  setGauge('gauge-math-val', 'gauge-math-circle', mathAvg);

  // Update table cells (May column)
  const setCell = (cellId, val) => {
    const el = document.getElementById(cellId);
    if (el) {
      el.textContent = val;
      // also check score level class
      el.className = 'score-chip ' + (val >= 90 ? 'score-a' : val >= 80 ? 'score-b' : 'score-c');
    }
  };

  setCell('cell-may-empathy', d.scores.empathy);
  setCell('cell-may-honesty', d.scores.honesty);
  setCell('cell-may-responsibility', d.scores.responsibility);
  setCell('cell-may-respect', d.scores.respect);
  setCell('cell-may-fluency', d.scores.engFluency);
  setCell('cell-may-reading', d.scores.engReading);
  setCell('cell-may-logic', d.scores.mathLogic);
  setCell('cell-may-arith', d.scores.mathArith);

  const totalAvg = Math.round((charAvg + engAvg + mathAvg) / 3);
  const avgCell = document.getElementById('cell-may-average');
  if (avgCell) avgCell.textContent = totalAvg;

  // Update star display
  updateStarDisplay();
}

// =====================================================
// GLOBAL INLINE HANDLERS (called from HTML)
// =====================================================

// Mark individual attendance
function markAttendance(btn, type) {
  const row = btn.closest('.absensi-actions');
  if (!row) return;
  row.querySelectorAll('.absensi-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}
