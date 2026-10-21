import json
from flask import Blueprint, request, jsonify

try:
    from database import get_db, get_db_connection
except ImportError:
    from ..database import get_db, get_db_connection

settings_bp = Blueprint('settings', __name__)

DEFAULT_SETTINGS = {
    'alamat_soc': 'Jln Pasar Minggu, Kec Kabila, Desa Dutohe, Gorontalo.',
    'jam_operasional': 'Senin - Sabtu (14:00 - 17:30 WITA)',
    'sponsors_json': json.dumps([
        {"name": "Allies Youth Development", "url": "https://alliesyouth.org/", "icon": "fas fa-hand-holding-heart"},
        {"name": "Peacemakers Indonesia", "url": "https://www.instagram.com/pismovement/", "icon": "fab fa-instagram"}
    ]),
    'reg_siswa_open': 'true',
    'reg_siswa_url': 'https://docs.google.com/forms/d/e/1FAIpQLScb42Ck9syRCpdjbPYyQdnheEpfDlES66TnP3cVtMfkzevC3g/viewform?usp=header',
    'reg_guru_open': 'true',
    'reg_guru_url': 'https://docs.google.com/forms/d/e/1FAIpQLScb42Ck9syRCpdjbPYyQdnheEpfDlES66TnP3cVtMfkzevC3g/viewform?usp=header',
    'reg_volunteer_open': 'true',
    'reg_volunteer_url': 'https://docs.google.com/forms/d/e/1FAIpQLScb42Ck9syRCpdjbPYyQdnheEpfDlES66TnP3cVtMfkzevC3g/viewform?usp=header'
}

@settings_bp.route('/api/settings', methods=['GET'])
def get_settings():
    """
    GET /api/settings
    Public endpoint: returns site settings such as alamat_soc, jam_operasional, sponsors_json, and registration controls.
    """
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute("SELECT key_name, value_text FROM site_settings")
        rows = cursor.fetchall()
        settings = dict(DEFAULT_SETTINGS)
        for r in rows:
            k = r['key_name'] if isinstance(r, dict) else r[0]
            v = r['value_text'] if isinstance(r, dict) else r[1]
            if v is not None:
                settings[k] = v

        cursor.close()
        return jsonify(settings), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if connection and hasattr(connection, 'close'):
            connection.close()

@settings_bp.route('/api/settings', methods=['POST'])
def update_settings():
    """
    POST /api/settings
    Updates site settings. Payload example:
    { "alamat_soc": "...", "jam_operasional": "...", "sponsors_json": [...], "reg_siswa_open": true, ... }
    """
    connection = None
    try:
        data = request.get_json() or {}
        connection = get_db_connection()
        cursor = connection.cursor()

        updated = {}
        for key, raw_val in data.items():
            if raw_val is not None:
                if isinstance(raw_val, (dict, list)):
                    val_str = json.dumps(raw_val)
                elif isinstance(raw_val, bool):
                    val_str = 'true' if raw_val else 'false'
                else:
                    val_str = str(raw_val).strip()

                cursor.execute("""
                    INSERT INTO site_settings (key_name, value_text)
                    VALUES (%s, %s)
                    ON DUPLICATE KEY UPDATE value_text = VALUES(value_text)
                """, (str(key).strip(), val_str))
                updated[key] = val_str

        if not getattr(connection, 'autocommit', False):
            connection.commit()

        cursor.close()
        return jsonify({
            "status": "success",
            "message": "Pengaturan sistem & operasional berhasil diperbarui!",
            "data": updated
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if connection and hasattr(connection, 'close'):
            connection.close()
