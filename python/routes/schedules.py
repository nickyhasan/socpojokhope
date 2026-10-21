import datetime
from flask import Blueprint, request, jsonify

try:
    from database import get_db, get_db_connection, normalize_short_class_name
except ImportError:
    from ..database import get_db, get_db_connection, normalize_short_class_name

schedules_bp = Blueprint('schedules', __name__)

@schedules_bp.route('/api/schedules', methods=['GET'])
def get_schedules():
    """
    GET /api/schedules?kelas=A
    Fetches scheduled class sessions from classes table, filtered by class.
    """
    kelas = request.args.get('kelas') or request.args.get('class')
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        if kelas:
            norm_k = normalize_short_class_name(kelas)
            query = "SELECT * FROM classes WHERE UPPER(kelas) = %s OR UPPER(kelas) = %s OR UPPER(kelas) = 'SEMUA' ORDER BY date ASC"
            cursor.execute(query, (kelas.upper(), (norm_k or kelas).upper()))
        else:
            query = "SELECT * FROM classes ORDER BY date DESC"
            cursor.execute(query)

        if hasattr(cursor, 'description') and cursor.description:
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            schedules = rows if rows and isinstance(rows[0], dict) else [dict(zip(columns, row)) for row in rows]
            for s in schedules:
                if isinstance(s.get('date'), (datetime.date, datetime.datetime)):
                    s['date'] = s['date'].isoformat()
                if isinstance(s.get('start_time'), datetime.timedelta):
                    s['start_time'] = str(s['start_time'])
                if isinstance(s.get('end_time'), datetime.timedelta):
                    s['end_time'] = str(s['end_time'])
        else:
            schedules = []

        cursor.close()
        return jsonify(schedules), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if connection and hasattr(connection, 'close'):
            connection.close()

