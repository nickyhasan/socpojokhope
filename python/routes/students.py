import datetime
from flask import Blueprint, request, jsonify

try:
    from database import get_db, get_db_connection, normalize_short_class_name
except ImportError:
    from ..database import get_db, get_db_connection, normalize_short_class_name

students_bp = Blueprint('students', __name__)

def generate_student_nis(cursor, birth_date):
    """
    Generates NIS: YY (2-digit year) + MMDD (birth date) + NNN (sequential 3-digit number).
    """
    now = datetime.datetime.now()
    yy = str(now.year)[-2:]
    mmdd = "0101"
    if birth_date:
        try:
            if isinstance(birth_date, str):
                parts = birth_date.strip().split('-')
                if len(parts) == 3:
                    mmdd = f"{int(parts[1]):02d}{int(parts[2]):02d}"
                else:
                    d_parts = birth_date.strip().split('/')
                    if len(d_parts) == 3:
                        mmdd = f"{int(d_parts[1]):02d}{int(d_parts[0]):02d}"
            elif isinstance(birth_date, (datetime.date, datetime.datetime)):
                mmdd = f"{birth_date.month:02d}{birth_date.day:02d}"
        except Exception:
            mmdd = "0101"

    cursor.execute("SELECT nis FROM students WHERE nis LIKE %s", (f"{yy}%",))
    rows = cursor.fetchall()
    existing_nums = []
    for r in rows:
        val = str(r[0] if isinstance(r, (tuple, list)) else r.get('nis', '')).strip()
        if len(val) >= 9 and val[:2] == yy:
            try:
                existing_nums.append(int(val[-3:]))
            except ValueError:
                pass
    next_num = (max(existing_nums) + 1) if existing_nums else 1
    new_nis = f"{yy}{mmdd}{str(next_num).zfill(3)}"
    while True:
        cursor.execute("SELECT COUNT(*) FROM students WHERE nis = %s", (new_nis,))
        cnt_row = cursor.fetchone()
        cnt = cnt_row[0] if isinstance(cnt_row, (tuple, list)) else (cnt_row.get('COUNT(*)', 0) if isinstance(cnt_row, dict) else 0)
        if cnt == 0:
            break
        next_num += 1
        new_nis = f"{yy}{mmdd}{str(next_num).zfill(3)}"
    return new_nis

@students_bp.route('/api/students', methods=['GET'])
def get_students():
    """
    GET /api/students?kelas=English A (Foundation)
    Fetches student list mapped to the 2027 schema, optionally filtered by class level.
    """
    kelas = request.args.get('kelas') or request.args.get('class')
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        if kelas:
            query = """
                SELECT s.id, s.nis, s.full_name, s.nickname, s.gender, s.birth_place, s.birth_date, s.parents_name, 
                       s.student_phone, s.parent_phone, s.kelas_english, s.kelas_math, s.photo_url, s.created_at,
                       u.password
                FROM students s
                LEFT JOIN users u ON (u.student_id = s.id OR u.id = s.nis)
                WHERE UPPER(s.kelas_english) = %s OR UPPER(s.kelas_math) = %s
                ORDER BY s.full_name ASC
            """
            cursor.execute(query, (kelas.upper(), kelas.upper()))
        else:
            query = """
                SELECT s.id, s.nis, s.full_name, s.nickname, s.gender, s.birth_place, s.birth_date, s.parents_name, 
                       s.student_phone, s.parent_phone, s.kelas_english, s.kelas_math, s.photo_url, s.created_at,
                       u.password
                FROM students s
                LEFT JOIN users u ON (u.student_id = s.id OR u.id = s.nis)
                ORDER BY s.full_name ASC
            """
            cursor.execute(query)

        if hasattr(cursor, 'description') and cursor.description:
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            raw_students = rows if rows and isinstance(rows[0], dict) else [dict(zip(columns, row)) for row in rows]
            students = [
                s for s in raw_students 
                if str(s.get('nis') or '').strip() not in ('0025001', '1001001') 
                and str(s.get('id') or '').strip() not in ('0025001', '1001001')
            ]
            for s in students:
                if isinstance(s.get('birth_date'), (datetime.date, datetime.datetime)):
                    s['birth_date'] = s['birth_date'].isoformat()
                if isinstance(s.get('created_at'), (datetime.date, datetime.datetime)):
                    s['created_at'] = s['created_at'].isoformat()

                s['nis'] = str(s.get('nis') or '').strip()
                raw_g = str(s.get('gender') or '').strip().upper()
                if raw_g.startswith('P') or 'PEREMPUAN' in raw_g:
                    s['gender'] = 'P'
                elif raw_g.startswith('L') or 'LAKI' in raw_g:
                    s['gender'] = 'L'
                else:
                    s['gender'] = raw_g or '-'

                s['kelas_english'] = str(s.get('kelas_english') or 'Belum Ditentukan').strip()
                s['kelas_math'] = str(s.get('kelas_math') or 'Belum Ditentukan').strip()
                s['photo_url'] = s.get('photo_url') or ''
                s['password'] = s.get('password') or (f"SoC{s['nis'][-4:]}" if len(s['nis']) >= 4 else 'password123')
                s['password_display'] = s['password']
        else:
            students = []

        cursor.close()
        return jsonify(students), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if connection and hasattr(connection, 'close'):
            connection.close()

