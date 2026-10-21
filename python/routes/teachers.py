import datetime
from flask import Blueprint, request, jsonify

try:
    from database import get_db, get_db_connection, normalize_short_class_name
except ImportError:
    from ..database import get_db, get_db_connection, normalize_short_class_name

teachers_bp = Blueprint('teachers', __name__)

@teachers_bp.route('/api/users', methods=['GET'])
@teachers_bp.route('/api/tutors', methods=['GET'])
@teachers_bp.route('/api/teachers', methods=['GET'])
def get_users():
    """
    GET /api/teachers, GET /api/users?role=guru, or GET /api/tutors
    Fetches system users / tutors according to 2027 schema.
    """
    role = request.args.get('role')
    include_all = request.args.get('all') == 'true' or request.args.get('role') == 'all' or (request.path in ['/api/teachers', '/api/tutors'] and not role)

    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        query = """
            SELECT id, full_name, nickname, gender, contact, email, 
                   jurusan, role, username, student_id, photo_url, password 
            FROM users 
        """
        if include_all:
            query += " WHERE LOWER(role) IN ('guru', 'manager', 'founder') AND id NOT IN ('0025001', '1001001') ORDER BY id ASC"
            cursor.execute(query)
        elif role:
            query += " WHERE LOWER(role) = %s AND id NOT IN ('0025001', '1001001') ORDER BY id ASC"
            cursor.execute(query, (role.lower(),))
        else:
            query += " WHERE LOWER(role) NOT IN ('admin') AND id NOT IN ('0025001', '1001001') ORDER BY id ASC"
            cursor.execute(query)

        if hasattr(cursor, 'description') and cursor.description:
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            raw_users = rows if rows and isinstance(rows[0], dict) else [dict(zip(columns, row)) for row in rows]
        else:
            raw_users = []

        users = []
        for u in raw_users:
            u_dict = dict(u)
            u_id_str = str(u_dict.get('id') or '')
            if u_id_str in ('0025001', '1001001') or str(u_dict.get('role') or '').lower() == 'admin':
                continue
            u_dict['id'] = u_id_str
            u_dict['teacher_code'] = str(u_dict.get('id') or '')
            u_dict['jurusan'] = u_dict.get('jurusan') or ''
            u_dict['specialization'] = u_dict.get('jurusan') or ''
            u_dict['password_display'] = u_dict.get('password') or ''
            u_dict['phone'] = u_dict.get('contact') or ''
            users.append(u_dict)

        cursor.close()
        return jsonify(users), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if connection and hasattr(connection, 'close'):
            connection.close()