@schedules_bp.route('/api/schedules', methods=['POST'])
def create_schedule():
    """
    POST /api/schedules
    Receives JSON {"date": "YYYY-MM-DD", "mata_pelajaran": "...", "kelas": "...", "topik": "...", "materi_link": "...", "start_time": "...", "end_time": "...", "lokasi": "...", "catatan": "..."},
    inserts into classes table, and returns 200 OK response.
    """
    connection = None
    try:
        data = request.get_json() or {}
        date_str = data.get('date')
        mata_pelajaran = data.get('mata_pelajaran')
        kelas = normalize_short_class_name(data.get('kelas'))
        topik = (data.get('topik') or '').strip()
        materi_link = (data.get('materi_link') or '').strip()
        link_materi_siswa = (data.get('link_materi_siswa') or '').strip()
        start_time = (data.get('start_time') or '14:00').strip()
        end_time = (data.get('end_time') or '15:30').strip()
        lokasi = (data.get('lokasi') or 'Kelas Pojok Hope').strip()
        catatan = (data.get('catatan') or '').strip()

        if not date_str or not mata_pelajaran or not kelas:
            return jsonify({"error": "Data 'date', 'mata_pelajaran', dan 'kelas' wajib diisi."}), 400

        connection = get_db_connection()
        cursor = connection.cursor()

        query = """
            INSERT INTO classes (date, mata_pelajaran, kelas, topik, materi_link, link_materi_siswa, start_time, end_time, lokasi, catatan) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(query, (
            date_str, 
            mata_pelajaran, 
            kelas, 
            topik if topik else None, 
            materi_link if materi_link else None,
            link_materi_siswa if link_materi_siswa else None,
            start_time if start_time else '14:00',
            end_time if end_time else '15:30',
            lokasi if lokasi else 'Kelas Pojok Hope',
            catatan if catatan else None
        ))

        if not getattr(connection, 'autocommit', False):
            connection.commit()

        cursor.close()
        return jsonify({
            "status": "success",
            "message": "Jadwal berhasil ditambahkan!",
            "data": {
                "date": date_str,
                "mata_pelajaran": mata_pelajaran,
                "kelas": kelas,
                "topik": topik,
                "materi_link": materi_link,
                "link_materi_siswa": link_materi_siswa,
                "start_time": start_time,
                "end_time": end_time,
                "lokasi": lokasi,
                "catatan": catatan
            }
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if connection and hasattr(connection, 'close'):
            connection.close()

@schedules_bp.route('/api/schedules/bulk', methods=['POST'])
def bulk_create_schedules():
    """
    POST /api/schedules/bulk
    Receives JSON array of schedule items from Excel import and inserts them in a single transaction.
    """
    connection = None
    try:
        data = request.get_json() or {}
        schedules_list = data if isinstance(data, list) else data.get('schedules', [])
        if not schedules_list or not isinstance(schedules_list, list):
            return jsonify({"error": "Daftar jadwal (array) wajib disediakan."}), 400

        connection = get_db_connection()
        cursor = connection.cursor()

        created_count = 0
        for item in schedules_list:
            date_str = (item.get('date') or item.get('Tanggal') or item.get('tanggal') or '').strip()
            mata_pelajaran = (item.get('mata_pelajaran') or item.get('Mata Pelajaran') or item.get('mapel') or '').strip()
            kelas = normalize_short_class_name((item.get('kelas') or item.get('Kelas') or 'Semua').strip())
            topik = (item.get('topik') or item.get('Topik') or item.get('Topik Materi') or item.get('topik_materi') or '').strip()
            materi_link = (item.get('materi_link') or item.get('Link Materi') or item.get('Link Materi Guru') or item.get('link_materi') or '').strip()
            link_materi_siswa = (item.get('link_materi_siswa') or item.get('Link Materi Siswa') or item.get('link_siswa') or item.get('Link Siswa') or '').strip()
            start_time = (item.get('start_time') or item.get('Waktu Mulai') or '14:00').strip()
            end_time = (item.get('end_time') or item.get('Waktu Selesai') or '15:30').strip()
            lokasi = (item.get('lokasi') or item.get('Lokasi') or 'Kelas Pojok Hope').strip()
            catatan = (item.get('catatan') or item.get('Catatan') or '').strip()

            if not date_str or not mata_pelajaran:
                continue

            # Ensure date format is YYYY-MM-DD
            if '/' in date_str:
                d_parts = date_str.split('/')
                if len(d_parts) == 3:
                    if len(d_parts[0]) == 4:
                        date_str = f"{d_parts[0]}-{d_parts[1].zfill(2)}-{d_parts[2].zfill(2)}"
                    else:
                        date_str = f"{d_parts[2]}-{d_parts[1].zfill(2)}-{d_parts[0].zfill(2)}"

            cursor.execute("""
                INSERT INTO classes (date, mata_pelajaran, kelas, topik, materi_link, link_materi_siswa, start_time, end_time, lokasi, catatan) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                date_str, mata_pelajaran, kelas,
                topik if topik else None,
                materi_link if materi_link else None,
                link_materi_siswa if link_materi_siswa else None,
                start_time if start_time else '14:00',
                end_time if end_time else '15:30',
                lokasi if lokasi else 'Kelas Pojok Hope',
                catatan if catatan else None
            ))
            created_count += 1

        if not getattr(connection, 'autocommit', False):
            connection.commit()

        cursor.close()
        return jsonify({
            "status": "success",
            "message": f"Berhasil menambahkan {created_count} sesi jadwal secara massal!",
            "count": created_count
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

@schedules_bp.route('/api/schedules/<int:sched_id>', methods=['PUT'])
def update_schedule(sched_id):
    """
    PUT /api/schedules/<int:sched_id>
    Accepts updated JSON payload and updates the specific row in classes table.
    """
    connection = None
    try:
        data = request.get_json() or {}
        date_str = data.get('date')
        mata_pelajaran = data.get('mata_pelajaran')
        kelas = normalize_short_class_name(data.get('kelas'))
        topik = (data.get('topik') or '').strip()
        materi_link = (data.get('materi_link') or '').strip()
        link_materi_siswa = (data.get('link_materi_siswa') or '').strip()
        start_time = (data.get('start_time') or '14:00').strip()
        end_time = (data.get('end_time') or '15:30').strip()
        lokasi = (data.get('lokasi') or 'Kelas Pojok Hope').strip()
        catatan = (data.get('catatan') or '').strip()

        if not date_str or not mata_pelajaran or not kelas:
            return jsonify({"error": "Data 'date', 'mata_pelajaran', dan 'kelas' wajib diisi."}), 400

        connection = get_db_connection()
        cursor = connection.cursor()

        query = """
            UPDATE classes 
            SET date = %s, mata_pelajaran = %s, kelas = %s, topik = %s, materi_link = %s, 
                link_materi_siswa = %s, start_time = %s, end_time = %s, lokasi = %s, catatan = %s
            WHERE id = %s
        """
        cursor.execute(query, (
            date_str,
            mata_pelajaran,
            kelas,
            topik if topik else None,
            materi_link if materi_link else None,
            link_materi_siswa if link_materi_siswa else None,
            start_time if start_time else '14:00',
            end_time if end_time else '15:30',
            lokasi if lokasi else 'Kelas Pojok Hope',
            catatan if catatan else None,
            sched_id
        ))

        if not getattr(connection, 'autocommit', False):
            connection.commit()

        cursor.close()
        return jsonify({
            "status": "success",
            "message": "Jadwal berhasil diperbarui!",
            "data": {
                "id": sched_id,
                "date": date_str,
                "mata_pelajaran": mata_pelajaran,
                "kelas": kelas,
                "topik": topik,
                "materi_link": materi_link,
                "link_materi_siswa": link_materi_siswa,
                "start_time": start_time,
                "end_time": end_time,
                "lokasi": lokasi,
                "catatan": catatan
            }
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if connection and hasattr(connection, 'close'):
            connection.close()

@schedules_bp.route('/api/schedules/<int:sched_id>', methods=['DELETE'])
def delete_schedule(sched_id):
    """
    DELETE /api/schedules/<int:sched_id>
    Deletes the row from classes table where id = sched_id.
    """
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute("DELETE FROM classes WHERE id = %s", (sched_id,))

        if not getattr(connection, 'autocommit', False):
            connection.commit()

        cursor.close()
        return jsonify({
            "status": "success",
            "message": "Jadwal berhasil dihapus!"
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if connection and hasattr(connection, 'close'):
            connection.close()