@students_bp.route('/api/students/<int:student_id>', methods=['GET'])
def get_student(student_id):
    """
    GET /api/students/<int:student_id>
    Fetches single student record along with user account info.
    """
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        query = """
            SELECT s.id, s.nis, s.full_name, s.nickname, s.gender, s.birth_place, s.birth_date, s.parents_name, 
                   s.student_phone, s.parent_phone, s.kelas_english, s.kelas_math, s.photo_url, s.created_at,
                   u.password, u.username
            FROM students s
            LEFT JOIN users u ON (u.student_id = s.id OR u.id = s.nis)
            WHERE s.id = %s
            LIMIT 1
        """
        cursor.execute(query, (student_id,))
        row = cursor.fetchone()
        cursor.close()

        if not row:
            return jsonify({"error": "Siswa tidak ditemukan."}), 404

        s = row if isinstance(row, dict) else dict(zip([desc[0] for desc in cursor.description], row))
        if isinstance(s.get('birth_date'), (datetime.date, datetime.datetime)):
            s['birth_date'] = s['birth_date'].isoformat()
        if isinstance(s.get('created_at'), (datetime.date, datetime.datetime)):
            s['created_at'] = s['created_at'].isoformat()

        s['nis'] = str(s.get('nis') or '').strip()
        s['kelas_english'] = str(s.get('kelas_english') or 'Belum Ditentukan').strip()
        s['kelas_math'] = str(s.get('kelas_math') or 'Belum Ditentukan').strip()
        s['photo_url'] = s.get('photo_url') or ''
        s['password'] = s.get('password') or (f"SoC{s['nis'][-4:]}" if len(s['nis']) >= 4 else 'password123')
        s['password_display'] = s['password']

        return jsonify(s), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if connection and hasattr(connection, 'close'):
            connection.close()

