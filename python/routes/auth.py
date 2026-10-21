from flask import Blueprint, request, jsonify

try:
    from database import get_db, get_db_connection
except ImportError:
    from ..database import get_db, get_db_connection

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
        username = (data.get('username') or '').strip().lower()
        password = (data.get('password') or '').strip()

        if not username or not password:
            return jsonify({"error": "Username dan Kata Sandi tidak boleh kosong."}), 400

        connection = get_db_connection()
        cursor = connection.cursor()

        query = """
            SELECT id, username, password, full_name, role, student_id 
            FROM users 
            WHERE LOWER(username) = %s 
               OR id = %s 
               OR LOWER(email) = %s 
               OR LOWER(full_name) = %s
        """
        cursor.execute(query, (username, username, username, username))

        user = cursor.fetchone()
        cursor.close()

        if not user:
            return jsonify({"error": "Akun tidak ditemukan. Periksa username Anda."}), 401

        # Strictly verify submitted password against the exact database password
        db_pass = user['password'] if isinstance(user, dict) else user[2]
        is_valid = (str(password) == str(db_pass))

        if not is_valid:
            return jsonify({"error": "Kata sandi yang Anda masukkan salah."}), 401

        if isinstance(user, dict):
            user_info = {
                "id": str(user['id']),
                "username": user.get('username') or str(user['id']),
                "full_name": user['full_name'],
                "role": user['role'],
                "student_id": user.get('student_id')
            }
        else:
            user_info = {
                "id": str(user[0]),
                "username": user[1] or str(user[0]),
                "full_name": user[3],
                "role": user[4],
                "student_id": user[5]
            }

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
                SELECT nis, full_name, nickname, gender, birth_place, birth_date, parents_name, student_phone, parent_phone, kelas_english, kelas_math, photo_url
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
        final_photo = photo_url if photo_url else old_photo

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

        # If staff, update tutors table if row exists
        if role in ('guru', 'manager', 'founder'):
            try:
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
