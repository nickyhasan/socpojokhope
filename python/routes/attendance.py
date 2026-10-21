import datetime
from flask import Blueprint, request, jsonify

try:
    from database import get_db, get_db_connection
except ImportError:
    from ..database import get_db, get_db_connection

attendance_bp = Blueprint('attendance', __name__)

@attendance_bp.route('/api/attendance', methods=['GET'])
def get_attendance():
    """
    GET /api/attendance?date=2026-09-24&kelas=A
    GET /api/attendance?student_id=1
    Fetches attendance records for a specific date/class or specific student, including mata_pelajaran.
    """
    date_str = request.args.get('date')
    kelas = request.args.get('kelas') or request.args.get('class')
    student_id = request.args.get('student_id')

    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        if student_id:
            query = """
                SELECT a.id, a.student_id, a.date, a.status, COALESCE(a.mata_pelajaran, 'Karakter') as mata_pelajaran, 
                       s.full_name, s.kelas_english, s.kelas_math, COALESCE(s.kelas_english, s.kelas_math) as kelas
                FROM attendance a
                JOIN students s ON a.student_id = s.id
                WHERE a.student_id = %s
                ORDER BY a.date ASC
            """
            cursor.execute(query, (student_id,))
        elif kelas and date_str:
            query = """
                SELECT a.id, a.student_id, a.date, a.status, COALESCE(a.mata_pelajaran, 'Karakter') as mata_pelajaran, 
                       s.full_name, s.kelas_english, s.kelas_math, COALESCE(s.kelas_english, s.kelas_math) as kelas
                FROM attendance a
                JOIN students s ON a.student_id = s.id
                WHERE a.date = %s AND (UPPER(s.kelas_english) = %s OR UPPER(s.kelas_math) = %s)
            """
            cursor.execute(query, (date_str, kelas.upper(), kelas.upper()))
        elif kelas:
            query = """
                SELECT a.id, a.student_id, a.date, a.status, COALESCE(a.mata_pelajaran, 'Karakter') as mata_pelajaran, 
                       s.full_name, s.kelas_english, s.kelas_math, COALESCE(s.kelas_english, s.kelas_math) as kelas
                FROM attendance a
                JOIN students s ON a.student_id = s.id
                WHERE (UPPER(s.kelas_english) = %s OR UPPER(s.kelas_math) = %s)
                ORDER BY a.date ASC
            """
            cursor.execute(query, (kelas.upper(), kelas.upper()))
        elif date_str:
            query = """
                SELECT a.id, a.student_id, a.date, a.status, COALESCE(a.mata_pelajaran, 'Karakter') as mata_pelajaran, 
                       s.full_name, s.kelas_english, s.kelas_math, COALESCE(s.kelas_english, s.kelas_math) as kelas
                FROM attendance a
                JOIN students s ON a.student_id = s.id
                WHERE a.date = %s
                ORDER BY a.date ASC
            """
            cursor.execute(query, (date_str,))
        else:
            query = """
                SELECT a.id, a.student_id, a.date, a.status, COALESCE(a.mata_pelajaran, 'Karakter') as mata_pelajaran, 
                       s.full_name, s.kelas_english, s.kelas_math, COALESCE(s.kelas_english, s.kelas_math) as kelas
                FROM attendance a
                JOIN students s ON a.student_id = s.id
                ORDER BY a.date ASC
            """
            cursor.execute(query)

        if hasattr(cursor, 'description') and cursor.description:
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            records = rows if rows and isinstance(rows[0], dict) else [dict(zip(columns, row)) for row in rows]
            for r in records:
                if isinstance(r.get('date'), (datetime.date, datetime.datetime)):
                    r['date'] = r['date'].isoformat()
        else:
            records = []

        cursor.close()
        return jsonify(records), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if connection and hasattr(connection, 'close'):
            connection.close()