@students_bp.route('/api/students/<int:student_id>', methods=['PUT'])
def update_student(student_id):
    """
    PUT /api/students/<int:student_id>
    Updates student record and synchronizes associated user login credentials.
    """
    connection = None
    try:
        data = request.get_json() or {}
        full_name = (data.get('full_name') or data.get('nama') or '').strip()
        if not full_name:
            return jsonify({"error": "Nama lengkap siswa wajib diisi."}), 400

        nis = (data.get('nis') or '').strip()
        nickname = (data.get('nickname') or data.get('panggilan') or '').strip()
        gender = (data.get('gender') or data.get('jenis_kelamin') or 'Laki-laki').strip()
        birth_place = (data.get('birth_place') or data.get('tempat_lahir') or '').strip()
        birth_date = data.get('birth_date') or data.get('tanggal_lahir') or None
        parents_name = (data.get('parents_name') or data.get('nama_orang_tua') or data.get('ortu') or '').strip()
        student_phone = (data.get('student_phone') or data.get('no_hp_siswa') or '').strip()
        parent_phone = (data.get('parent_phone') or data.get('no_hp') or data.get('nohp') or '').strip()
        kelas_english = normalize_short_class_name((data.get('kelas_english') or 'Belum Ditentukan').strip())
        kelas_math = normalize_short_class_name((data.get('kelas_math') or 'Belum Ditentukan').strip())
        photo_url = data.get('photo_url')
        password = (data.get('password') or '').strip()

        connection = get_db_connection()
        cursor = connection.cursor()

        # Fetch current record for fallback
        cursor.execute("SELECT nis, photo_url FROM students WHERE id = %s", (student_id,))
        curr = cursor.fetchone()
        old_nis = curr['nis'] if isinstance(curr, dict) else curr[0] if curr else ''
        old_photo = (curr['photo_url'] if isinstance(curr, dict) else curr[1]) if curr and len(curr) > 1 else ''
        final_photo = photo_url if photo_url is not None else old_photo
        final_nis = nis if nis else old_nis

        # Update students table
        cursor.execute("""
            UPDATE students 
            SET nis = %s,
                full_name = %s,
                nickname = %s,
                gender = %s,
                birth_place = %s,
                birth_date = %s,
                parents_name = %s,
                student_phone = %s,
                parent_phone = %s,
                kelas_english = %s,
                kelas_math = %s,
                photo_url = %s
            WHERE id = %s
        """, (
            final_nis, full_name, nickname, gender, birth_place, birth_date,
            parents_name, student_phone, parent_phone, kelas_english, kelas_math,
            final_photo, student_id
        ))

        # Synchronize linked user in users table
        cursor.execute("SELECT id, password FROM users WHERE student_id = %s OR id = %s", (student_id, old_nis))
        u_row = cursor.fetchone()
        u_old_pwd = (u_row['password'] if isinstance(u_row, dict) else u_row[1]) if u_row else f"SoC{final_nis[-4:]}"
        final_pwd = password if password else u_old_pwd

        cursor.execute("""
            INSERT INTO users (id, username, password, full_name, nickname, gender, contact, role, student_id, photo_url)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'siswa', %s, %s)
            ON DUPLICATE KEY UPDATE
                id = VALUES(id),
                full_name = VALUES(full_name),
                nickname = VALUES(nickname),
                gender = VALUES(gender),
                contact = VALUES(contact),
                password = VALUES(password),
                student_id = VALUES(student_id),
                photo_url = COALESCE(NULLIF(VALUES(photo_url), ''), photo_url)
        """, (
            final_nis, (nickname.lower() if nickname else final_nis), final_pwd,
            full_name, nickname, gender, (student_phone or parent_phone), student_id, final_photo
        ))

        if not getattr(connection, 'autocommit', False):
            connection.commit()

        cursor.close()
        return jsonify({
            "status": "success",
            "message": "Data siswa dan akun berhasil diperbarui!",
            "data": {
                "id": student_id,
                "nis": final_nis,
                "full_name": full_name,
                "nickname": nickname,
                "gender": gender,
                "birth_place": birth_place,
                "birth_date": str(birth_date) if birth_date else None,
                "parents_name": parents_name,
                "student_phone": student_phone,
                "parent_phone": parent_phone,
                "kelas_english": kelas_english,
                "kelas_math": kelas_math,
                "photo_url": final_photo,
                "password": final_pwd,
                "password_display": final_display
            }
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if connection and hasattr(connection, 'close'):
            connection.close()

@students_bp.route('/api/students', methods=['POST'])
def create_student():
    """
    POST /api/students
    Creates a new student record according to the 2027 architecture schema with auto-generated NIS & Password.
    """
    connection = None
    try:
        data = request.get_json() or {}
        full_name = (data.get('full_name') or data.get('nama') or '').strip()
        if not full_name:
            return jsonify({"error": "Nama lengkap siswa wajib diisi."}), 400

        nis = (data.get('nis') or '').strip()
        nickname = (data.get('nickname') or data.get('panggilan') or '').strip()
        gender = (data.get('gender') or data.get('jenis_kelamin') or 'Laki-laki').strip()
        birth_place = (data.get('birth_place') or data.get('tempat_lahir') or '').strip()
        birth_date = data.get('birth_date') or data.get('tanggal_lahir') or None
        parents_name = (data.get('parents_name') or data.get('nama_orang_tua') or data.get('ortu') or '').strip()
        student_phone = (data.get('student_phone') or data.get('no_hp_siswa') or '').strip()
        parent_phone = (data.get('parent_phone') or data.get('no_hp') or data.get('nohp') or '').strip()
        kelas_english = normalize_short_class_name((data.get('kelas_english') or 'Belum Ditentukan').strip())
        kelas_math = normalize_short_class_name((data.get('kelas_math') or 'Belum Ditentukan').strip())
        photo_url = data.get('photo_url') or ''

        connection = get_db_connection()
        cursor = connection.cursor()

        # Auto-generate unique NIS: YY + MMDD + NNN
        if not nis or not nis.isdigit() or len(nis) < 8:
            nis = generate_student_nis(cursor, birth_date)

        # Auto-generate password: SoC + last 4 digits of NIS
        password = (data.get('password') or '').strip()
        if not password or password == 'password123':
            password = f"SoC{nis[-4:]}"
        password_display = password

        query = """
            INSERT INTO students (
                nis, full_name, nickname, gender, birth_place, birth_date,
                parents_name, student_phone, parent_phone, kelas_english, kelas_math, photo_url
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(query, (
            nis, full_name, nickname, gender, birth_place, birth_date,
            parents_name, student_phone, parent_phone, kelas_english, kelas_math, photo_url
        ))

        new_id = cursor.lastrowid

        # Insert user login account linked to this student
        username = nickname.lower() if nickname else nis
        # Ensure username uniqueness
        cursor.execute("SELECT COUNT(*) FROM users WHERE username = %s AND id != %s", (username, nis))
        un_row = cursor.fetchone()
        un_cnt = un_row[0] if isinstance(un_row, (tuple, list)) else (un_row.get('COUNT(*)', 0) if isinstance(un_row, dict) else 0)
        if un_cnt > 0:
            username = f"{username}{nis[-3:]}"

        cursor.execute("""
            INSERT INTO users (id, username, password, full_name, nickname, gender, contact, role, student_id, photo_url)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'siswa', %s, %s)
            ON DUPLICATE KEY UPDATE
                full_name = VALUES(full_name),
                nickname = VALUES(nickname),
                gender = VALUES(gender),
                contact = VALUES(contact),
                password = VALUES(password),
                student_id = VALUES(student_id),
                photo_url = COALESCE(NULLIF(VALUES(photo_url), ''), photo_url)
        """, (nis, username, password, full_name, nickname, gender, (student_phone or parent_phone), new_id, photo_url))

        if not getattr(connection, 'autocommit', False):
            connection.commit()

        cursor.close()
        return jsonify({
            "status": "success",
            "message": "Data siswa & akun berhasil dibuat!",
            "data": {
                "id": new_id,
                "nis": nis,
                "full_name": full_name,
                "nickname": nickname,
                "gender": gender,
                "birth_place": birth_place,
                "birth_date": str(birth_date) if birth_date else None,
                "parents_name": parents_name,
                "student_phone": student_phone,
                "parent_phone": parent_phone,
                "kelas_english": kelas_english,
                "kelas_math": kelas_math,
                "photo_url": photo_url,
                "password": password,
                "password_display": password_display
            }
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if connection and hasattr(connection, 'close'):
            connection.close()

@students_bp.route('/api/students/bulk', methods=['POST'])
def bulk_create_students():
    """
    POST /api/students/bulk
    Receives JSON array of student objects from Excel import, creates student records and user login accounts.
    """
    connection = None
    try:
        data = request.get_json() or {}
        students_list = data if isinstance(data, list) else data.get('students', [])
        if not students_list or not isinstance(students_list, list):
            return jsonify({"error": "Daftar siswa (array) wajib disediakan."}), 400

        connection = get_db_connection()
        cursor = connection.cursor()

        created_count = 0
        created_records = []

        for item in students_list:
            full_name = (item.get('full_name') or item.get('nama') or item.get('Nama Lengkap') or '').strip()
            if not full_name:
                continue

            nickname = (item.get('nickname') or item.get('panggilan') or item.get('Nama Panggilan') or '').strip()
            raw_g = (item.get('gender') or item.get('jenis_kelamin') or item.get('Jenis Kelamin') or 'Laki-laki').strip()
            gender = 'Perempuan' if raw_g.lower().startswith('p') else 'Laki-laki'
            birth_place = (item.get('birth_place') or item.get('tempat_lahir') or item.get('Tempat Lahir') or 'Gorontalo').strip()
            birth_date = item.get('birth_date') or item.get('tanggal_lahir') or item.get('Tanggal Lahir') or None
            parents_name = (item.get('parents_name') or item.get('nama_orang_tua') or item.get('ortu') or item.get('Nama Orang Tua') or '').strip()
            student_phone = (item.get('student_phone') or item.get('no_hp_siswa') or item.get('No HP Siswa') or '').strip()
            parent_phone = (item.get('parent_phone') or item.get('no_hp') or item.get('nohp') or item.get('No HP Orang Tua') or '').strip()
            kelas_english = normalize_short_class_name((item.get('kelas_english') or item.get('Kelas English') or item.get('Level English') or item.get('level_english') or 'Belum Ditentukan').strip())
            kelas_math = normalize_short_class_name((item.get('kelas_math') or item.get('Kelas Matematika') or item.get('Level Matematika') or item.get('level_matematika') or 'Belum Ditentukan').strip())
            photo_url = item.get('photo_url') or ''

            # Generate unique NIS: YY + MMDD + NNN
            nis = generate_student_nis(cursor, birth_date)
            password = f"SoC{nis[-4:]}"
            password_display = password

            cursor.execute("""
                INSERT INTO students (
                    nis, full_name, nickname, gender, birth_place, birth_date,
                    parents_name, student_phone, parent_phone, kelas_english, kelas_math, photo_url
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                nis, full_name, nickname, gender, birth_place, birth_date,
                parents_name, student_phone, parent_phone, kelas_english, kelas_math, photo_url
            ))
            new_id = cursor.lastrowid

            username = nickname.lower() if nickname else nis
            cursor.execute("SELECT COUNT(*) FROM users WHERE username = %s AND id != %s", (username, nis))
            un_row = cursor.fetchone()
            un_cnt = un_row[0] if isinstance(un_row, (tuple, list)) else (un_row.get('COUNT(*)', 0) if isinstance(un_row, dict) else 0)
            if un_cnt > 0:
                username = f"{username}{nis[-3:]}"

            cursor.execute("""
                INSERT INTO users (id, username, password, full_name, nickname, gender, contact, role, student_id, photo_url, kelas_english, kelas_math)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'siswa', %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    full_name = VALUES(full_name),
                    nickname = VALUES(nickname),
                    gender = VALUES(gender),
                    contact = VALUES(contact),
                    password = VALUES(password),
                    student_id = VALUES(student_id),
                    photo_url = COALESCE(NULLIF(VALUES(photo_url), ''), photo_url),
                    kelas_english = VALUES(kelas_english),
                    kelas_math = VALUES(kelas_math)
            """, (nis, username, password, full_name, nickname, gender, (student_phone or parent_phone), new_id, photo_url, kelas_english, kelas_math))

            created_count += 1
            created_records.append({
                "id": new_id,
                "nis": nis,
                "full_name": full_name,
                "nickname": nickname,
                "password": password
            })

        if not getattr(connection, 'autocommit', False):
            connection.commit()

        cursor.close()
        return jsonify({
            "status": "success",
            "message": f"Berhasil membuat {created_count} akun siswa baru secara massal!",
            "count": created_count,
            "created": created_records
        }), 201
    except Exception as e:
        if connection and not getattr(connection, 'autocommit', False):
            try:
                connection.rollback()
            except Exception:
                pass
        return jsonify({"error": str(e)}), 500
    finally:
        if connection and hasattr(connection, 'close'):
            connection.close()

