#!/usr/bin/env python3
"""
check_syntax.py
Validates JavaScript syntax for ES6 modular code:
1. Tracks curly-brace depth character-by-character, ignoring strings, comments, and template literals.
2. Enforces that all `export` and `import` declarations occur strictly at top-level scope (depth == 0).
3. Ensures all blocks are properly closed at end of file (final depth == 0).
"""

import os
import sys

def check_js_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    errors = []
    line = 1
    col = 0
    depth = 0

    in_squote = False
    in_dquote = False
    in_template = False
    in_line_comment = False
    in_block_comment = False
    escape = False

    # Stack of brace depths where template literal expressions ${...} began
    template_expr_stack = []

    # To distinguish regex literals from division
    # Previous non-whitespace token or character
    last_sig_char = ''

    i = 0
    n = len(content)

    while i < n:
        c = content[i]
        col += 1

        if c == '\n':
            line += 1
            col = 0
            if in_line_comment:
                in_line_comment = False
            i += 1
            continue

        # Handle comments
        if in_line_comment:
            i += 1
            continue

        if in_block_comment:
            if c == '*' and i + 1 < n and content[i + 1] == '/':
                in_block_comment = False
                i += 2
                col += 1
                last_sig_char = '/'
                continue
            i += 1
            continue

        # Handle single-quoted string
        if in_squote:
            if escape:
                escape = False
            elif c == '\\':
                escape = True
            elif c == "'":
                in_squote = False
                last_sig_char = "'"
            i += 1
            continue

        # Handle double-quoted string
        if in_dquote:
            if escape:
                escape = False
            elif c == '\\':
                escape = True
            elif c == '"':
                in_dquote = False
                last_sig_char = '"'
            i += 1
            continue

        # Handle template literal
        if in_template:
            if escape:
                escape = False
            elif c == '\\':
                escape = True
            elif c == '`':
                in_template = False
                last_sig_char = '`'
            elif c == '$' and i + 1 < n and content[i + 1] == '{':
                template_expr_stack.append(depth)
                depth += 1
                in_template = False
                i += 2
                col += 1
                last_sig_char = '{'
                continue
            i += 1
            continue

        # Check for start of comments
        if c == '/' and i + 1 < n:
            if content[i + 1] == '/':
                in_line_comment = True
                i += 2
                col += 1
                continue
            elif content[i + 1] == '*':
                in_block_comment = True
                i += 2
                col += 1
                continue

        # Check for start of strings
        if c == "'":
            in_squote = True
            escape = False
            i += 1
            continue
        if c == '"':
            in_dquote = True
            escape = False
            i += 1
            continue
        if c == '`':
            in_template = True
            escape = False
            i += 1
            continue

        # Handle regex literals (e.g. /pattern/flags)
        if c == '/' and last_sig_char in ('(', '=', ':', ',', '[', '!', '&', '|', '?', ';', '{', '}', '\n', ''):
            # Scan regex literal until unescaped /
            i += 1
            col += 1
            reg_escape = False
            in_reg_class = False
            while i < n:
                rc = content[i]
                if rc == '\n':
                    # Unterminated regex
                    break
                col += 1
                if reg_escape:
                    reg_escape = False
                elif rc == '\\':
                    reg_escape = True
                elif rc == '[' and not in_reg_class:
                    in_reg_class = True
                elif rc == ']' and in_reg_class:
                    in_reg_class = False
                elif rc == '/' and not in_reg_class:
                    last_sig_char = '/'
                    i += 1
                    break
                i += 1
            continue

        # Track braces
        if c == '{':
            depth += 1
            last_sig_char = '{'
            i += 1
            continue
        elif c == '}':
            if depth <= 0:
                errors.append(f"{filepath}:{line}:{col}: SyntaxError: Unexpected closing brace '}}' at depth {depth}")
            depth = max(0, depth - 1)
            last_sig_char = '}'

            # Check if this closes a template literal interpolation ${...}
            if template_expr_stack and depth == template_expr_stack[-1]:
                template_expr_stack.pop()
                in_template = True

            i += 1
            continue

        # Check for export keyword
        if content[i:i+6] == 'export':
            prev_ok = (i == 0 or not (content[i-1].isalnum() or content[i-1] in ('_', '$')))
            next_ok = (i + 6 == n or not (content[i+6].isalnum() or content[i+6] in ('_', '$')))
            if prev_ok and next_ok:
                if depth != 0:
                    errors.append(
                        f"{filepath}:{line}:{col}: SyntaxError: Unexpected token 'export' at brace depth {depth}. "
                        f"'export' declarations must be at top-level scope (depth 0)."
                    )

        # Check for import keyword (excluding dynamic import(...))
        if content[i:i+6] == 'import':
            prev_ok = (i == 0 or not (content[i-1].isalnum() or content[i-1] in ('_', '$')))
            next_ok = (i + 6 == n or not (content[i+6].isalnum() or content[i+6] in ('_', '$')))
            if prev_ok and next_ok:
                # Check next non-whitespace char to rule out import(...)
                j = i + 6
                while j < n and content[j] in (' ', '\t', '\r', '\n'):
                    j += 1
                is_dynamic = (j < n and content[j] == '(')
                if not is_dynamic:
                    if depth != 0:
                        errors.append(
                            f"{filepath}:{line}:{col}: SyntaxError: Unexpected token 'import' at brace depth {depth}. "
                            f"'import' declarations must be at top-level scope (depth 0)."
                        )

        if not c.isspace():
            last_sig_char = c

        i += 1

    if depth != 0:
        errors.append(f"{filepath}: SyntaxError: Unclosed block(s). Final brace depth is {depth} (expected 0).")

    return errors

def main():
    target_dir = sys.argv[1] if len(sys.argv) > 1 else 'js'
    all_errors = []
    scanned_files = 0

    if os.path.isfile(target_dir):
        files_to_check = [target_dir]
    else:
        files_to_check = []
        for root, _, files in os.walk(target_dir):
            for file in files:
                if file.endswith('.js'):
                    files_to_check.append(os.path.join(root, file))

    files_to_check.sort()
    for fp in files_to_check:
        scanned_files += 1
        errs = check_js_file(fp)
        if errs:
            all_errors.extend(errs)

    print(f"=== JavaScript Syntax Check ===")
    print(f"Scanned {scanned_files} file(s) in '{target_dir}'.")
    if all_errors:
        print(f"\nFAILED: Found {len(all_errors)} syntax error(s):")
        for err in all_errors:
            print("  [ERROR] " + err)
        sys.exit(1)
    else:
        print("\nPASSED: All files have balanced braces and top-level export/import declarations!")
        sys.exit(0)

if __name__ == '__main__':
    main()
