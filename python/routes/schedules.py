import re
import datetime
from flask import Blueprint, request, jsonify

try:
    from database import get_db, get_db_connection, normalize_short_class_name, normalize_schedule_date, normalize_subject_name, normalize_schedule_class
except ImportError:
    from ..database import get_db, get_db_connection, normalize_short_class_name, normalize_schedule_date, normalize_subject_name, normalize_schedule_class

# Alias parse_schedule_date to use comprehensive normalizer
parse_schedule_date = normalize_schedule_date

def parse_schedule_time(val, default='16:00'):
    if not val:
        return default
    if isinstance(val, datetime.timedelta):
        total_seconds = int(val.total_seconds())
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        return f"{str(hours).zfill(2)}:{str(minutes).zfill(2)}"
    if isinstance(val, (datetime.time, datetime.datetime)):
        return val.strftime('%H:%M')
    s = str(val).strip()
    if not s or s == '-':
        return default
    # Handle AM/PM
    am_pm = re.search(r'(am|pm)', s, re.IGNORECASE)
    if am_pm:
        is_pm = am_pm.group(1).lower() == 'pm'
        clean_s = re.sub(r'[a-zA-Z\s]', '', s)
        parts = clean_s.split(':')
        if parts:
            try:
                h = int(parts[0])
                m = int(parts[1]) if len(parts) > 1 else 0
                if is_pm and h < 12:
                    h += 12
                elif not is_pm and h == 12:
                    h = 0
                return f"{str(h).zfill(2)}:{str(m).zfill(2)}"
            except Exception:
                pass
    m = re.match(r'^(\d{1,2}):(\d{1,2})', s)
    if m:
        return f"{m.group(1).zfill(2)}:{m.group(2).zfill(2)}"
    try:
        f = float(s)
        if 0 <= f < 1:
            total_minutes = int(round(f * 24 * 60))
            h = (total_minutes // 60) % 24
            m = total_minutes % 60
            return f"{str(h).zfill(2)}:{str(m).zfill(2)}"
    except ValueError:
        pass
    return default

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
            HARI_NAMES = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
            BULAN_NAMES = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

            for s in schedules:
                d_val = s.get('date')
                dt_obj = None
                if isinstance(d_val, (datetime.date, datetime.datetime)):
                    dt_obj = d_val if isinstance(d_val, datetime.date) else d_val.date()
                    s['date'] = d_val.isoformat()
                elif isinstance(d_val, str) and d_val:
                    try:
                        clean_d = d_val.split('T')[0]
                        dt_obj = datetime.datetime.strptime(clean_d, '%Y-%m-%d').date()
                        s['date'] = clean_d
                    except Exception:
                        pass

                s['tanggal'] = s.get('date')
                if dt_obj:
                    s['hari'] = HARI_NAMES[dt_obj.weekday()]
                    s['bulan'] = BULAN_NAMES[dt_obj.month]
                    s['tahun'] = dt_obj.year
                else:
                    s['hari'] = ''
                    s['bulan'] = ''
                    s['tahun'] = ''

                st = s.get('start_time')
                et = s.get('end_time')
                if isinstance(st, datetime.timedelta):
                    total_s = int(st.total_seconds())
                    st_str = f"{str(total_s // 3600).zfill(2)}:{str((total_s % 3600) // 60).zfill(2)}"
                    s['start_time'] = st_str
                elif isinstance(st, (datetime.time, datetime.datetime)):
                    s['start_time'] = st.strftime('%H:%M')
                elif st:
                    s['start_time'] = str(st)[:5]

                if isinstance(et, datetime.timedelta):
                    total_s = int(et.total_seconds())
                    et_str = f"{str(total_s // 3600).zfill(2)}:{str((total_s % 3600) // 60).zfill(2)}"
                    s['end_time'] = et_str
                elif isinstance(et, (datetime.time, datetime.datetime)):
                    s['end_time'] = et.strftime('%H:%M')
                elif et:
                    s['end_time'] = str(et)[:5]

                s['waktu'] = f"{s.get('start_time') or '16:00'} - {s.get('end_time') or '18:00'}"
                s['link_materi'] = s.get('materi_link') or ''
                norm_sub = normalize_subject_name(s.get('mata_pelajaran'))
                s['mata_pelajaran'] = norm_sub
                s['kelas'] = normalize_schedule_class(s.get('kelas'), norm_sub)
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
    Checks for duplicate schedule and returns 409 Conflict if already exists.
    """
    connection = None
    try:
        data = request.get_json() or {}
        raw_date = data.get('date') or data.get('tanggal')
        date_str = normalize_schedule_date(raw_date)
        raw_mapel = data.get('mata_pelajaran') or data.get('subject')
        mata_pelajaran = normalize_subject_name(raw_mapel)
        raw_kelas = data.get('kelas')
        kelas = normalize_schedule_class(raw_kelas, mata_pelajaran)
        topik = (data.get('topik') or '').strip()
        materi_link = (data.get('materi_link') or data.get('link_materi') or '').strip()
        link_materi_siswa = (data.get('link_materi_siswa') or '').strip()
        raw_waktu = data.get('waktu') or ''
        st_val = data.get('start_time')
        et_val = data.get('end_time')
        if raw_waktu and '-' in raw_waktu:
            parts = raw_waktu.split('-')
            if not st_val: st_val = parts[0].strip()
            if not et_val: et_val = parts[1].strip()
        start_time = parse_schedule_time(st_val or '16:00', '16:00')
        end_time = parse_schedule_time(et_val or '18:00', '18:00')
        lokasi = (data.get('lokasi') or 'Kelas Pojok Hope').strip()
        catatan = (data.get('catatan') or '').strip()

        if not date_str or not mata_pelajaran or not kelas:
            return jsonify({"error": "Data 'date', 'mata_pelajaran', dan 'kelas' wajib diisi."}), 400

        connection = get_db_connection()
        cursor = connection.cursor()

        # Check duplicate before inserting
        cursor.execute(
            "SELECT id FROM classes WHERE date = %s AND mata_pelajaran = %s AND kelas = %s AND start_time = %s",
            (date_str, mata_pelajaran, kelas, start_time)
        )
        existing = cursor.fetchone()
        if existing:
            cursor.close()
            return jsonify({
                "error": f"Jadwal untuk mata pelajaran {mata_pelajaran} kelas {kelas} pada tanggal {date_str} pukul {start_time} sudah ada!"
            }), 409

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
            start_time if start_time else '16:00',
            end_time if end_time else '18:00',
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
    Skips duplicates in DB or batch and returns detailed duplicate statistics.
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
        updated_count = 0
        skipped_duplicates = []
        batch_seen = set()
        first_date = None

        for item in schedules_list:
            raw_date = item.get('date') or item.get('Tanggal') or item.get('tanggal') or item.get('Tanggal (YYYY-MM-DD)')
            date_str = normalize_schedule_date(raw_date)
            raw_mapel = (item.get('mata_pelajaran') or item.get('Mata Pelajaran') or item.get('mapel') or '').strip()
            mata_pelajaran = normalize_subject_name(raw_mapel)
            raw_kelas = (item.get('kelas') or item.get('Kelas') or 'Semua').strip()
            kelas = normalize_schedule_class(raw_kelas, mata_pelajaran)
            topik = (item.get('topik') or item.get('Topik') or item.get('Topik Materi') or item.get('topik_materi') or '').strip()
            materi_link = (item.get('materi_link') or item.get('Link Materi') or item.get('Link Materi Guru') or item.get('link_materi') or '').strip()
            link_materi_siswa = (item.get('link_materi_siswa') or item.get('Link Materi Siswa') or item.get('link_siswa') or item.get('Link Siswa') or '').strip()
            raw_waktu = item.get('waktu') or item.get('Waktu') or ''
            raw_start = item.get('start_time') or item.get('Waktu Mulai') or item.get('Waktu Mulai (HH:MM)')
            raw_end = item.get('end_time') or item.get('Waktu Selesai') or item.get('Waktu Selesai (HH:MM)')
            if raw_waktu and '-' in raw_waktu:
                w_parts = raw_waktu.split('-')
                if not raw_start: raw_start = w_parts[0].strip()
                if not raw_end: raw_end = w_parts[1].strip()
            start_time = parse_schedule_time(raw_start, '16:00')
            end_time = parse_schedule_time(raw_end, '18:00')
            lokasi = (item.get('lokasi') or item.get('Lokasi') or 'Kelas Pojok Hope').strip()
            catatan = (item.get('catatan') or item.get('Catatan') or '').strip()

            if not date_str or not mata_pelajaran:
                continue

            dup_key = (date_str, mata_pelajaran, kelas, start_time)

            if dup_key in batch_seen:
                skipped_duplicates.append({
                    "date": date_str,
                    "mata_pelajaran": mata_pelajaran,
                    "kelas": kelas,
                    "start_time": start_time,
                    "reason": "Duplikat di dalam batch upload"
                })
                continue

            # Check if exists in database: if exists, update (upsert)
            cursor.execute(
                "SELECT id FROM classes WHERE date = %s AND mata_pelajaran = %s AND kelas = %s AND start_time = %s",
                (date_str, mata_pelajaran, kelas, start_time)
            )
            existing = cursor.fetchone()
            if existing:
                exist_id = existing['id'] if isinstance(existing, dict) else existing[0]
                cursor.execute("""
                    UPDATE classes 
                    SET topik = COALESCE(%s, topik),
                        materi_link = COALESCE(%s, materi_link),
                        link_materi_siswa = COALESCE(%s, link_materi_siswa),
                        end_time = %s,
                        lokasi = %s,
                        catatan = COALESCE(%s, catatan)
                    WHERE id = %s
                """, (
                    topik if topik else None,
                    materi_link if materi_link else None,
                    link_materi_siswa if link_materi_siswa else None,
                    end_time if end_time else '18:00',
                    lokasi if lokasi else 'Kelas Pojok Hope',
                    catatan if catatan else None,
                    exist_id
                ))
                updated_count += 1
                batch_seen.add(dup_key)
                if not first_date:
                    first_date = date_str
                continue

            batch_seen.add(dup_key)

            if not first_date:
                first_date = date_str

            cursor.execute("""
                INSERT INTO classes (date, mata_pelajaran, kelas, topik, materi_link, link_materi_siswa, start_time, end_time, lokasi, catatan) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                date_str, mata_pelajaran, kelas,
                topik if topik else None,
                materi_link if materi_link else None,
                link_materi_siswa if link_materi_siswa else None,
                start_time if start_time else '16:00',
                end_time if end_time else '18:00',
                lokasi if lokasi else 'Kelas Pojok Hope',
                catatan if catatan else None
            ))
            created_count += 1

        if not getattr(connection, 'autocommit', False):
            connection.commit()

        first_month = None
        first_year = None
        if first_date:
            parts = first_date.split('-')
            if len(parts) >= 2:
                try:
                    first_year = int(parts[0])
                    first_month = int(parts[1])
                except Exception:
                    pass

        cursor.close()
        return jsonify({
            "status": "success",
            "message": f"Berhasil memproses jadwal: {created_count} baru ditambahkan, {updated_count} diperbarui." if (created_count > 0 or updated_count > 0) else "Tidak ada jadwal baru yang ditambahkan.",
            "count": created_count + updated_count,
            "inserted_count": created_count,
            "updated_count": updated_count,
            "skipped_count": len(skipped_duplicates),
            "skipped_duplicates": skipped_duplicates,
            "first_inserted_month": f"{first_year:04d}-{first_month:02d}" if first_year and first_month else None,
            "month": first_month,
            "year": first_year
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
    Checks for duplicate before updating.
    """
    connection = None
    try:
        data = request.get_json() or {}
        raw_date = data.get('date') or data.get('tanggal')
        date_str = normalize_schedule_date(raw_date)
        raw_mapel = data.get('mata_pelajaran') or data.get('subject')
        mata_pelajaran = normalize_subject_name(raw_mapel)
        raw_kelas = data.get('kelas')
        kelas = normalize_schedule_class(raw_kelas, mata_pelajaran)
        topik = (data.get('topik') or '').strip()
        materi_link = (data.get('materi_link') or data.get('link_materi') or '').strip()
        link_materi_siswa = (data.get('link_materi_siswa') or '').strip()
        raw_waktu = data.get('waktu') or ''
        st_val = data.get('start_time')
        et_val = data.get('end_time')
        if raw_waktu and '-' in raw_waktu:
            parts = raw_waktu.split('-')
            if not st_val: st_val = parts[0].strip()
            if not et_val: et_val = parts[1].strip()
        start_time = parse_schedule_time(st_val or '16:00', '16:00')
        end_time = parse_schedule_time(et_val or '18:00', '18:00')
        lokasi = (data.get('lokasi') or 'Kelas Pojok Hope').strip()
        catatan = (data.get('catatan') or '').strip()

        if not date_str or not mata_pelajaran or not kelas:
            return jsonify({"error": "Data 'date', 'mata_pelajaran', dan 'kelas' wajib diisi."}), 400

        connection = get_db_connection()
        cursor = connection.cursor()

        # Check duplicate excluding current schedule id
        cursor.execute(
            "SELECT id FROM classes WHERE date = %s AND mata_pelajaran = %s AND kelas = %s AND start_time = %s AND id != %s",
            (date_str, mata_pelajaran, kelas, start_time, sched_id)
        )
        existing = cursor.fetchone()
        if existing:
            cursor.close()
            return jsonify({
                "error": f"Jadwal untuk mata pelajaran {mata_pelajaran} kelas {kelas} pada tanggal {date_str} pukul {start_time} sudah ada!"
            }), 409

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
            start_time if start_time else '16:00',
            end_time if end_time else '18:00',
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