@students_bp.route('/api/evaluations', methods=['GET'])
def get_evaluations():
    """
    GET /api/evaluations?student_id=X&bulan=Y&tahun=Z
    Returns evaluation row(s) based on optional query parameters.
    """
    connection = None
    try:
        student_id = request.args.get('student_id')
        bulan = request.args.get('bulan')
        tahun = request.args.get('tahun')

        connection = get_db_connection()
        cursor = connection.cursor()

        query = "SELECT * FROM evaluations WHERE 1=1"
        params = []

        if student_id:
            query += " AND student_id = %s"
            params.append(int(student_id))
        if bulan:
            query += " AND LOWER(bulan) = %s"
            params.append(bulan.strip().lower())
        if tahun:
            t_int = int(tahun)
            if t_int == 2026:
                query += " AND (tahun = %s OR tahun IS NULL)"
                params.append(t_int)
            else:
                query += " AND tahun = %s"
                params.append(t_int)

        query += " ORDER BY tahun DESC, id DESC"
        cursor.execute(query, tuple(params))

        if hasattr(cursor, 'description') and cursor.description:
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            evaluations = rows if rows and isinstance(rows[0], dict) else [dict(zip(columns, row)) for row in rows]
            for item in evaluations:
                if item.get('tahun') is None:
                    item['tahun'] = 2026
                if isinstance(item.get('created_at'), (datetime.date, datetime.datetime)):
                    item['created_at'] = item['created_at'].isoformat()
        else:
            evaluations = []

        cursor.close()
        return jsonify(evaluations), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if connection and hasattr(connection, 'close'):
            connection.close()

