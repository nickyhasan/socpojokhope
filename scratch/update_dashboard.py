with open('dashboard.html', 'rb') as f:
    content = f.read().decode('utf-8')

# Normalize newlines for replacement
def replace_normalized(src, target, replacement):
    src_norm = src.replace('\r\n', '\n')
    target_norm = target.replace('\r\n', '\n')
    replacement_norm = replacement.replace('\r\n', '\n')
    if target_norm not in src_norm:
        raise ValueError("Target not found:\n" + target_norm[:100])
    updated = src_norm.replace(target_norm, replacement_norm, 1)
    if '\r\n' in src:
        return updated.replace('\n', '\r\n')
    return updated

# 1. Update #new-sched-subject
old_subject = '''              <select id="new-sched-subject" class="custom-select" style="width: 100%;">
                <option value="Karakter">Karakter</option>
                <option value="English">English</option>
                <option value="Matematika">Matematika</option>
                <option value="Outdoor Learning">Outdoor Learning</option>
              </select>'''

new_subject = '''              <select id="new-sched-subject" class="custom-select" style="width: 100%;">
                <option value="Karakter">Karakter (Bulanan - Semua Kelas)</option>
                <option value="Outdoor Learning">Outdoor Learning (Akhir Semester - Semua Kelas)</option>
                <option value="Calistung">Calistung (Mingguan - Kelas Dasar Baca Tulis Hitung)</option>
                <option value="English">English (Bergantian - Level A, B, C)</option>
                <option value="Matematika">Matematika (Bergantian - Level A, B, C)</option>
              </select>'''

# 2. Update #new-sched-kelas initial options
old_sched_kelas = '''              <select id="new-sched-kelas" class="custom-select" style="width: 100%;">
                <option value="English A">English A (Foundation)</option>
                <option value="English B">English B (Beginner)</option>
                <option value="English C">English C (Intermediate)</option>
                <option value="English D">English D (Advanced)</option>
                <option value="Math A">Math A (Dasar Angka)</option>
                <option value="Math B">Math B (Operasi Lanjut)</option>
                <option value="Math C">Math C (Pecahan &amp; Logika)</option>
                <option value="Math D">Math D (Pra-Aljabar &amp; Kritis)</option>
                <option value="Semua">Semua Kelas (Karakter / Gabungan)</option>
              </select>'''

new_sched_kelas = '''              <select id="new-sched-kelas" class="custom-select" style="width: 100%;">
                <option value="Semua">Semua Kelas (Karakter / Gabungan)</option>
              </select>'''

content = replace_normalized(content, old_subject, new_subject)
content = replace_normalized(content, old_sched_kelas, new_sched_kelas)

# 3. Update #view-manajemen-kelas table & action buttons
old_card_header = '''            <div class="card-header">
              <h3><i class="fas fa-chalkboard-teacher text-teal"></i> Daftar Pengajar Kelas</h3>
              <span class="badge badge-teal">8 Kelas</span>
            </div>'''

new_card_header = '''            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
              <div style="display:flex; align-items:center; gap:0.75rem;">
                <h3><i class="fas fa-chalkboard-teacher text-teal"></i> Daftar Pengajar Kelas</h3>
                <span class="badge badge-teal" id="badge-total-kelas">7 Kelas</span>
              </div>
              <div id="class-management-actions" style="display:flex; gap:0.5rem; align-items:center;">
                <button type="button" class="btn btn-sm btn-primary" id="btn-add-class-level" style="display:inline-flex; align-items:center; gap:0.4rem;">
                  <i class="fas fa-plus-circle"></i> Tambah Kelas
                </button>
                <button type="button" class="btn btn-sm btn-outline text-danger" id="btn-toggle-delete-class" style="display:inline-flex; align-items:center; gap:0.4rem; border-color:#e53e3e; color:#e53e3e;">
                  <i class="fas fa-trash-alt"></i> Hapus Kelas
                </button>
              </div>
            </div>'''

content = replace_normalized(content, old_card_header, new_card_header)