@attendance_bp.route('/api/attendance', methods=['POST'])
def record_attendance():
    """
    POST /api/attendance
    Receives JSON containing 'student_id', 'date', 'status', and optionally 'mata_pelajaran',
    inserts or updates the record in the 'attendance' table.
    """
    connection = None
    try:
        data = request.get_json() or {}
        student_id = data.get('student_id')
        date_str = data.get('date') or datetime.date.today().isoformat()
        status = data.get('status')
        mata_pelajaran = data.get('mata_pelajaran') or 'Karakter'

        if not student_id or not status:
            return jsonify({"error": "Data 'student_id' dan 'status' wajib diisi."}), 400

        connection = get_db_connection()
        cursor = connection.cursor()

        query = """
            INSERT INTO attendance (student_id, date, status, mata_pelajaran)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE status = VALUES(status), mata_pelajaran = VALUES(mata_pelajaran)
        """
        cursor.execute(query, (student_id, date_str, status, mata_pelajaran))

        if not getattr(connection, 'autocommit', False):
            connection.commit()

        cursor.close()
        return jsonify({
            "message": "Absensi berhasil disimpan di database",
            "data": {
                "student_id": student_id,
                "date": date_str,
                "status": status,
                "mata_pelajaran": mata_pelajaran
            }
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if connection and hasattr(connection, 'close'):
            connection.close()

@attendance_bp.route('/api/attendance/history', methods=['GET'])
def get_attendance_history():
    """
    GET /api/attendance/history?kelas=A
    Returns summary history grouped by date, class, and mata_pelajaran for the interactive history table.
    Filters strictly by class if 'kelas' or 'class' parameter is provided.
    """
    kelas = request.args.get('kelas') or request.args.get('class')
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        if kelas:
            query = """
                SELECT 
                    a.date,
                    COALESCE(s.kelas_english, s.kelas_math, 'Semua') as kelas,
                    COALESCE(a.mata_pelajaran, 'Karakter') as mata_pelajaran,
                    COUNT(CASE WHEN a.status = 'Hadir' THEN 1 END) as hadir_count,
                    COUNT(CASE WHEN a.status = 'Sakit' THEN 1 END) as sakit_count,
                    COUNT(CASE WHEN a.status = 'Izin' THEN 1 END) as izin_count,
                    COUNT(CASE WHEN a.status = 'Alpa' THEN 1 END) as alpa_count,
                    COUNT(*) as total_records
                FROM attendance a
                JOIN students s ON a.student_id = s.id
                WHERE (UPPER(s.kelas_english) = %s OR UPPER(s.kelas_math) = %s)
                GROUP BY a.date, COALESCE(s.kelas_english, s.kelas_math, 'Semua'), COALESCE(a.mata_pelajaran, 'Karakter')
                ORDER BY a.date DESC
                LIMIT 20
            """
            cursor.execute(query, (kelas.upper(), kelas.upper()))
        else:
            query = """
                SELECT 
                    a.date,
                    COALESCE(s.kelas_english, s.kelas_math, 'Semua') as kelas,
                    COALESCE(a.mata_pelajaran, 'Karakter') as mata_pelajaran,
                    COUNT(CASE WHEN a.status = 'Hadir' THEN 1 END) as hadir_count,
                    COUNT(CASE WHEN a.status = 'Sakit' THEN 1 END) as sakit_count,
                    COUNT(CASE WHEN a.status = 'Izin' THEN 1 END) as izin_count,
                    COUNT(CASE WHEN a.status = 'Alpa' THEN 1 END) as alpa_count,
                    COUNT(*) as total_records
                FROM attendance a
                JOIN students s ON a.student_id = s.id
                GROUP BY a.date, COALESCE(s.kelas_english, s.kelas_math, 'Semua'), COALESCE(a.mata_pelajaran, 'Karakter')
                ORDER BY a.date DESC
                LIMIT 20
            """
            cursor.execute(query)

        if hasattr(cursor, 'description') and cursor.description:
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            history = rows if rows and isinstance(rows[0], dict) else [dict(zip(columns, row)) for row in rows]
            for h in history:
                if isinstance(h.get('date'), (datetime.date, datetime.datetime)):
                    h['date'] = h['date'].isoformat()
        else:
            history = []

        cursor.close()
        return jsonify(history), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if connection and hasattr(connection, 'close'):
            connection.close()
