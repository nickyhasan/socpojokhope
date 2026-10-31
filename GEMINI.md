# GEMINI.md - Senior Principal Engineer Operating Rules & System Guardrails
Project: **School of Character (SoC) - Pojok Hope**
Methodology: **`obra/superpowers` Engineering Standards**

---

## 1. Core Operating Principles

### A. Surgical Edits Only (Minimal Delta Rule)
- **Zero Collateral Damage**: NEVER delete, overwrite, refactor, or alter working functions, HTML views, or CSS rules outside the immediate task scope.
- **Preserve Documentation & Context**: Maintain all existing comments, docstrings, classes, element IDs, and utility handlers.
- **Anchor Before Replacing**: When editing files, read the exact target lines first. Ensure replacements are exact, minimal drop-in deltas.

### B. Concise, Clean, & DRY Architecture
- **Zero Duplicate Event Listeners**:
  - Never attach multiple click/change listeners to the same element across different modules.
  - For critical submission triggers (e.g., `#btn-create-sched`, `#input-excel-jadwal`, `#form-tambah-siswa`), use single handlers with idempotent locks (e.g., `window.isSaving...` flags).
  - Always clean up asynchronous button states (reset spinner and `disabled = false`) in a guaranteed `finally { ... }` block.
- **Design System Fidelity**:
  - Always reuse CSS variables defined in `:root` (`--color-primary`, `--color-secondary-dark`, `--border-color`, `--bg-card`, etc.).
  - Do not introduce arbitrary inline styles when shared utility classes or CSS variables exist.
  - Never touch or break the responsive mobile drawer rules at the bottom of `css/dashboard.css`.

### C. System Architecture Map Awareness
- **Consult `PROJECT_MAP.md` First**:
  - Before modifying any view switching logic, menu navigation, or role permission, inspect `PROJECT_MAP.md`.
  - Ensure every `data-view="X"` in `.sidebar-menu` has a corresponding `<section id="view-X">` in `dashboard.html`.
  - Maintain the dual-view resolution pattern:
    - Staff (`admin`, `manager`, `founder`, `guru`) -> `#view-kehadiran-guru`
    - Student (`siswa`) -> `#view-kehadiran-siswa`
    - Staff -> `#view-data-siswa` (via `#menu-report`)
    - Guru / Siswa -> `#view-rapor` (via `#menu-report`)

---

## 2. Mandatory Pre-Flight & Post-Flight Verification

### Pre-Flight (Before Modifying Code)
1. Read the target lines and surrounding context using `read_file` or exact pattern matching.
2. Check caller references across `dashboard.html`, `js/dashboard/`, and `python/routes/`.
3. Confirm if the function is exposed on `window` (for backward-compatible inline `onclick` handlers in HTML).

### Post-Flight (After Every Modification)
Every modification MUST immediately be validated by running the verification suite:
```powershell
# 1. Validate JavaScript AST balance, try-catch safety, and top-level exports
py check_syntax.py js

# 2. Validate HTML view integrity, role-based sidebar permissions, and anti-regression rules
py check_regression.py

# 3. If Python backend files were edited, ensure zero bytecode compilation errors
py -m compileall python/
```
If any check fails, resolve it immediately before reporting progress.

---

## 3. Role-Based Permission Matrix Guardrails

| Sidebar Item ID | `data-view` | Admin | Manager | Founder | Guru | Siswa |
|---|---|:---:|:---:|:---:|:---:|:---:|
| `#menu-dashboard` | `ringkasan` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `#menu-manajemen-jadwal` | `manajemen-jadwal` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `#menu-schedule` | `jadwal` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `#menu-kehadiran` | `kehadiran` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `#menu-manajemen-kelas` | `manajemen-kelas` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `#menu-akun-siswa` | `akun-siswa` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `#menu-report` | `data-siswa` / `rapor` | ✅ (data-siswa) | ✅ (data-siswa) | ✅ (data-siswa) | ✅ (rapor) | ✅ (rapor) |
| `#menu-data-alumni` | `data-alumni` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `#menu-akun-guru` | `akun-guru` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `#menu-data-guru` | `data-guru` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `#menu-data-diri` | `data-diri` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `#menu-my-idcard` | `my-idcard` | ❌ | ❌ | ❌ | ✅ | ✅ |

*Note: For Alumni accounts (`status_siswa === 'alumni'`), `#menu-my-idcard` is hidden, and celebratory graduation banners with Google Drive certificate links are displayed on `#ringkasan-siswa` and `#view-rapor`.*

---

## 4. Obra / Superpowers Methodology Rules
1. **Evidence-Based Reasoning**: Do not assume; verify by inspecting live source code and database schemas.
2. **Deterministic Outputs**: Ensure all automated checks exit with code `0`.
3. **No Unfinished Tasks**: Complete all connected layers (database schema -> backend route -> API client -> UI rendering -> DOM listeners).
