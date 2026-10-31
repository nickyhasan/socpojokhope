import json
import os
import time
import base64
import re
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename

try:
    from database import get_db, get_db_connection
except ImportError:
    from ..database import get_db, get_db_connection

settings_bp = Blueprint('settings', __name__)

DEFAULT_SETTINGS = {
    'alamat_soc': 'Jln Pasar Minggu, Kec Kabila, Desa Dutohe, Gorontalo.',
    'jam_operasional': 'Senin - Sabtu (14:00 - 17:30 WITA)',
    'alumni_certificate_drive_url': 'https://drive.google.com/drive/folders/1U_VJDr6YXV-3bVslE6TSRA6hd7D16SFh?usp=drive_link',
    'sponsors_json': json.dumps([
        {"name": "Allies Youth Development", "url": "https://alliesyouth.org/", "icon": "fas fa-hand-holding-heart"},
        {"name": "Peacemakers Indonesia", "url": "https://www.instagram.com/pismovement/", "icon": "fab fa-instagram"}
    ]),
    'gallery_json': json.dumps([
        {"id": 1, "image_url": "static/src/assets/ui/gallery1.jpg", "category": "matematika", "caption": "Kelas Matematika Menyenangkan"},
        {"id": 2, "image_url": "static/src/assets/ui/gallery2.jpg", "category": "karakter", "caption": "Praktik Kelas Karakter"},
        {"id": 3, "image_url": "static/src/assets/ui/gallery3.jpg", "category": "outdoor", "caption": "Aktivitas Outdoor Learning"},
        {"id": 4, "image_url": "static/src/assets/ui/gallery4.jpg", "category": "inggris", "caption": "Pentas Dongeng Bahasa Inggris"},
        {"id": 5, "image_url": "static/src/assets/ui/gallery5.jpg", "category": "matematika", "caption": "Logika & Puzzle Matematika"},
        {"id": 6, "image_url": "static/src/assets/ui/gallery6.jpg", "category": "karakter", "caption": "Diskusi Karakter & Berbagi"},
        {"id": 7, "image_url": "static/src/assets/ui/gallery7.jpg", "category": "outdoor", "caption": "Aktivitas Peduli Lingkungan"},
        {"id": 8, "image_url": "static/src/assets/ui/gallery8.jpg", "category": "inggris", "caption": "Membaca & Pemahaman Inggris"}
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
    Public endpoint: returns site settings such as alamat_soc, jam_operasional, sponsors_json, gallery_json, and registration controls.
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

        if 'gallery_json' not in settings or not settings['gallery_json']:
            settings['gallery_json'] = DEFAULT_SETTINGS['gallery_json']
            try:
                cursor.execute("""
                    INSERT INTO site_settings (key_name, value_text)
                    VALUES (%s, %s)
                    ON DUPLICATE KEY UPDATE value_text = VALUES(value_text)
                """, ('gallery_json', DEFAULT_SETTINGS['gallery_json']))
                if not getattr(connection, 'autocommit', False):
                    connection.commit()
            except Exception:
                pass

        cursor.close()
        return jsonify(settings), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if connection and hasattr(connection, 'close'):
            connection.close()

@settings_bp.route('/api/settings/media', methods=['POST'])
def upload_settings_media():
    """
    POST /api/settings/media
    Uploads or updates website media files in static/src/assets/ui/.
    Accepts:
      - Multipart form: file, target_name (optional)
      - JSON: photo_data or image (base64 data URL), target_name (optional)
    """
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        ui_dir = os.path.join(base_dir, 'static', 'src', 'assets', 'ui')
        os.makedirs(ui_dir, exist_ok=True)

        target_name = None

        try:
            from image_utils import is_valid_image_bytes, optimize_image_bytes
        except ImportError:
            from ..image_utils import is_valid_image_bytes, optimize_image_bytes

        if request.content_type and 'multipart/form-data' in request.content_type:
            target_name = request.form.get('target_name')
            file = request.files.get('file') or request.files.get('image')
            if file and file.filename:
                file_bytes = file.read()
                if not is_valid_image_bytes(file_bytes):
                    return jsonify({"error": "Format gambar tidak valid atau file rusak."}), 400

                if not target_name:
                    ext = os.path.splitext(file.filename)[1].lower()
                    if ext not in ['.jpg', '.jpeg', '.png', '.webp']:
                        ext = '.jpg'
                    target_name = f"gallery_{int(time.time()*1000)}{ext}"
                else:
                    target_name = secure_filename(target_name)
                
                opt_bytes = optimize_image_bytes(file_bytes, max_dim=1200, quality=82)
                filepath = os.path.join(ui_dir, target_name)
                with open(filepath, 'wb') as f:
                    f.write(opt_bytes)

                file_url = f"static/src/assets/ui/{target_name}"
                return jsonify({
                    "status": "success",
                    "message": f"Media {target_name} berhasil diunggah!",
                    "filename": target_name,
                    "file_url": f"{file_url}?t={int(time.time())}"
                }), 200

        data = request.get_json(silent=True) or {}
        target_name = data.get('target_name') or request.form.get('target_name')
        photo_data = data.get('photo_data') or data.get('image') or request.form.get('photo_data')

        if not photo_data:
            return jsonify({"error": "Tidak ada data foto yang dikirim."}), 400

        if target_name:
            target_name = secure_filename(target_name)
            if not target_name.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                target_name += '.jpg'
        else:
            target_name = f"gallery_{int(time.time()*1000)}.jpg"

        if ',' in photo_data:
            photo_data = photo_data.split(',', 1)[1]
        raw_bytes = base64.b64decode(photo_data)

        if not is_valid_image_bytes(raw_bytes):
            return jsonify({"error": "Format gambar tidak valid atau file rusak."}), 400

        opt_bytes = optimize_image_bytes(raw_bytes, max_dim=1200, quality=82)
        filepath = os.path.join(ui_dir, target_name)
        with open(filepath, 'wb') as f:
            f.write(opt_bytes)

        file_url = f"static/src/assets/ui/{target_name}"
        return jsonify({
            "status": "success",
            "message": f"Media {target_name} berhasil disimpan!",
            "filename": target_name,
            "file_url": f"{file_url}?t={int(time.time())}"
        }), 200

    except Exception as e:
        return jsonify({"error": f"Gagal mengunggah media: {str(e)}"}), 500

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
