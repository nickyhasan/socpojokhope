from flask import Blueprint, request, jsonify

try:
    from database import get_db, get_db_connection, save_profile_image_file
except ImportError:
    from ..database import get_db, get_db_connection, save_profile_image_file

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/login', methods=['POST'])
def login():
    """
    POST /api/login
    Receives username and password, verifies credentials, and returns user session info.
    """
    connection = None
    try:
        data = request.get_json() or {}
        raw_identifier = str(data.get('username') or data.get('identifier') or '').strip()
        identifier = raw_identifier.lower()
        password = str(data.get('password') or '').strip()

        if not raw_identifier or not password:
            return jsonify({"error": "NIS / ID / Email dan Kata Sandi tidak boleh kosong."}), 400

        # Security Hardening for Admin:
        # Do NOT allow logging into the Admin account using the generic word 'admin'!
        # Never reveal the official Admin ID or credential hints.
        if identifier == 'admin':
            return jsonify({
                "error": "NIS / ID / Email atau Kata Sandi salah. Silakan coba lagi."
            }), 401

        connection = get_db_connection()
        cursor = connection.cursor()

        # Multi-identifier search across ID, Email, Student NIS, and Tutor records
        query = """
            SELECT u.id, u.username, u.password, u.full_name, u.role, u.email, u.student_id,
                   COALESCE(NULLIF(u.photo_url, ''), NULLIF(s.photo_url, ''), '') AS photo_url
            FROM users u
            LEFT JOIN students s ON (s.id = u.student_id OR s.nis = u.id)
            WHERE u.id = %s 
               OR LOWER(u.email) = %s 
               OR (LOWER(u.username) = %s AND LOWER(u.role) != 'admin')
               OR u.student_id IN (SELECT id FROM students WHERE LOWER(nis) = %s)
               OR u.id IN (SELECT nis FROM students WHERE LOWER(nis) = %s)
               OR u.id IN (SELECT id FROM tutors WHERE LOWER(email) = %s OR id = %s OR teacher_code = %s)
            ORDER BY (u.id = %s) DESC, (LOWER(u.email) = %s) DESC
            LIMIT 1
        """
        cursor.execute(query, (
            raw_identifier,
            identifier,
            identifier,
            identifier,
            identifier,
            identifier, raw_identifier, raw_identifier,
            raw_identifier, identifier
        ))

        user = cursor.fetchone()
        cursor.close()

        if not user:
            return jsonify({"error": "NIS / ID / Email atau Kata Sandi salah. Silakan coba lagi."}), 401

        # Additional security guard for Admin role
        user_role = str(user['role'] if isinstance(user, dict) else user[4]).strip().lower()
        user_id = str(user['id'] if isinstance(user, dict) else user[0]).strip()
        user_email = str((user['email'] if isinstance(user, dict) else user[5]) or '').strip().lower()

        if user_role == 'admin':
            if raw_identifier != user_id and identifier != user_email:
                return jsonify({
                    "error": "NIS / ID / Email atau Kata Sandi salah. Silakan coba lagi."
                }), 401

        # Strictly verify submitted password against the exact database password
        db_pass = user['password'] if isinstance(user, dict) else user[2]
        is_valid = (str(password) == str(db_pass))

        if not is_valid:
            return jsonify({"error": "NIS / ID / Email atau Kata Sandi salah. Silakan coba lagi."}), 401

        if isinstance(user, dict):
            user_info = {
                "id": str(user['id']),
                "username": user.get('username') or str(user['id']),
                "full_name": user['full_name'],
                "role": user['role'],
                "student_id": user.get('student_id'),
                "photo_url": user.get('photo_url') or ''
            }
        else:
            user_info = {
                "id": str(user[0]),
                "username": user[1] or str(user[0]),
                "full_name": user[3],
                "role": user[4],
                "student_id": user[6],
                "photo_url": user[7] if len(user) > 7 and user[7] else ''
            }

        # 90-Day Alumni Login Grace Period Verification
        if user_info.get('role') == 'siswa' or user_info.get('student_id'):
            s_cur = connection.cursor()
            try:
                s_cur.execute("""
                    SELECT status_siswa, graduated_at, alumni_access_until,
                           DATEDIFF(alumni_access_until, NOW()) AS days_left
                    FROM students
                    WHERE id = %s OR nis = %s
                """, (user_info.get('student_id'), user_info.get('id')))
                st_info = s_cur.fetchone()
                if st_info:
                    st_dict = st_info if isinstance(st_info, dict) else {
                        'status_siswa': st_info[0],
                        'graduated_at': st_info[1],
                        'alumni_access_until': st_info[2],
                        'days_left': st_info[3]
                    }
                    if st_dict.get('status_siswa') == 'alumni':
                        user_info['status_siswa'] = 'alumni'
                        user_info['graduated_at'] = str(st_dict.get('graduated_at')) if st_dict.get('graduated_at') else None
                        user_info['alumni_access_until'] = str(st_dict.get('alumni_access_until')) if st_dict.get('alumni_access_until') else None
                        days_left = st_dict.get('days_left')
                        user_info['days_left'] = days_left if days_left is not None else 0
                        if days_left is not None and days_left < 0:
                            s_cur.close()
                            return jsonify({
                                "error": "Masa akses akun alumni selama 6 bulan telah berakhir. Silakan hubungi pihak sekolah/admin SoC jika memerlukan perpanjangan akses."
                            }), 403
            except Exception:
                pass
            finally:
                s_cur.close()

        return jsonify({
            "message": "Login berhasil",
            "user": user_info
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if connection and hasattr(connection, 'close'):
            connection.close()

@auth_bp.route('/api/profile/<user_id>', methods=['GET'])
def get_user_profile(user_id):
    """
    GET /api/profile/<user_id>
    Returns user details including student or tutor specifics for the Data Diri tab.
    """
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute("""
            SELECT id, username, full_name, nickname, gender, contact, email, jurusan, role, student_id, photo_url, password 
            FROM users 
            WHERE id = %s OR username = %s
        """, (user_id, user_id))
        user_row = cursor.fetchone()
        if not user_row:
            return jsonify({"error": "Pengguna tidak ditemukan."}), 404

        if isinstance(user_row, dict):
            profile = dict(user_row)
        else:
            cols = [desc[0] for desc in cursor.description]
            profile = dict(zip(cols, user_row))

        profile['id'] = str(profile.get('id') or '')
        profile['photo_url'] = profile.get('photo_url') or ''

        # If student, fetch student details
        if profile.get('role') == 'siswa' or profile.get('student_id'):
            s_id = profile.get('student_id')
            cursor.execute("""
                SELECT nis, full_name, nickname, gender, birth_place, birth_date, parents_name, student_phone, parent_phone, kelas_english, kelas_math, photo_url,
                       status_siswa, graduated_at, alumni_access_until, DATEDIFF(alumni_access_until, NOW()) AS days_left
                FROM students
                WHERE id = %s OR nis = %s
            """, (s_id, profile['id']))
            s_row = cursor.fetchone()
            if s_row:
                s_dict = s_row if isinstance(s_row, dict) else dict(zip([desc[0] for desc in cursor.description], s_row))
                profile['nis'] = s_dict.get('nis') or profile['id']
                profile['birth_place'] = s_dict.get('birth_place') or ''
                if s_dict.get('birth_date'):
                    profile['birth_date'] = str(s_dict['birth_date']).split('T')[0]
                profile['parents_name'] = s_dict.get('parents_name') or ''
                profile['student_phone'] = s_dict.get('student_phone') or profile.get('contact') or ''
                profile['parent_phone'] = s_dict.get('parent_phone') or ''
                profile['kelas_english'] = s_dict.get('kelas_english') or 'Belum Ditentukan'
                profile['kelas_math'] = s_dict.get('kelas_math') or 'Belum Ditentukan'
                profile['status_siswa'] = s_dict.get('status_siswa') or 'aktif'
                profile['graduated_at'] = str(s_dict.get('graduated_at')) if s_dict.get('graduated_at') else None
                profile['alumni_access_until'] = str(s_dict.get('alumni_access_until')) if s_dict.get('alumni_access_until') else None
                profile['days_left'] = s_dict.get('days_left')
                if s_dict.get('photo_url') and not profile.get('photo_url'):
                    profile['photo_url'] = s_dict['photo_url']

        cursor.close()
        return jsonify(profile), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if connection and hasattr(connection, 'close'):
            connection.close()

@auth_bp.route('/api/profile', methods=['PUT'])
def update_profile():
    """
    PUT /api/profile
    Updates user personal profile and credentials across users, students, and tutors tables.
    """
    connection = None
    try:
        data = request.get_json() or {}
        user_id = str(data.get('id') or '').strip()
        if not user_id:
            return jsonify({"error": "ID pengguna wajib disertakan."}), 400

        full_name = (data.get('full_name') or '').strip()
        nickname = (data.get('nickname') or '').strip()
        gender = (data.get('gender') or '').strip()
        password = (data.get('password') or '').strip()
        contact = (data.get('contact') or data.get('student_phone') or '').strip()
        email = (data.get('email') or '').strip()
        jurusan = (data.get('jurusan') or '').strip()
        photo_url = data.get('photo_url') or ''

        # Student specific fields
        birth_place = (data.get('birth_place') or '').strip()
        birth_date = data.get('birth_date') or None
        parents_name = (data.get('parents_name') or '').strip()
        student_phone = (data.get('student_phone') or contact).strip()
        parent_phone = (data.get('parent_phone') or '').strip()

        if not full_name:
            return jsonify({"error": "Nama lengkap tidak boleh kosong."}), 400

        connection = get_db_connection()
        cursor = connection.cursor()

        # Check existing user
        cursor.execute("SELECT id, role, student_id, photo_url FROM users WHERE id = %s", (user_id,))
        existing = cursor.fetchone()
        if not existing:
            return jsonify({"error": "Pengguna tidak ditemukan."}), 404

        role = existing['role'] if isinstance(existing, dict) else existing[1]
        student_id = existing['student_id'] if isinstance(existing, dict) else existing[2]
        old_photo = existing['photo_url'] if isinstance(existing, dict) else existing[3]
        final_photo = save_profile_image_file(user_id, photo_url) if photo_url else old_photo

        # If student, lock legal credentials (full_name, gender, birth_place, birth_date, parents_name) from DB
        if role == 'siswa' or student_id:
            cursor.execute("SELECT full_name, gender, birth_place, birth_date, parents_name, parent_name FROM students WHERE id = %s OR nis = %s", (student_id, user_id))
            st_row = cursor.fetchone()
            if st_row:
                if isinstance(st_row, dict):
                    full_name = st_row.get('full_name') or full_name
                    gender = st_row.get('gender') or gender
                    birth_place = st_row.get('birth_place') or birth_place
                    birth_date = st_row.get('birth_date') or birth_date
                    parents_name = st_row.get('parents_name') or st_row.get('parent_name') or parents_name
                else:
                    full_name = st_row[0] or full_name
                    gender = st_row[1] or gender
                    birth_place = st_row[2] or birth_place
                    birth_date = st_row[3] or birth_date
                    parents_name = st_row[4] or (st_row[5] if len(st_row) > 5 else None) or parents_name

        # Update users table
        if password:
            cursor.execute("""
                UPDATE users 
                SET full_name = %s, nickname = %s, gender = %s, contact = %s, email = %s, jurusan = %s, photo_url = %s, password = %s
                WHERE id = %s
            """, (full_name, nickname, gender, contact, email, jurusan, final_photo, password, user_id))
        else:
            cursor.execute("""
                UPDATE users 
                SET full_name = %s, nickname = %s, gender = %s, contact = %s, email = %s, jurusan = %s, photo_url = %s
                WHERE id = %s
            """, (full_name, nickname, gender, contact, email, jurusan, final_photo, user_id))

        # If student, update students table
        if role == 'siswa' or student_id:
            cursor.execute("""
                UPDATE students 
                SET full_name = %s, nickname = %s, gender = %s, birth_place = %s, birth_date = %s, parents_name = %s, student_phone = %s, parent_phone = %s, photo_url = %s
                WHERE id = %s OR nis = %s
            """, (full_name, nickname, gender, birth_place, birth_date, parents_name, student_phone, parent_phone, final_photo, student_id, user_id))

        # If staff, update tutors table if row exists (including password if changed)
        if role in ('guru', 'manager', 'founder'):
            try:
                if password:
                    cursor.execute("""
                        UPDATE tutors 
                        SET full_name = %s, nickname = %s, gender = %s, contact = %s, email = %s, jurusan = %s, photo_url = %s, password = %s
                        WHERE id = %s OR teacher_code = %s
                    """, (full_name, nickname, gender, contact, email, jurusan, final_photo, password, user_id, user_id))
                else:
                    cursor.execute("""
                        UPDATE tutors 
                        SET full_name = %s, nickname = %s, gender = %s, contact = %s, email = %s, jurusan = %s, photo_url = %s
                        WHERE id = %s OR teacher_code = %s
                    """, (full_name, nickname, gender, contact, email, jurusan, final_photo, user_id, user_id))
            except Exception:
                pass

        if not getattr(connection, 'autocommit', False):
            connection.commit()

        cursor.close()

        updated_user = {
            "id": user_id,
            "full_name": full_name,
            "nickname": nickname,
            "gender": gender,
            "role": role,
            "contact": contact,
            "email": email,
            "jurusan": jurusan,
            "photo_url": final_photo,
            "student_id": student_id
        }

        return jsonify({
            "message": "Profil berhasil diperbarui!",
            "user": updated_user
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
