#!/usr/bin/env python3
"""
check_syntax.py
Validates JavaScript syntax for ES6 modular code:
1. Tracks braces {}, parentheses (), and brackets [] balance, ignoring strings, comments, and template literals.
2. Tracks `try` blocks and verifies that every `try { ... }` block is immediately followed by `catch` or `finally` at the same brace depth.
3. Enforces that all `export` and `import` declarations occur strictly at top-level scope (depth == 0).
4. Ensures all blocks are properly closed at end of file (final depth == 0).
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

    template_expr_stack = []

    # Stack for delimiters: ('(', line, col), ('[', line, col), ('{', line, col)
    paren_stack = []
    bracket_stack = []
    brace_stack = []

    # Try block tracking stack
    try_stack = []

    last_sig_token = ''
    i = 0
    n = len(content)

    def is_word_char(ch):
        return ch.isalnum() or ch in ('_', '$')

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

        if in_line_comment:
            i += 1
            continue

        if in_block_comment:
            if c == '*' and i + 1 < n and content[i + 1] == '/':
                in_block_comment = False
                i += 2
                col += 1
                last_sig_token = '/'
                continue
            i += 1
            continue

        if in_squote:
            if escape:
                escape = False
            elif c == '\\':
                escape = True
            elif c == "'":
                in_squote = False
                last_sig_token = "'"
            i += 1
            continue

        if in_dquote:
            if escape:
                escape = False
            elif c == '\\':
                escape = True
            elif c == '"':
                in_dquote = False
                last_sig_token = '"'
            i += 1
            continue

        if in_template:
            if escape:
                escape = False
            elif c == '\\':
                escape = True
            elif c == '`':
                in_template = False
                last_sig_token = '`'
            elif c == '$' and i + 1 < n and content[i + 1] == '{':
                template_expr_stack.append(depth)
                depth += 1
                brace_stack.append(('{', line, col))
                in_template = False
                i += 2
                col += 1
                last_sig_token = '{'
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
        if c == '/' and last_sig_token in ('(', '=', ':', ',', '[', '!', '&', '|', '?', ';', '{', '}', '\n', ''):
            i += 1
            col += 1
            reg_escape = False
            in_reg_class = False
            while i < n:
                rc = content[i]
                if rc == '\n':
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
                    last_sig_token = '/'
                    i += 1
                    break
                i += 1
            continue

        # Skip whitespace
        if c.isspace():
            i += 1
            continue

        # Check word tokens (identifiers / keywords)
        if is_word_char(c):
            start_i = i
            start_col = col
            while i < n and is_word_char(content[i]):
                i += 1
                col += 1
            word = content[start_i:i]
            col -= 1

            # If preceded by dot or optional dot, word is a property/method (e.g. promise.catch())
            if last_sig_token in ('.', '?.') or (i < n and content[i] == ':' and depth > 0 and last_sig_token in ('{', ',')):
                last_sig_token = word
                continue

            # Handle try_stack states with this word
            while try_stack and try_stack[-1]['state'] == 'WAIT_OPTIONAL_FINALLY':
                if word == 'finally':
                    break
                else:
                    try_stack.pop()

            if word == 'finally':
                if try_stack and try_stack[-1]['state'] in ('WAIT_OPTIONAL_FINALLY', 'WAIT_CATCH_OR_FINALLY'):
                    try_stack[-1]['state'] = 'WAIT_FINALLY_BRACE'
                else:
                    errors.append(f"{filepath}:{line}:{start_col}: SyntaxError: Unexpected token 'finally'")
                last_sig_token = 'finally'
                continue

            if word == 'catch':
                if try_stack and try_stack[-1]['state'] == 'WAIT_CATCH_OR_FINALLY':
                    try_stack[-1]['state'] = 'WAIT_CATCH_BRACE_OR_PARAMS'
                else:
                    errors.append(f"{filepath}:{line}:{start_col}: SyntaxError: Unexpected token 'catch'")
                last_sig_token = 'catch'
                continue

            if try_stack:
                top_try = try_stack[-1]
                if top_try['state'] == 'WAIT_CATCH_OR_FINALLY':
                    errors.append(
                        f"{filepath}:{top_try['try_line']}:{top_try['try_col']}: SyntaxError: "
                        f"Missing catch or finally after try (found unexpected '{word}' at line {line}:{start_col})"
                    )
                    try_stack.pop()
                elif top_try['state'] == 'WAIT_TRY_BRACE':
                    errors.append(
                        f"{filepath}:{top_try['try_line']}:{top_try['try_col']}: SyntaxError: "
                        f"Expected '{{' after 'try' (found '{word}' at line {line}:{start_col})"
                    )
                    try_stack.pop()
                elif top_try['state'] == 'WAIT_CATCH_BRACE':
                    errors.append(
                        f"{filepath}:{top_try['try_line']}:{top_try['try_col']}: SyntaxError: "
                        f"Expected '{{' after 'catch' (found '{word}' at line {line}:{start_col})"
                    )
                    try_stack.pop()
                elif top_try['state'] == 'WAIT_FINALLY_BRACE':
                    errors.append(
                        f"{filepath}:{top_try['try_line']}:{top_try['try_col']}: SyntaxError: "
                        f"Expected '{{' after 'finally' (found '{word}' at line {line}:{start_col})"
                    )
                    try_stack.pop()

            if word == 'try':
                try_stack.append({
                    'try_line': line,
                    'try_col': start_col,
                    'depth': None,
                    'state': 'WAIT_TRY_BRACE'
                })

            if word == 'export':
                if depth != 0:
                    errors.append(
                        f"{filepath}:{line}:{start_col}: SyntaxError: Unexpected token 'export' at brace depth {depth}. "
                        f"'export' declarations must be at top-level scope (depth 0)."
                    )

            if word == 'import':
                # Check for dynamic import(...)
                j = i
                while j < n and content[j].isspace():
                    j += 1
                is_dynamic = (j < n and content[j] == '(')
                if not is_dynamic and depth != 0:
                    errors.append(
                        f"{filepath}:{line}:{start_col}: SyntaxError: Unexpected token 'import' at brace depth {depth}. "
                        f"'import' declarations must be at top-level scope (depth 0)."
                    )

            last_sig_token = word
            continue

        # Non-word tokens
        while try_stack and try_stack[-1]['state'] == 'WAIT_OPTIONAL_FINALLY':
            try_stack.pop()

        if c == '(':
            if try_stack and try_stack[-1]['state'] == 'WAIT_CATCH_BRACE_OR_PARAMS':
                try_stack[-1]['state'] = 'IN_CATCH_PARAMS'
                try_stack[-1]['catch_paren_depth'] = len(paren_stack) + 1
            paren_stack.append(('(', line, col))
            last_sig_token = '('
            i += 1
            continue

        elif c == ')':
            if not paren_stack:
                errors.append(f"{filepath}:{line}:{col}: SyntaxError: Unexpected closing parenthesis ')'")
            else:
                paren_stack.pop()
                if try_stack and try_stack[-1]['state'] == 'IN_CATCH_PARAMS':
                    if len(paren_stack) == try_stack[-1]['catch_paren_depth'] - 1:
                        try_stack[-1]['state'] = 'WAIT_CATCH_BRACE'
            last_sig_token = ')'
            i += 1
            continue

        elif c == '[':
            bracket_stack.append(('[', line, col))
            last_sig_token = '['
            i += 1
            continue

        elif c == ']':
            if not bracket_stack:
                errors.append(f"{filepath}:{line}:{col}: SyntaxError: Unexpected closing bracket ']'")
            else:
                bracket_stack.pop()
            last_sig_token = ']'
            i += 1
            continue

        elif c == '{':
            depth += 1
            brace_stack.append(('{', line, col))

            if try_stack:
                top_try = try_stack[-1]
                if top_try['state'] == 'WAIT_TRY_BRACE':
                    top_try['depth'] = depth
                    top_try['state'] = 'IN_TRY'
                elif top_try['state'] in ('WAIT_CATCH_BRACE_OR_PARAMS', 'WAIT_CATCH_BRACE'):
                    top_try['depth'] = depth
                    top_try['state'] = 'IN_CATCH'
                elif top_try['state'] == 'WAIT_FINALLY_BRACE':
                    top_try['depth'] = depth
                    top_try['state'] = 'IN_FINALLY'

            last_sig_token = '{'
            i += 1
            continue

        elif c == '}':
            if not brace_stack:
                errors.append(f"{filepath}:{line}:{col}: SyntaxError: Unexpected closing brace '}}' at depth {depth}")
            else:
                brace_stack.pop()

            if try_stack:
                top_try = try_stack[-1]
                if top_try['state'] == 'IN_TRY' and depth == top_try['depth']:
                    top_try['state'] = 'WAIT_CATCH_OR_FINALLY'
                elif top_try['state'] == 'IN_CATCH' and depth == top_try['depth']:
                    top_try['state'] = 'WAIT_OPTIONAL_FINALLY'
                elif top_try['state'] == 'IN_FINALLY' and depth == top_try['depth']:
                    try_stack.pop()

            depth = max(0, depth - 1)

            # Check if this closes a template literal interpolation ${...}
            if template_expr_stack and depth == template_expr_stack[-1]:
                template_expr_stack.pop()
                in_template = True

            last_sig_token = '}'
            i += 1
            continue

        # Other symbols like ;, ,, =, etc.
        if try_stack:
            top_try = try_stack[-1]
            if top_try['state'] == 'WAIT_CATCH_OR_FINALLY':
                errors.append(
                    f"{filepath}:{top_try['try_line']}:{top_try['try_col']}: SyntaxError: "
                    f"Missing catch or finally after try (found unexpected '{c}' at line {line}:{col})"
                )
                try_stack.pop()

        last_sig_token = c
        i += 1

    # End of file checks
    while try_stack and try_stack[-1]['state'] == 'WAIT_OPTIONAL_FINALLY':
        try_stack.pop()

    for item in try_stack:
        errors.append(
            f"{filepath}:{item['try_line']}:{item['try_col']}: SyntaxError: "
            f"Missing catch or finally after try (state: {item['state']})"
        )

    if paren_stack:
        for p in paren_stack:
            errors.append(f"{filepath}:{p[1]}:{p[2]}: SyntaxError: Unclosed parenthesis '('")

    if bracket_stack:
        for b in bracket_stack:
            errors.append(f"{filepath}:{b[1]}:{b[2]}: SyntaxError: Unclosed bracket '['")

    if brace_stack:
        for br in brace_stack:
            errors.append(f"{filepath}:{br[1]}:{br[2]}: SyntaxError: Unclosed brace '{{'")

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
        print("\nPASSED: All files have balanced braces, delimiters, valid try-catch blocks, and top-level export/import declarations!")
        sys.exit(0)

if __name__ == '__main__':
    main()