@teachers_bp.route('/api/teachers/<teacher_id>', methods=['GET'])
def get_teacher(teacher_id):
    """
    GET /api/teachers/<teacher_id>
    Fetches details of a specific teacher.
    """
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        query = """
            SELECT id, full_name, nickname, gender, contact, email, 
                   jurusan, role, username, photo_url, password 
            FROM users 
            WHERE id = %s AND LOWER(role) IN ('guru', 'manager', 'founder')
            LIMIT 1
        """
        cursor.execute(query, (str(teacher_id),))
        row = cursor.fetchone()
        cursor.close()

        if not row:
            return jsonify({"error": "Pengajar tidak ditemukan."}), 404

        if isinstance(row, dict):
            t_data = row
        else:
            cols = ['id', 'full_name', 'nickname', 'gender', 'contact', 'email', 'jurusan', 'role', 'username', 'photo_url', 'password']
            t_data = dict(zip(cols, row))

        t_data['id'] = str(t_data.get('id') or '')
        t_data['teacher_code'] = str(t_data.get('id') or '')
        t_data['jurusan'] = t_data.get('jurusan') or ''
        t_data['specialization'] = t_data.get('jurusan') or ''
        t_data['password_display'] = t_data.get('password') or ''
        t_data['phone'] = t_data.get('contact') or ''

        return jsonify(t_data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if connection and hasattr(connection, 'close'):
            connection.close()

@teachers_bp.route('/api/teachers', methods=['POST'])
@teachers_bp.route('/api/users', methods=['POST'])
@teachers_bp.route('/api/tutors', methods=['POST'])
def create_user():
    """
    POST /api/teachers, POST /api/users, or POST /api/tutors
    Creates a new teacher or user with an auto-generated 03YYNNN ID and default password.
    """
    connection = None
    try:
        data = request.get_json() or {}
        custom_id = str(data.get('id') or data.get('teacher_code') or '').strip()
        full_name = (data.get('full_name') or data.get('nama') or '').strip()
        nickname = (data.get('nickname') or data.get('panggilan') or '').strip()
        gender = (data.get('gender') or data.get('jenis_kelamin') or 'Perempuan').strip()
        contact = (data.get('contact') or data.get('kontak') or data.get('no_hp') or data.get('phone') or '').strip()
        email = (data.get('email') or '').strip()
        jurusan = (data.get('jurusan') or data.get('specialization') or data.get('spesialisasi') or '').strip()
        photo_url = data.get('photo_url') or ''
        role = (data.get('role') or 'guru').strip().lower()
        if request.path == '/api/teachers':
            role = 'guru'

        if not full_name:
            return jsonify({"error": "Nama lengkap wajib diisi."}), 400

        connection = get_db_connection()
        cursor = connection.cursor()

        # Auto-generate Teacher ID (03 + YY + NNN) if role is 'guru' and not explicitly provided
        if role == 'guru' and (not custom_id or not custom_id.startswith('03')):
            now = datetime.datetime.now()
            yy = str(now.year)[-2:]
            cursor.execute("SELECT id FROM users WHERE id LIKE '03%'")
            rows = cursor.fetchall()
            existing_nums = []
            for r in rows:
                val = str(r[0] if isinstance(r, (tuple, list)) else r.get('id', ''))
                if len(val) >= 7 and val[:2] == '03':
                    try:
                        existing_nums.append(int(val[-3:]))
                    except ValueError:
                        pass
            next_num = (max(existing_nums) + 1) if existing_nums else 1
            custom_id = f"03{yy}{str(next_num).zfill(3)}"
            while True:
                cursor.execute("SELECT COUNT(*) FROM users WHERE id = %s OR username = %s", (custom_id, custom_id))
                cnt_row = cursor.fetchone()
                cnt = cnt_row[0] if isinstance(cnt_row, (tuple, list)) else (cnt_row.get('COUNT(*)', 0) if isinstance(cnt_row, dict) else 0)
                if cnt == 0:
                    break
                next_num += 1
                custom_id = f"03{yy}{str(next_num).zfill(3)}"
        elif not custom_id:
            now = datetime.datetime.now()
            custom_id = f"01{str(now.year)[-2:]}{str(int(now.timestamp()))[-3:]}"

        teacher_code = custom_id if role == 'guru' else ''
        username = (data.get('username') or custom_id).strip()

        # Auto-generate default password: SoC + last 4 digits (or SoC + YYNNN: SoC26007)
        password = (data.get('password') or '').strip()
        if not password or password == 'password123':
            if role == 'guru' and len(custom_id) >= 5:
                password = f"SoC{custom_id[2:]}"
            else:
                password = 'password123'
        password_display = password

        query = """
            INSERT INTO users (
                id, full_name, nickname, gender, contact, email, jurusan, role, password, username, photo_url
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                full_name = VALUES(full_name),
                nickname = VALUES(nickname),
                gender = VALUES(gender),
                contact = VALUES(contact),
                email = VALUES(email),
                jurusan = VALUES(jurusan),
                role = VALUES(role),
                password = VALUES(password),
                photo_url = COALESCE(NULLIF(VALUES(photo_url), ''), photo_url)
        """
        cursor.execute(query, (
            custom_id, full_name, nickname, gender, contact, email, jurusan, role, password, username, photo_url
        ))

        # Keep tutors table synchronized
        try:
            cursor.execute("""
                INSERT INTO tutors (
                    id, teacher_code, full_name, nickname, gender, contact, email, jurusan, specialization, role, password, photo_url
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    teacher_code = VALUES(teacher_code),
                    full_name = VALUES(full_name),
                    nickname = VALUES(nickname),
                    gender = VALUES(gender),
                    contact = VALUES(contact),
                    email = VALUES(email),
                    jurusan = VALUES(jurusan),
                    specialization = VALUES(specialization),
                    role = VALUES(role),
                    password = VALUES(password),
                    photo_url = COALESCE(NULLIF(VALUES(photo_url), ''), photo_url)
            """, (custom_id, teacher_code or custom_id, full_name, nickname, gender, contact, email, jurusan, jurusan, role, password, photo_url))
        except Exception:
            pass

        try:
            connection.commit()
        except Exception:
            pass

        cursor.close()
        return jsonify({
            "status": "success",
            "message": f"Akun guru {full_name} berhasil dibuat!",
            "data": {
                "id": custom_id,
                "teacher_code": teacher_code or custom_id,
                "full_name": full_name,
                "nickname": nickname,
                "gender": gender,
                "contact": contact,
                "phone": contact,
                "email": email,
                "jurusan": jurusan,
                "specialization": jurusan,
                "role": role,
                "username": username,
                "password": password,
                "password_display": password_display,
                "photo_url": photo_url
            }
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if connection and hasattr(connection, 'close'):
            connection.close()

@teachers_bp.route('/api/teachers/bulk', methods=['POST'])
def bulk_create_teachers():
    """
    POST /api/teachers/bulk
    Receives JSON array of teacher objects from Excel import, creates teacher records and user login accounts.
    """
    connection = None
    try:
        data = request.get_json() or {}
        teachers_list = data if isinstance(data, list) else data.get('teachers', [])
        if not teachers_list or not isinstance(teachers_list, list):
            return jsonify({"error": "Daftar guru (array) wajib disediakan."}), 400

        connection = get_db_connection()
        cursor = connection.cursor()

        now = datetime.datetime.now()
        yy = str(now.year)[-2:]

        # Find starting sequence number for 03YYNNN
        cursor.execute("SELECT id FROM users WHERE id LIKE '03%'")
        rows = cursor.fetchall()
        existing_nums = []
        for r in rows:
            val = str(r[0] if isinstance(r, (tuple, list)) else r.get('id', ''))
            if len(val) >= 7 and val[:2] == '03':
                try:
                    existing_nums.append(int(val[-3:]))
                except ValueError:
                    pass
        current_seq = (max(existing_nums) + 1) if existing_nums else 1

        created_count = 0
        created_records = []

        for item in teachers_list:
            full_name = (item.get('full_name') or item.get('nama') or item.get('Nama Lengkap') or '').strip()
            if not full_name:
                continue

            nickname = (item.get('nickname') or item.get('panggilan') or item.get('Nama Panggilan') or '').strip()
            raw_g = (item.get('gender') or item.get('jenis_kelamin') or item.get('Jenis Kelamin') or 'Perempuan').strip()
            gender = 'Laki-laki' if (raw_g.lower().startswith('l') or 'laki' in raw_g.lower()) else 'Perempuan'
            contact = (item.get('contact') or item.get('kontak') or item.get('no_hp') or item.get('No HP/Kontak') or item.get('phone') or '').strip()
            email = (item.get('email') or item.get('Email') or '').strip()
            jurusan = (item.get('jurusan') or item.get('Jurusan/Lulusan') or item.get('specialization') or '').strip()
            photo_url = item.get('photo_url') or ''

            # Generate unique 03YYNNN
            teacher_id = f"03{yy}{str(current_seq).zfill(3)}"
            while True:
                cursor.execute("SELECT COUNT(*) FROM users WHERE id = %s", (teacher_id,))
                cnt_row = cursor.fetchone()
                cnt = cnt_row[0] if isinstance(cnt_row, (tuple, list)) else (cnt_row.get('COUNT(*)', 0) if isinstance(cnt_row, dict) else 0)
                if cnt == 0:
                    break
                current_seq += 1
                teacher_id = f"03{yy}{str(current_seq).zfill(3)}"
            current_seq += 1

            password = f"SoC{teacher_id[2:]}"
            password_display = password
            username = nickname.lower() if nickname else teacher_id
            cursor.execute("SELECT COUNT(*) FROM users WHERE username = %s AND id != %s", (username, teacher_id))
            un_row = cursor.fetchone()
            un_cnt = un_row[0] if isinstance(un_row, (tuple, list)) else (un_row.get('COUNT(*)', 0) if isinstance(un_row, dict) else 0)
            if un_cnt > 0:
                username = f"{username}{teacher_id[-3:]}"

            # Insert users table
            cursor.execute("""
                INSERT INTO users (
                    id, full_name, nickname, gender, contact, email, jurusan, role, password, username, photo_url
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, 'guru', %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    full_name = VALUES(full_name),
                    nickname = VALUES(nickname),
                    gender = VALUES(gender),
                    contact = VALUES(contact),
                    email = VALUES(email),
                    jurusan = VALUES(jurusan),
                    password = VALUES(password),
                    photo_url = COALESCE(NULLIF(VALUES(photo_url), ''), photo_url)
            """, (teacher_id, full_name, nickname, gender, contact, email, jurusan, password, username, photo_url))

            # Insert tutors table
            try:
                cursor.execute("""
                    INSERT INTO tutors (
                        id, teacher_code, full_name, nickname, gender, contact, email, jurusan, specialization, role, password, photo_url
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'guru', %s, %s)
                    ON DUPLICATE KEY UPDATE
                        teacher_code = VALUES(teacher_code),
                        full_name = VALUES(full_name),
                        nickname = VALUES(nickname),
                        gender = VALUES(gender),
                        contact = VALUES(contact),
                        email = VALUES(email),
                        jurusan = VALUES(jurusan),
                        specialization = VALUES(specialization),
                        password = VALUES(password),
                        photo_url = COALESCE(NULLIF(VALUES(photo_url), ''), photo_url)
                """, (teacher_id, teacher_id, full_name, nickname, gender, contact, email, jurusan, jurusan, password, photo_url))
            except Exception:
                pass

            created_count += 1
            created_records.append({
                "id": teacher_id,
                "teacher_code": teacher_id,
                "full_name": full_name,
                "nickname": nickname,
                "password": password
            })

        if not getattr(connection, 'autocommit', False):
            connection.commit()

        cursor.close()
        return jsonify({
            "status": "success",
            "message": f"Berhasil membuat {created_count} akun pengajar baru secara massal!",
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

@teachers_bp.route('/api/teachers/<teacher_id>', methods=['PUT'])
def update_teacher(teacher_id):
    """
    PUT /api/teachers/<teacher_id>
    Updates teacher details, credentials, and synchronizes class assignments.
    """
    connection = None
    try:
        data = request.get_json() or {}
        new_id = str(data.get('id') or data.get('teacher_code') or teacher_id).strip()
        full_name = (data.get('full_name') or data.get('nama') or '').strip()
        nickname = (data.get('nickname') or data.get('panggilan') or '').strip()
        gender = (data.get('gender') or data.get('jenis_kelamin') or 'Perempuan').strip()
        contact = (data.get('contact') or data.get('kontak') or data.get('no_hp') or data.get('phone') or '').strip()
        email = (data.get('email') or '').strip()
        jurusan = (data.get('jurusan') or data.get('specialization') or data.get('spesialisasi') or '').strip()
        photo_url = data.get('photo_url')
        password = (data.get('password') or '').strip()

        if not full_name:
            return jsonify({"error": "Nama lengkap pengajar wajib diisi."}), 400

        connection = get_db_connection()
        cursor = connection.cursor()

        # Fetch old teacher info for class assignment renaming
        cursor.execute("SELECT id, full_name, nickname, password, photo_url FROM users WHERE id = %s", (str(teacher_id),))
        old_user = cursor.fetchone()
        old_full_name = (old_user['full_name'] if isinstance(old_user, dict) else old_user[1]) if old_user else ''
        old_pwd = (old_user['password'] if isinstance(old_user, dict) else old_user[3]) if old_user else 'password123'
        old_photo = (old_user['photo_url'] if isinstance(old_user, dict) else (old_user[4] if len(old_user) > 4 else '')) if old_user else ''

        final_pwd = password if password else (old_pwd or 'password123')
        final_photo = photo_url if photo_url is not None else old_photo

        # Update users table
        cursor.execute("""
            UPDATE users 
            SET id = %s,
                full_name = %s,
                nickname = %s,
                gender = %s,
                contact = %s,
                email = %s,
                jurusan = %s,
                password = %s,
                photo_url = %s
            WHERE id = %s
        """, (
            new_id, full_name, nickname, gender, contact, email, jurusan,
            final_pwd, final_photo, str(teacher_id)
        ))

        # Update tutors table
        try:
            cursor.execute("""
                UPDATE tutors 
                SET id = %s,
                    teacher_code = %s,
                    full_name = %s,
                    nickname = %s,
                    gender = %s,
                    contact = %s,
                    email = %s,
                    jurusan = %s,
                    specialization = %s,
                    password = %s,
                    photo_url = %s
                WHERE id = %s OR teacher_code = %s
            """, (
                new_id, new_id, full_name, nickname, gender, contact, email, jurusan, jurusan,
                final_pwd, final_photo, str(teacher_id), str(teacher_id)
            ))
        except Exception:
            pass

        # Update class assignments if full_name changed
        if old_full_name and old_full_name != full_name:
            try:
                cursor.execute("""
                    UPDATE class_assignments 
                    SET teacher_name = %s 
                    WHERE teacher_name = %s OR teacher_name LIKE %s
                """, (full_name, old_full_name, f"%{nickname}%" if nickname else f"%{old_full_name}%"))
            except Exception:
                pass

        try:
            connection.commit()
        except Exception:
            pass

        cursor.close()
        return jsonify({
            "status": "success",
            "message": "Data pengajar berhasil diperbarui!",
            "data": {
                "id": new_id,
                "teacher_code": new_id,
                "full_name": full_name,
                "nickname": nickname,
                "gender": gender,
                "contact": contact,
                "phone": contact,
                "email": email,
                "jurusan": jurusan,
                "specialization": jurusan,
                "password": final_pwd,
                "password_display": final_pwd,
                "photo_url": final_photo
            }
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if connection and hasattr(connection, 'close'):
            connection.close()

@teachers_bp.route('/api/teachers/<teacher_id>', methods=['DELETE'])
def delete_teacher(teacher_id):
    """
    DELETE /api/teachers/<teacher_id>
    Deletes teacher record from users and tutors, and clears assignments.
    """
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        # Find teacher to get full_name and nickname
        cursor.execute("SELECT full_name, nickname FROM users WHERE id = %s", (str(teacher_id),))
        teacher = cursor.fetchone()
        t_name = (teacher['full_name'] if isinstance(teacher, dict) else teacher[0]) if teacher else str(teacher_id)
        t_nick = (teacher['nickname'] if isinstance(teacher, dict) else teacher[1]) if (teacher and len(teacher) > 1) else ''

        # Delete from users and tutors
        cursor.execute("DELETE FROM users WHERE id = %s", (str(teacher_id),))
        try:
            cursor.execute("DELETE FROM tutors WHERE id = %s OR teacher_code = %s", (str(teacher_id), str(teacher_id)))
        except Exception:
            pass

        # Clear assignments from class_assignments
        try:
            cursor.execute("""
                UPDATE class_assignments 
                SET teacher_name = '' 
                WHERE teacher_name = %s OR teacher_name LIKE %s OR teacher_name LIKE %s
            """, (t_name, f"%{t_name}%", f"%{t_nick}%" if t_nick else f"%{t_name}%"))
        except Exception:
            pass

        try:
            connection.commit()
        except Exception:
            pass

        cursor.close()
        return jsonify({
            "status": "success",
            "message": f"Pengajar {t_name} berhasil dihapus beserta penugasan kelasnya."
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if connection and hasattr(connection, 'close'):
            connection.close()

# =====================================================
# 2027 ARCHITECTURE: CLASS ASSIGNMENTS
# =====================================================
@teachers_bp.route('/api/classes/assignments', methods=['GET'])
def get_class_assignments():
    """
    GET /api/classes/assignments
    Returns all teacher assignments per class.
    """
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute("SELECT class_name, teacher_name FROM class_assignments ORDER BY class_name ASC")
        if hasattr(cursor, 'description') and cursor.description:
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            result = rows if rows and isinstance(rows[0], dict) else [dict(zip(columns, row)) for row in rows]
        else:
            result = []
        cursor.close()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection and hasattr(connection, 'close'):
            connection.close()

@teachers_bp.route('/api/classes/assignments', methods=['POST'])
def save_class_assignments():
    """
    POST /api/classes/assignments
    Upserts teacher assignments.
    Body can be:
      - { "assignments": [{"class_name": "...", "teacher_name": "..."}, ...] }
      - [{"class_name": "...", "teacher_name": "..."}, ...]
      - {"class_name": "...", "teacher_name": "..."}
    """
    connection = None
    try:
        data = request.get_json() or {}
        if isinstance(data, list):
            assignments = data
        elif isinstance(data, dict):
            if 'assignments' in data and isinstance(data['assignments'], list):
                assignments = data['assignments']
            elif 'class_name' in data:
                assignments = [data]
            else:
                assignments = []
        else:
            assignments = []

        if len(assignments) == 0:
            return jsonify({'error': 'Penugasan kelas wajib disediakan.'}), 400

        connection = get_db_connection()
        cursor = connection.cursor()
        for item in assignments:
            raw_class_name = str(item.get('class_name', '')).strip()
            teacher_name   = str(item.get('teacher_name', '')).strip()
            class_name     = normalize_short_class_name(raw_class_name)
            if not class_name:
                continue
            cursor.execute(
                """INSERT INTO class_assignments (class_name, teacher_name)
                   VALUES (%s, %s)
                   ON DUPLICATE KEY UPDATE teacher_name = VALUES(teacher_name)""",
                (class_name, teacher_name)
            )
        if not getattr(connection, 'autocommit', False):
            connection.commit()
        cursor.close()
        return jsonify({'status': 'success', 'message': 'Penugasan pengajar berhasil disimpan!'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection and hasattr(connection, 'close'):
            connection.close()