old_table = '''              <table class="rapor-table teacher-assign-table" style="width:100%; border-collapse:collapse;">
                <thead>
                  <tr>
                    <th style="text-align:left; padding:0.6rem 0.75rem; background:var(--color-primary-dark) !important; color:#fff !important; font-size:0.85rem; white-space:nowrap;">Kelas / Level</th>
                    <th style="text-align:left; padding:0.6rem 0.75rem; background:var(--color-primary-dark) !important; color:#fff !important; font-size:0.85rem;">Pengajar</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="padding:0.55rem 0.75rem; font-weight:600; white-space:nowrap;"><span class="badge badge-teal" style="font-size:0.8rem;">EN</span> English A (Foundation)</td>
                    <td style="padding:0.55rem 0.75rem;">
                      <select class="custom-select teacher-assign-select" data-kelas="English A" style="width:100%; font-size:0.85rem;">
                        <option value="">— Pilih Guru —</option>
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0.55rem 0.75rem; font-weight:600; white-space:nowrap;"><span class="badge badge-teal" style="font-size:0.8rem;">EN</span> English B (Beginner)</td>
                    <td style="padding:0.55rem 0.75rem;">
                      <select class="custom-select teacher-assign-select" data-kelas="English B" style="width:100%; font-size:0.85rem;">
                        <option value="">— Pilih Guru —</option>
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0.55rem 0.75rem; font-weight:600; white-space:nowrap;"><span class="badge badge-teal" style="font-size:0.8rem;">EN</span> English C (Intermediate)</td>
                    <td style="padding:0.55rem 0.75rem;">
                      <select class="custom-select teacher-assign-select" data-kelas="English C" style="width:100%; font-size:0.85rem;">
                        <option value="">— Pilih Guru —</option>
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0.55rem 0.75rem; font-weight:600; white-space:nowrap;"><span class="badge badge-teal" style="font-size:0.8rem;">EN</span> English D (Advanced)</td>
                    <td style="padding:0.55rem 0.75rem;">
                      <select class="custom-select teacher-assign-select" data-kelas="English D" style="width:100%; font-size:0.85rem;">
                        <option value="">— Pilih Guru —</option>
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0.55rem 0.75rem; font-weight:600; white-space:nowrap;"><span class="badge badge-green" style="font-size:0.8rem;">MA</span> Math A (Dasar Angka)</td>
                    <td style="padding:0.55rem 0.75rem;">
                      <select class="custom-select teacher-assign-select" data-kelas="Math A" style="width:100%; font-size:0.85rem;">
                        <option value="">— Pilih Guru —</option>
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0.55rem 0.75rem; font-weight:600; white-space:nowrap;"><span class="badge badge-green" style="font-size:0.8rem;">MA</span> Math B (Operasi Lanjut)</td>
                    <td style="padding:0.55rem 0.75rem;">
                      <select class="custom-select teacher-assign-select" data-kelas="Math B" style="width:100%; font-size:0.85rem;">
                        <option value="">— Pilih Guru —</option>
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0.55rem 0.75rem; font-weight:600; white-space:nowrap;"><span class="badge badge-green" style="font-size:0.8rem;">MA</span> Math C (Pecahan &amp; Logika)</td>
                    <td style="padding:0.55rem 0.75rem;">
                      <select class="custom-select teacher-assign-select" data-kelas="Math C" style="width:100%; font-size:0.85rem;">
                        <option value="">— Pilih Guru —</option>
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0.55rem 0.75rem; font-weight:600; white-space:nowrap;"><span class="badge badge-green" style="font-size:0.8rem;">MA</span> Math D (Pra-Aljabar &amp; Kritis)</td>
                    <td style="padding:0.55rem 0.75rem;">
                      <select class="custom-select teacher-assign-select" data-kelas="Math D" style="width:100%; font-size:0.85rem;">
                        <option value="">— Pilih Guru —</option>
                      </select>
                    </td>
                  </tr>
                </tbody>
              </table>'''

new_table = '''              <table class="rapor-table teacher-assign-table" style="width:100%; border-collapse:collapse;">
                <thead>
                  <tr>
                    <th style="text-align:left; padding:0.6rem 0.75rem; background:var(--color-primary-dark) !important; color:#fff !important; font-size:0.85rem; white-space:nowrap;">Kelas / Level</th>
                    <th style="text-align:left; padding:0.6rem 0.75rem; background:var(--color-primary-dark) !important; color:#fff !important; font-size:0.85rem;">Pengajar</th>
                    <th id="th-delete-class" style="display:none; text-align:center; width:65px; padding:0.6rem 0.75rem; background:var(--color-primary-dark) !important; color:#fff !important; font-size:0.85rem;">Aksi</th>
                  </tr>
                </thead>
                <tbody id="teacher-assign-tbody">
                  <!-- Dynamically rendered from loadClassAssignments() -->
                </tbody>
              </table>'''

content = replace_normalized(content, old_table, new_table)

# 4. Wrap #btn-simpan-penugasan
old_save_assign = '''            <div style="margin-top:1.5rem;">
              <button class="btn btn-primary" id="btn-simpan-penugasan" style="width:100%;">
                <i class="fas fa-save"></i> Simpan Penugasan
              </button>
            </div>'''

new_save_assign = '''            <div style="margin-top:1.5rem;" id="container-btn-simpan-penugasan">
              <button class="btn btn-primary" id="btn-simpan-penugasan" style="width:100%;">
                <i class="fas fa-save"></i> Simpan Penugasan
              </button>
            </div>'''

