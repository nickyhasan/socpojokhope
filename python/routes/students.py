import re
import datetime
from flask import Blueprint, request, jsonify

def parse_date_string(val):
    if not val:
        return None
    s = str(val).strip()
    if not s or s.lower() in ('null', 'none', '-'):
        return None
    if isinstance(val, (datetime.date, datetime.datetime)):
        return val.strftime('%Y-%m-%d')
    if re.match(r'^\d{4}-\d{2}-\d{2}$', s):
        return s
    if re.match(r'^\d{4}/\d{2}/\d{2}$', s):
        return s.replace('/', '-')
    m = re.match(r'^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$', s)
    if m:
        return f"{m.group(3)}-{m.group(2).zfill(2)}-{m.group(1).zfill(2)}"
    try:
        dt = datetime.datetime.fromisoformat(s)
        return dt.strftime('%Y-%m-%d')
    except Exception:
        pass
    return None

try:
    from database import get_db, get_db_connection, normalize_short_class_name, save_profile_image_file
except ImportError:
    from ..database import get_db, get_db_connection, normalize_short_class_name, save_profile_image_file

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
    GET /api/students?kelas=English A (Foundation)&status=alumni
    Fetches student list mapped to the 2027 schema, optionally filtered by class level or status.
    """
    kelas = request.args.get('kelas') or request.args.get('class')
    status_filter = request.args.get('status')
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        where_clauses = []
        params = []

        if kelas:
            where_clauses.append("(UPPER(s.kelas_english) = %s OR UPPER(s.kelas_math) = %s)")
            params.extend([kelas.upper(), kelas.upper()])

        if status_filter:
            if status_filter.lower() == 'alumni':
                where_clauses.append("s.status_siswa = 'alumni'")
            elif status_filter.lower() == 'aktif':
                where_clauses.append("(s.status_siswa IS NULL OR s.status_siswa = 'aktif' OR s.status_siswa != 'alumni')")

        where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

        query = f"""
            SELECT s.id, s.nis, s.full_name, s.nickname, s.gender, s.birth_place, s.birth_date, s.parents_name, 
                   COALESCE(s.parent_name, s.parents_name) AS parent_name,
                   COALESCE(s.nama_ortu, s.parents_name) AS nama_ortu,
                   s.student_phone, s.parent_phone, s.kelas_english, s.kelas_math, s.photo_url, s.created_at,
                   s.status_siswa, s.graduated_at, s.alumni_access_until,
                   DATEDIFF(s.alumni_access_until, NOW()) AS days_left,
                   u.password,
                   COALESCE((SELECT SUM(COALESCE(e.stars, 0)) FROM evaluations e WHERE e.student_id = s.id), 0) AS stars,
                   COALESCE((
                       SELECT AVG(
                           (COALESCE(e.score_empathy, 0) + COALESCE(e.score_honesty, 0) + 
                            COALESCE(e.score_responsibility, 0) + COALESCE(e.score_respect, 0) + 
                            COALESCE(e.score_fluency, 0) + COALESCE(e.score_reading, 0) + 
                            COALESCE(e.score_logic, 0) + COALESCE(e.score_arithmetic, 0)) / 8.0
                       ) FROM evaluations e WHERE e.student_id = s.id
                   ), 0.0) AS avg_score
            FROM students s
            LEFT JOIN users u ON (u.student_id = s.id OR u.id = s.nis)
            {where_sql}
            ORDER BY s.full_name ASC
        """
        cursor.execute(query, tuple(params))

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
                if isinstance(s.get('graduated_at'), (datetime.date, datetime.datetime)):
                    s['graduated_at'] = s['graduated_at'].isoformat()
                if isinstance(s.get('alumni_access_until'), (datetime.date, datetime.datetime)):
                    s['alumni_access_until'] = s['alumni_access_until'].isoformat()

                if not s.get('status_siswa'):
                    s['status_siswa'] = 'aktif'

                s['nis'] = str(s.get('nis') or '').strip()
                raw_g = str(s.get('gender') or '').strip().upper()
                if raw_g.startswith('P') or 'PEREMPUAN' in raw_g:
                    s['gender'] = 'P'
                elif raw_g.startswith('L') or 'LAKI' in raw_g:
                    s['gender'] = 'L'
                else:
                    s['gender'] = raw_g or '-'

                s['parent_name'] = str(s.get('parent_name') or s.get('parents_name') or '').strip()
                s['nama_ortu'] = s['parent_name']
                s['parents_name'] = s['parent_name']
                s['phone_siswa'] = str(s.get('student_phone') or '').strip()
                s['no_hp_siswa'] = s['phone_siswa']
                s['phone_ortu'] = str(s.get('parent_phone') or '').strip()
                s['no_hp_ortu'] = s['phone_ortu']
                s['tempat_lahir'] = str(s.get('birth_place') or '').strip()
                s['tanggal_lahir'] = s.get('birth_date') or ''
                s['stars'] = int(s.get('stars') or 0)
                s['bintang'] = s['stars']
                s['avg_score'] = round(float(s.get('avg_score') or 0.0), 2)

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
                   COALESCE(s.parent_name, s.parents_name) AS parent_name,
                   COALESCE(s.nama_ortu, s.parents_name) AS nama_ortu,
                   s.student_phone, s.parent_phone, s.kelas_english, s.kelas_math, s.photo_url, s.created_at,
                   s.status_siswa, s.graduated_at, s.alumni_access_until,
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
        s['parent_name'] = str(s.get('parent_name') or s.get('parents_name') or '').strip()
        s['nama_ortu'] = s['parent_name']
        s['parents_name'] = s['parent_name']
        s['phone_siswa'] = str(s.get('student_phone') or '').strip()
        s['no_hp_siswa'] = s['phone_siswa']
        s['phone_ortu'] = str(s.get('parent_phone') or '').strip()
        s['no_hp_ortu'] = s['phone_ortu']
        s['tempat_lahir'] = str(s.get('birth_place') or '').strip()
        s['tanggal_lahir'] = s.get('birth_date') or ''
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
        photo_url = data.get('photo_url')
        password = (data.get('password') or '').strip()

        connection = get_db_connection()
        cursor = connection.cursor()

        # Fetch current record for fallback
        cursor.execute("SELECT nis, photo_url, kelas_english, kelas_math FROM students WHERE id = %s", (student_id,))
        curr = cursor.fetchone()
        old_nis = curr['nis'] if isinstance(curr, dict) else curr[0] if curr else ''
        old_photo = (curr['photo_url'] if isinstance(curr, dict) else curr[1]) if curr and len(curr) > 1 else ''
        old_eng = (curr['kelas_english'] if isinstance(curr, dict) else curr[2]) if curr and len(curr) > 2 else ''
        old_math = (curr['kelas_math'] if isinstance(curr, dict) else curr[3]) if curr and len(curr) > 3 else ''

        final_nis = nis if nis else old_nis
        final_photo = save_profile_image_file(final_nis, photo_url) if photo_url is not None else old_photo

        # If kelas_english / kelas_math omitted or empty in payload, preserve current level!
        if 'kelas_english' in data and data.get('kelas_english') and data.get('kelas_english') != 'Belum Ditentukan':
            kelas_english = normalize_short_class_name(str(data['kelas_english']).strip())
        else:
            kelas_english = old_eng or 'Belum Ditentukan'

        if 'kelas_math' in data and data.get('kelas_math') and data.get('kelas_math') != 'Belum Ditentukan':
            kelas_math = normalize_short_class_name(str(data['kelas_math']).strip())
        else:
            kelas_math = old_math or 'Belum Ditentukan'

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

        photo_url = save_profile_image_file(nis, photo_url)

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
    Includes duplicate detection: skips existing students with same name + (birth date OR parent OR birth place).
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
        skipped_count = 0
        created_records = []

        for item in students_list:
            full_name = (item.get('full_name') or item.get('nama') or item.get('Nama Lengkap') or item.get('nama_lengkap') or item.get('Nama') or '').strip()
            if not full_name:
                continue

            nickname = (item.get('nickname') or item.get('panggilan') or item.get('Nama Panggilan') or item.get('Panggilan') or '').strip()
            raw_g = (item.get('gender') or item.get('jenis_kelamin') or item.get('Jenis Kelamin') or item.get('Gender') or 'Laki-laki').strip()
            gender = 'Perempuan' if (raw_g.lower().startswith('p') or 'perempuan' in raw_g.lower() or raw_g.lower() == 'female') else 'Laki-laki'
            birth_place = (item.get('birth_place') or item.get('tempat_lahir') or item.get('Tempat Lahir') or 'Gorontalo').strip()
            
            raw_date = item.get('birth_date') or item.get('tanggal_lahir') or item.get('Tanggal Lahir') or item.get('Tanggal Lahir (YYYY-MM-DD)') or None
            birth_date = parse_date_string(raw_date)

            parents_name = (item.get('parents_name') or item.get('parent_name') or item.get('nama_ortu') or item.get('nama_orang_tua') or item.get('Nama Orang Tua') or item.get('Nama Orang Tua / Wali') or item.get('Orang Tua') or item.get('ortu') or '').strip()
            student_phone = (item.get('student_phone') or item.get('phone_siswa') or item.get('no_hp_siswa') or item.get('No HP Siswa') or item.get('HP Siswa') or '').strip()
            parent_phone = (item.get('parent_phone') or item.get('phone_ortu') or item.get('no_hp_ortu') or item.get('no_hp') or item.get('nohp') or item.get('No HP Orang Tua') or item.get('No HP Ortu') or item.get('HP Ortu') or '').strip()
            kelas_english = normalize_short_class_name((item.get('kelas_english') or item.get('Kelas English') or item.get('Level English') or item.get('level_english') or item.get('English') or 'Belum Ditentukan').strip())
            kelas_math = normalize_short_class_name((item.get('kelas_math') or item.get('Kelas Matematika') or item.get('Level Matematika') or item.get('level_matematika') or item.get('Matematika') or 'Belum Ditentukan').strip())
            photo_url = item.get('photo_url') or ''

            # Duplicate check: check if student exists with case-insensitive name + (birth_date OR parent OR birth_place)
            norm_name = full_name.lower().strip()
            dup_query = """
                SELECT id FROM students 
                WHERE LOWER(TRIM(full_name)) = %s 
                  AND (
                      (%s IS NOT NULL AND birth_date = %s)
                      OR (%s != '' AND (LOWER(TRIM(COALESCE(parents_name, ''))) = LOWER(TRIM(%s)) OR LOWER(TRIM(COALESCE(parent_name, ''))) = LOWER(TRIM(%s))))
                      OR (%s != '' AND LOWER(TRIM(COALESCE(birth_place, ''))) = LOWER(TRIM(%s)))
                  )
                LIMIT 1
            """
            cursor.execute(dup_query, (
                norm_name,
                birth_date, birth_date,
                parents_name, parents_name, parents_name,
                birth_place, birth_place
            ))
            if cursor.fetchone():
                skipped_count += 1
                continue

            # Generate unique NIS: YY + MMDD + NNN
            nis = generate_student_nis(cursor, birth_date)
            password = f"SoC{nis[-4:]}"
            password_display = password

            cursor.execute("""
                INSERT INTO students (
                    nis, full_name, nickname, gender, birth_place, birth_date,
                    parents_name, parent_name, nama_ortu, student_phone, parent_phone, kelas_english, kelas_math, photo_url
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                nis, full_name, nickname, gender, birth_place, birth_date,
                parents_name, parents_name, parents_name, student_phone, parent_phone, kelas_english, kelas_math, photo_url
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
            "message": f"Impor selesai: {created_count} data baru berhasil ditambahkan, {skipped_count} data dilewati karena sudah terdaftar di database.",
            "count": created_count,
            "skipped": skipped_count,
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

@students_bp.route('/api/students/<int:student_id>/restore', methods=['POST'])
@students_bp.route('/api/students/<int:student_id>/ungraduate', methods=['POST'])
def restore_student(student_id):
    """
    POST /api/students/<int:student_id>/restore
    Reverts an alumnus back to active student status:
    - status_siswa = 'aktif'
    - graduated_at = NULL
    - alumni_access_until = NULL
    - kelas_english = 'English C'
    - kelas_math = 'Math C'
    Also updates users table.
    """
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute("""
            UPDATE students 
            SET status_siswa = 'aktif',
                graduated_at = NULL,
                alumni_access_until = NULL,
                kelas_english = 'English C',
                kelas_math = 'Math C'
            WHERE id = %s
        """, (student_id,))

        try:
            cursor.execute("""
                UPDATE users
                SET kelas_english = 'English C',
                    kelas_math = 'Math C'
                WHERE student_id = %s OR id = %s
            """, (student_id, str(student_id)))
        except Exception:
            pass

        if not getattr(connection, 'autocommit', False):
            connection.commit()

        cursor.close()
        return jsonify({
            "status": "success",
            "message": "Status siswa berhasil dikembalikan menjadi Siswa Aktif (English C & Math C)."
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

        # Synchronize students.stars with total evaluations.stars
        try:
            cursor.execute("""
                UPDATE students 
                SET stars = COALESCE((SELECT SUM(COALESCE(stars, 0)) FROM evaluations WHERE student_id = %s), 0)
                WHERE id = %s
            """, (student_id, student_id))
        except Exception:
            pass

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

@students_bp.route('/api/students/<int:student_id>/stars', methods=['POST'])
def update_student_stars(student_id):
    """
    POST /api/students/<id>/stars
    Body: { "stars": 3, "bulan": "Oktober", "tahun": 2026 }
    Synchronizes stars across students and evaluations tables.
    """
    connection = None
    try:
        data = request.get_json() or {}
        stars = int(data.get('stars', 0))
        bulan = str(data.get('bulan', 'Oktober')).strip()
        tahun = int(data.get('tahun', datetime.datetime.now().year))

        connection = get_db_connection()
        cursor = connection.cursor()

        # Update or insert into evaluations
        cursor.execute("""
            INSERT INTO evaluations (student_id, bulan, tahun, stars)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE stars = VALUES(stars)
        """, (student_id, bulan, tahun, stars))

        # Synchronize students.stars
        cursor.execute("""
            UPDATE students
            SET stars = COALESCE((SELECT SUM(COALESCE(stars, 0)) FROM evaluations WHERE student_id = %s), %s)
            WHERE id = %s
        """, (student_id, stars, student_id))

        if not getattr(connection, 'autocommit', False):
            connection.commit()
        cursor.close()
        return jsonify({
            'status': 'success',
            'message': f'Bintang siswa berhasil diperbarui menjadi {stars}!',
            'data': {'student_id': student_id, 'stars': stars, 'bulan': bulan, 'tahun': tahun}
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
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

        # Prerequisite check: both must be 'Lulus' if either is 'Lulus'
        is_eng_lulus = (kelas_eng == 'Lulus')
        is_math_lulus = (kelas_math == 'Lulus')
        if (is_eng_lulus and not is_math_lulus) or (is_math_lulus and not is_eng_lulus):
            return jsonify({
                'error': 'Siswa tidak dapat dinyatakan Lulus Alumni hanya pada satu mata pelajaran. Siswa harus menyelesaikan dan lulus dari kedua mata pelajaran (English C dan Math C) untuk dapat menjadi Alumni.'
            }), 400

        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute(
            "UPDATE students SET kelas_english = %s, kelas_math = %s WHERE id = %s",
            (kelas_eng, kelas_math, int(student_id))
        )
        try:
            cursor.execute(
                "UPDATE users SET kelas_english = %s, kelas_math = %s WHERE student_id = %s",
                (kelas_eng, kelas_math, int(student_id))
            )
        except Exception:
            pass

        if is_eng_lulus and is_math_lulus:
            cursor.execute("""
                UPDATE students 
                SET status_siswa = 'alumni',
                    graduated_at = COALESCE(graduated_at, NOW()),
                    alumni_access_until = COALESCE(alumni_access_until, DATE_ADD(NOW(), INTERVAL 6 MONTH))
                WHERE id = %s
            """, (int(student_id),))
            try:
                pass
            except Exception:
                pass
        else:
            cursor.execute("""
                UPDATE students 
                SET status_siswa = 'aktif'
                WHERE id = %s AND status_siswa = 'alumni'
            """, (int(student_id),))
            try:
                pass
            except Exception:
                pass
            except Exception:
                pass

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
# GRADUATION (ALUMNI WITH 90-DAY ACCESS)
# =====================================================
@students_bp.route('/api/students/<student_id>/graduate', methods=['POST'])
def graduate_student(student_id):
    """
    POST /api/students/<student_id>/graduate
    Marks a student as graduated (alumni):
    - status_siswa = 'alumni'
    - graduated_at = NOW()
    - alumni_access_until = DATE_ADD(NOW(), INTERVAL 90 DAY)
    - kelas_english = 'Lulus'
    - kelas_math = 'Lulus'
    Also updates users table credentials and class assignments.
    """
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        # Check student existence
        cursor.execute("SELECT id, nis, full_name FROM students WHERE id = %s OR nis = %s", (student_id, student_id))
        row = cursor.fetchone()
        if not row:
            return jsonify({"error": "Siswa tidak ditemukan."}), 404

        s_id = row['id'] if isinstance(row, dict) else row[0]
        s_nis = row['nis'] if isinstance(row, dict) else row[1]
        s_name = row['full_name'] if isinstance(row, dict) else row[2]

        cursor.execute("""
            UPDATE students
            SET status_siswa = 'alumni',
                graduated_at = NOW(),
                alumni_access_until = DATE_ADD(NOW(), INTERVAL 6 MONTH),
                kelas_english = 'Tamat English C',
                kelas_math = 'Tamat Math C'
            WHERE id = %s OR nis = %s
        """, (s_id, s_nis))

        cursor.execute("""
            UPDATE users
            SET kelas_english = 'Tamat English C',
                kelas_math = 'Tamat Math C'
            WHERE student_id = %s OR id = %s OR id = %s
        """, (s_id, s_nis, str(s_id)))

        if not getattr(connection, 'autocommit', False):
            connection.commit()

        cursor.close()
        return jsonify({
            "status": "success",
            "message": f"Siswa {s_name} berhasil dinyatakan Lulus sebagai Alumni!",
            "data": {
                "id": s_id,
                "nis": s_nis,
                "full_name": s_name,
                "status_siswa": "alumni",
                "kelas_english": "Tamat English C",
                "kelas_math": "Tamat Math C"
            }
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
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
