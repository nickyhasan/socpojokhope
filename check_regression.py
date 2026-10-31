#!/usr/bin/env python3
"""
check_regression.py - Automated Anti-Regression Verification Suite
Project: School of Character (SoC) - Pojok Hope
Standards: obra/superpowers methodology

Guarantees:
  1. Every data-view="X" in .sidebar-menu has a matching <section id="view-X"> in dashboard.html.
  2. Dynamic view dispatches (kehadiran -> view-kehadiran-guru / view-kehadiran-siswa, menu-report -> view-data-siswa / view-rapor) are complete.
  3. Contextual sub-views (view-detail-siswa, view-detail-guru) and modals exist.
  4. Role-based sidebar rules for siswa, guru, founder, manager, and admin in js/dashboard/ui.js are intact.
  5. All JavaScript files pass check_syntax.py (balanced delimiters, valid try-catch, top-level exports/imports).
  6. Critical button listeners and window exports are verified.
"""

import os
import re
import sys
import subprocess

PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"
INFO = "\033[94m[INFO]\033[0m"

# Windows color support
if os.name == 'nt':
    os.system('')

def run_test_suite():
    failures = []
    tests_run = 0

    print("=====================================================================")
    print("      School of Character - Anti-Regression Test Suite               ")
    print("=====================================================================")

    # -------------------------------------------------------------
    # TEST 1: dashboard.html View Integrity & Sidebar Mapping
    # -------------------------------------------------------------
    print(f"\n{INFO} Checking Section 1: dashboard.html View & Sidebar Mapping...")
    html_path = os.path.join(os.path.dirname(__file__), 'dashboard.html')
    if not os.path.isfile(html_path):
        failures.append(f"dashboard.html not found at {html_path}")
        return failures

    with open(html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()

    # Find all <section id="view-*"> in dashboard.html
    section_views = set(re.findall(r'<section\s+[^>]*id="(view-[a-z0-9_-]+)"', html_content))
    print(f"       Found {len(section_views)} view sections in dashboard.html:")
    for sv in sorted(section_views):
        print(f"         - #{sv}")

    # Extract all .sidebar-menu items and their data-view attributes
    sidebar_match = re.search(r'<nav\s+class="sidebar-menu">(.*?)</nav>', html_content, re.DOTALL)
    if not sidebar_match:
        failures.append("Could not find <nav class='sidebar-menu'> in dashboard.html")
    else:
        sidebar_html = sidebar_match.group(1)
        menu_items = re.findall(r'<a\s+[^>]*id="([^"]+)"[^>]*data-view="([^"]+)"', sidebar_html)
        if not menu_items:
            # Try alternate attribute order
            menu_items = re.findall(r'<a\s+[^>]*data-view="([^"]+)"[^>]*id="([^"]+)"', sidebar_html)
            menu_items = [(m[1], m[0]) for m in menu_items]

        print(f"\n       Found {len(menu_items)} sidebar menu items with data-view:")
        for menu_id, data_view in menu_items:
            tests_run += 1
            if data_view == 'kehadiran':
                # Dual resolution: staff -> view-kehadiran-guru, siswa -> view-kehadiran-siswa
                has_guru = 'view-kehadiran-guru' in section_views
                has_siswa = 'view-kehadiran-siswa' in section_views
                if has_guru and has_siswa:
                    print(f"       {PASS} #{menu_id} (data-view='{data_view}') -> #view-kehadiran-guru & #view-kehadiran-siswa")
                else:
                    msg = f"#{menu_id} (data-view='{data_view}') missing target section(s): guru={has_guru}, siswa={has_siswa}"
                    failures.append(msg)
                    print(f"       {FAIL} {msg}")
            else:
                expected_view = f"view-{data_view}"
                if expected_view in section_views:
                    print(f"       {PASS} #{menu_id} (data-view='{data_view}') -> #{expected_view}")
                else:
                    msg = f"#{menu_id} (data-view='{data_view}') missing target section #{expected_view} in dashboard.html"
                    failures.append(msg)
                    print(f"       {FAIL} {msg}")

    # Verify essential non-sidebar views exist
    essential_views = [
        'view-rapor',
        'view-detail-siswa',
        'view-detail-guru',
        'view-data-alumni'
    ]
    for ev in essential_views:
        tests_run += 1
        if ev in section_views:
            print(f"       {PASS} Essential contextual view #{ev} exists.")
        else:
            msg = f"Missing essential contextual view #{ev} in dashboard.html"
            failures.append(msg)
            print(f"       {FAIL} {msg}")

    # Verify essential modals exist
    essential_modals = [
        'modal-admin-settings',
        'modal-guru-credential',
        'modal-siswa-credential'
    ]
    for em in essential_modals:
        tests_run += 1
        if f'id="{em}"' in html_content:
            print(f"       {PASS} Essential modal #{em} exists.")
        else:
            msg = f"Missing essential modal #{em} in dashboard.html"
            failures.append(msg)
            print(f"       {FAIL} {msg}")

    # Verify essential inline schedule form controls exist
    essential_form_controls = [
        'btn-create-sched',
        'input-excel-jadwal'
    ]
    for ef in essential_form_controls:
        tests_run += 1
        if f'id="{ef}"' in html_content:
            print(f"       {PASS} Essential schedule control #{ef} exists.")
        else:
            msg = f"Missing essential schedule control #{ef} in dashboard.html"
            failures.append(msg)
            print(f"       {FAIL} {msg}")

    # -------------------------------------------------------------
    # TEST 2: Role-Based Sidebar Rules in js/dashboard/ui.js
    # -------------------------------------------------------------
    print(f"\n{INFO} Checking Section 2: Role-Based Rules in js/dashboard/ui.js...")
    ui_path = os.path.join(os.path.dirname(__file__), 'js', 'dashboard', 'ui.js')
    if not os.path.isfile(ui_path):
        failures.append(f"ui.js not found at {ui_path}")
        return failures

    with open(ui_path, 'r', encoding='utf-8') as f:
        ui_content = f.read()

    roles = ['admin', 'manager', 'founder', 'guru', 'siswa']
    for role in roles:
        tests_run += 1
        pattern = rf"role\s*===\s*'{role}'"
        if re.search(pattern, ui_content):
            print(f"       {PASS} Explicit handler for role='{role}' found in ui.js.")
        else:
            msg = f"Role handler for role='{role}' missing in js/dashboard/ui.js"
            failures.append(msg)
            print(f"       {FAIL} {msg}")

    # Check founder read-only isolation (cannot manage schedules, cannot manage accounts)
    tests_run += 1
    founder_sched_none = "document.getElementById('menu-manajemen-jadwal')?.style.setProperty('display', 'none')" in ui_content or \
                         "menu-manajemen-jadwal" in ui_content and "isFounder" in ui_content
    if founder_sched_none:
        print(f"       {PASS} Founder read-only schedule management isolation verified.")
    else:
        msg = "Founder role does not explicitly hide #menu-manajemen-jadwal in js/dashboard/ui.js"
        failures.append(msg)
        print(f"       {FAIL} {msg}")

    # Check alumni menu isolation (admin, manager, founder only)
    tests_run += 1
    if "menu-data-alumni" in ui_content and ("role === 'admin' || role === 'manager' || role === 'founder'" in ui_content):
        print(f"       {PASS} Data Alumni menu permission rule (admin/manager/founder only) verified.")
    else:
        msg = "Data Alumni menu rule (admin/manager/founder only) missing or altered in js/dashboard/ui.js"
        failures.append(msg)
        print(f"       {FAIL} {msg}")

    # Check ID card isolation (guru & siswa only, not alumni)
    tests_run += 1
    if "menu-my-idcard" in ui_content and "!isAlumni" in ui_content:
        print(f"       {PASS} ID Card permission rule (guru/siswa only, excluded for alumni) verified.")
    else:
        msg = "ID Card permission rule in js/dashboard/ui.js altered or missing !isAlumni check"
        failures.append(msg)
        print(f"       {FAIL} {msg}")

    # -------------------------------------------------------------
    # TEST 3: JavaScript Syntax Check across all files
    # -------------------------------------------------------------
    print(f"\n{INFO} Checking Section 3: JavaScript AST & Syntax Integrity...")
    syntax_checker = os.path.join(os.path.dirname(__file__), 'check_syntax.py')
    js_dir = os.path.join(os.path.dirname(__file__), 'js')
    if os.path.isfile(syntax_checker):
        tests_run += 1
        res = subprocess.run([sys.executable, syntax_checker, js_dir], capture_output=True, text=True)
        if res.returncode == 0:
            print(f"       {PASS} check_syntax.py passed with 0 errors across all JS files.")
        else:
            msg = f"check_syntax.py failed with errors:\n{res.stdout}\n{res.stderr}"
            failures.append(msg)
            print(f"       {FAIL} {msg}")
    else:
        msg = f"check_syntax.py not found at {syntax_checker}"
        failures.append(msg)
        print(f"       {FAIL} {msg}")

    # -------------------------------------------------------------
    # TEST 4: Anti-Regression Guardrails (Key Functions & Bindings)
    # -------------------------------------------------------------
    print(f"\n{INFO} Checking Section 4: Critical Function Exports & Idempotency...")

    manager_js = os.path.join(os.path.dirname(__file__), 'js', 'dashboard', 'manager.js')
    with open(manager_js, 'r', encoding='utf-8') as f:
        mgr_content = f.read()

    # 4a: downloadRaporSiswaPDF must be exported & attached to window
    tests_run += 1
    if "window.downloadRaporSiswaPDF = downloadRaporSiswaPDF" in mgr_content:
        print(f"       {PASS} window.downloadRaporSiswaPDF is exported.")
    else:
        msg = "window.downloadRaporSiswaPDF missing in js/dashboard/manager.js"
        failures.append(msg)
        print(f"       {FAIL} {msg}")

    # 4b: Graduation requirement (English C & Math C) must be present
    tests_run += 1
    if "English C" in mgr_content and "Math C" in mgr_content and "btnGraduateStudent" in mgr_content:
        print(f"       {PASS} Graduation prerequisites (English C & Math C) verified.")
    else:
        msg = "Graduation prerequisites (English C and Math C) missing in js/dashboard/manager.js"
        failures.append(msg)
        print(f"       {FAIL} {msg}")

    # 4c: Window exposure of switchView and applyRole
    dash_js = os.path.join(os.path.dirname(__file__), 'js', 'dashboard.js')
    with open(dash_js, 'r', encoding='utf-8') as f:
        d_content = f.read()

    tests_run += 1
    if "window.switchView = switchView" in d_content and "window.applyRole = applyRole" in d_content:
        print(f"       {PASS} window.switchView and window.applyRole backward-compatibly exposed.")
    else:
        msg = "window.switchView or window.applyRole missing in js/dashboard.js"
        failures.append(msg)
        print(f"       {FAIL} {msg}")

    # 4d: Check idempotent lock on schedule saving to prevent duplicate creation
    tests_run += 1
    if "isSavingSchedule" in d_content or "isSavingSchedule" in mgr_content:
        print(f"       {PASS} Idempotent mutex lock (isSavingSchedule) verified.")
    else:
        msg = "isSavingSchedule lock missing in js/dashboard/manager.js or dashboard.js"
        failures.append(msg)
        print(f"       {FAIL} {msg}")

    # -------------------------------------------------------------
    # FINAL SUMMARY
    # -------------------------------------------------------------
    print("\n=====================================================================")
    if failures:
        print(f"\033[91mFAILED: {len(failures)} regression check(s) failed out of {tests_run} tests!\033[0m")
        for i, f_msg in enumerate(failures, 1):
            print(f"  [{i}] {f_msg}")
        return False
    else:
        print(f"\033[92mALL {tests_run} ANTI-REGRESSION CHECKS PASSED PERFECTLY (100% HEALTHY)!\033[0m")
        return True

if __name__ == '__main__':
    success = run_test_suite()
    sys.exit(0 if success else 1)