content = replace_normalized(content, old_save_assign, new_save_assign)

# 5. Update student placement dropdowns: #edit-siswa-kelas-eng & #edit-siswa-kelas-math
old_edit_eng = '''                  <select id="edit-siswa-kelas-eng" class="form-control custom-select" style="width: 100%; padding: 0.65rem 0.85rem; border: 1.5px solid var(--border-color); border-radius: 8px;">
                    <option value="">— Belum Ditentukan —</option>
                    <option value="English A">English A (Foundation)</option>
                    <option value="English B">English B (Beginner)</option>
                    <option value="English C">English C (Intermediate)</option>
                    <option value="English D">English D (Advanced)</option>
                  </select>'''

new_edit_eng = '''                  <select id="edit-siswa-kelas-eng" class="form-control custom-select" style="width: 100%; padding: 0.65rem 0.85rem; border: 1.5px solid var(--border-color); border-radius: 8px;">
                    <option value="">— Belum Ditentukan —</option>
                    <option value="Calistung">Calistung (Baca Tulis Hitung)</option>
                    <option value="English A">English A (Beginner)</option>
                    <option value="English B">English B (Intermediate)</option>
                    <option value="English C">English C (Advanced)</option>
                  </select>'''

content = replace_normalized(content, old_edit_eng, new_edit_eng)

old_edit_math = '''                  <select id="edit-siswa-kelas-math" class="form-control custom-select" style="width: 100%; padding: 0.65rem 0.85rem; border: 1.5px solid var(--border-color); border-radius: 8px;">
                    <option value="">— Belum Ditentukan —</option>
                    <option value="Math A">Math A (Dasar Angka)</option>
                    <option value="Math B">Math B (Operasi Lanjut)</option>
                    <option value="Math C">Math C (Pecahan &amp; Logika)</option>
                    <option value="Math D">Math D (Pra-Aljabar &amp; Kritis)</option>
                  </select>'''

new_edit_math = '''                  <select id="edit-siswa-kelas-math" class="form-control custom-select" style="width: 100%; padding: 0.65rem 0.85rem; border: 1.5px solid var(--border-color); border-radius: 8px;">
                    <option value="">— Belum Ditentukan —</option>
                    <option value="Calistung">Calistung (Baca Tulis Hitung)</option>
                    <option value="Math A">Math A (Beginner)</option>
                    <option value="Math B">Math B (Intermediate)</option>
                    <option value="Math C">Math C (Advanced)</option>
                  </select>'''

content = replace_normalized(content, old_edit_math, new_edit_math)

# 6. Update student placement dropdowns: #plotting-english-level & #plotting-math-level
old_plot_eng = '''              <select id="plotting-english-level" class="custom-select form-control" style="width:100%;">
                <option value="">— Belum Ditentukan —</option>
                <option value="English A">English A (Foundation)</option>
                <option value="English B">English B (Beginner)</option>
                <option value="English C">English C (Intermediate)</option>
                <option value="English D">English D (Advanced)</option>
              </select>'''

new_plot_eng = '''              <select id="plotting-english-level" class="custom-select form-control" style="width:100%;">
                <option value="">— Belum Ditentukan —</option>
                <option value="Calistung">Calistung (Baca Tulis Hitung)</option>
                <option value="English A">English A (Beginner)</option>
                <option value="English B">English B (Intermediate)</option>
                <option value="English C">English C (Advanced)</option>
                <option value="Lulus">Lulus (Alumni)</option>
              </select>'''

content = replace_normalized(content, old_plot_eng, new_plot_eng)

old_plot_math = '''              <select id="plotting-math-level" class="custom-select form-control" style="width:100%;">
                <option value="">— Belum Ditentukan —</option>
                <option value="Math A">Math A (Dasar Angka)</option>
                <option value="Math B">Math B (Operasi Lanjut)</option>
                <option value="Math C">Math C (Pecahan &amp; Logika)</option>
                <option value="Math D">Math D (Pra-Aljabar &amp; Kritis)</option>
              </select>'''

new_plot_math = '''              <select id="plotting-math-level" class="custom-select form-control" style="width:100%;">
                <option value="">— Belum Ditentukan —</option>
                <option value="Calistung">Calistung (Baca Tulis Hitung)</option>
                <option value="Math A">Math A (Beginner)</option>
                <option value="Math B">Math B (Intermediate)</option>
                <option value="Math C">Math C (Advanced)</option>
                <option value="Lulus">Lulus (Alumni)</option>
              </select>'''

content = replace_normalized(content, old_plot_math, new_plot_math)

with open('dashboard.html', 'wb') as f:
    f.write(content.encode('utf-8'))

print("dashboard.html updated successfully!")