@students_bp.route('/api/evaluations', methods=['POST'])
def save_evaluation():
    """
    POST /api/evaluations
    Inserts or updates evaluation scores/stars for a given student_id, bulan, tahun.
    Uses COALESCE in ON DUPLICATE KEY UPDATE so partial updates keep existing values.
    """
    connection = None
    try:
        data = request.get_json() or {}
        student_id = data.get('student_id')
        bulan = data.get('bulan')
        tahun = data.get('tahun') or 2026

        if not student_id or not bulan:
            return jsonify({"error": "student_id dan bulan wajib diisi."}), 400

        def parse_opt_int(val):
            if val is None or val == '':
                return None
            try:
                return int(val)
            except (ValueError, TypeError):
                return None

        score_empathy = parse_opt_int(data.get('score_empathy'))
        score_honesty = parse_opt_int(data.get('score_honesty'))
        score_responsibility = parse_opt_int(data.get('score_responsibility'))
        score_respect = parse_opt_int(data.get('score_respect'))
        score_fluency = parse_opt_int(data.get('score_fluency'))
        score_reading = parse_opt_int(data.get('score_reading'))
        score_logic = parse_opt_int(data.get('score_logic'))
        score_arithmetic = parse_opt_int(data.get('score_arithmetic'))
        stars = parse_opt_int(data.get('stars'))
        kelas_english = normalize_short_class_name(data.get('kelas_english'))
        kelas_math = normalize_short_class_name(data.get('kelas_math'))

        connection = get_db_connection()
        cursor = connection.cursor()

        # If class levels were not passed in payload, fetch current student placement
        if not kelas_english or not kelas_math:
            try:
                cursor.execute("SELECT kelas_english, kelas_math FROM students WHERE id = %s", (int(student_id),))
                st_row = cursor.fetchone()
                if st_row:
                    if isinstance(st_row, dict):
                        if not kelas_english:
                            kelas_english = st_row.get('kelas_english')
                        if not kelas_math:
                            kelas_math = st_row.get('kelas_math')
                    else:
                        if not kelas_english:
                            kelas_english = st_row[0]
                        if not kelas_math:
                            kelas_math = st_row[1]
            except Exception:
                pass

        kelas_english = normalize_short_class_name(kelas_english)
        kelas_math = normalize_short_class_name(kelas_math)

        query = """
            INSERT INTO evaluations (
                student_id, bulan, tahun,
                score_empathy, score_honesty, score_responsibility, score_respect,
                score_fluency, score_reading, score_logic, score_arithmetic,
                stars, kelas_english, kelas_math
            ) VALUES (
                %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s
            )
            ON DUPLICATE KEY UPDATE
                score_empathy = COALESCE(VALUES(score_empathy), score_empathy),
                score_honesty = COALESCE(VALUES(score_honesty), score_honesty),
                score_responsibility = COALESCE(VALUES(score_responsibility), score_responsibility),
                score_respect = COALESCE(VALUES(score_respect), score_respect),
                score_fluency = COALESCE(VALUES(score_fluency), score_fluency),
                score_reading = COALESCE(VALUES(score_reading), score_reading),
                score_logic = COALESCE(VALUES(score_logic), score_logic),
                score_arithmetic = COALESCE(VALUES(score_arithmetic), score_arithmetic),
                stars = COALESCE(VALUES(stars), stars),
                kelas_english = COALESCE(VALUES(kelas_english), kelas_english),
                kelas_math = COALESCE(VALUES(kelas_math), kelas_math)
        """
        cursor.execute(query, (
            int(student_id),
            str(bulan).strip(),
            int(tahun),
            score_empathy,
            score_honesty,
            score_responsibility,
            score_respect,
            score_fluency,
            score_reading,
            score_logic,
            score_arithmetic,
            stars,
            kelas_english,
            kelas_math
        ))

        if not getattr(connection, 'autocommit', False):
            connection.commit()

        cursor.close()
        return jsonify({
            "status": "success",
            "message": "Data evaluasi berhasil disimpan!",
            "data": {
                "student_id": int(student_id),
                "bulan": str(bulan).strip(),
                "tahun": int(tahun),
                "stars": stars,
                "kelas_english": kelas_english,
                "kelas_math": kelas_math
            }
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if connection and hasattr(connection, 'close'):
            connection.close()

# =====================================================
# 2027 ARCHITECTURE: STUDENT LEVEL PLACEMENT
# =====================================================
@students_bp.route('/api/students/levels', methods=['POST'])
def update_student_levels():
    """
    POST /api/students/levels
    Updates kelas_english and kelas_math for a specific student.
    Body: { "student_id": 1, "kelas_english": "English B (Beginner)", "kelas_math": "Math A (Dasar Angka)" }
    """
    connection = None
    try:
        data = request.get_json() or {}
        student_id  = data.get('student_id')
        kelas_eng   = normalize_short_class_name(data.get('kelas_english', '').strip())
        kelas_math  = normalize_short_class_name(data.get('kelas_math', '').strip())

        if not student_id:
            return jsonify({'error': 'student_id is required'}), 400

        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute(
            "UPDATE students SET kelas_english = %s, kelas_math = %s WHERE id = %s",
            (kelas_eng, kelas_math, int(student_id))
        )
        # Also sync current evaluations for this student
        try:
            cursor.execute(
                "UPDATE evaluations SET kelas_english = %s, kelas_math = %s WHERE student_id = %s AND (tahun = 2026 OR tahun IS NULL)",
                (kelas_eng, kelas_math, int(student_id))
            )
        except Exception:
            pass

        if not getattr(connection, 'autocommit', False):
            connection.commit()
        cursor.close()
        return jsonify({'status': 'success', 'message': 'Level siswa berhasil diupdate!'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection and hasattr(connection, 'close'):
            connection.close()

# =====================================================
# DELETE STUDENT (CASCADE IN TRANSACTION)
# =====================================================
@students_bp.route('/api/students/<int:student_id>', methods=['DELETE'])
def delete_student(student_id):
    """
    DELETE /api/students/<int:student_id>
    Deletes related records across evaluations, attendance, users, and students in a single transaction.
    """
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        # Delete related evaluations
        cursor.execute("DELETE FROM evaluations WHERE student_id = %s", (student_id,))
        # Delete related attendance
        cursor.execute("DELETE FROM attendance WHERE student_id = %s", (student_id,))
        # Delete related user accounts linked to this student
        cursor.execute("DELETE FROM users WHERE student_id = %s", (student_id,))
        # Delete student record
        cursor.execute("DELETE FROM students WHERE id = %s", (student_id,))

        if not getattr(connection, 'autocommit', False):
            connection.commit()

        cursor.close()
        return jsonify({
            "status": "success",
            "message": f"Data siswa ID {student_id} berhasil dihapus beserta seluruh data terkait."
        }), 200
    except Exception as e:
        if connection and not getattr(connection, 'autocommit', False):
            try:
                connection.rollback()
            except Exception:
                pass
        return jsonify({"error": str(e)}), 500
    finally:
        if connection and hasattr(connection, 'close'):
            connection.close()
