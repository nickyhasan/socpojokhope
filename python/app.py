import os
import sys
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS

# Ensure python directory is in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from database import init_db
from routes import (
    auth_bp,
    students_bp,
    teachers_bp,
    schedules_bp,
    attendance_bp,
    settings_bp,
)

# Project root directory (containing HTML, CSS, JS, and static assets)
PROJECT_ROOT = os.path.abspath(os.path.join(current_dir, '..'))

app = Flask(__name__, static_folder=None)

# Enable CORS for all routes
CORS(app)

# Register all modular Blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(students_bp)
app.register_blueprint(teachers_bp)
app.register_blueprint(schedules_bp)
app.register_blueprint(attendance_bp)
app.register_blueprint(settings_bp)

# Static File Serving
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_static(path):
    """
    Serves static HTML/JS/CSS/asset files from the project root directory.
    Falls back to index.html for root path or missing HTML routes.
    """
    if path.startswith('api/'):
        return jsonify({"error": "Endpoint not found"}), 404

    if not path:
        return send_from_directory(PROJECT_ROOT, 'index.html')

    file_path = os.path.join(PROJECT_ROOT, path)
    if os.path.isfile(file_path):
        return send_from_directory(PROJECT_ROOT, path)

    # Check if adding .html resolves the file (e.g. 'dashboard' -> 'dashboard.html')
    html_path = os.path.join(PROJECT_ROOT, f"{path}.html")
    if os.path.isfile(html_path):
        return send_from_directory(PROJECT_ROOT, f"{path}.html")

    return send_from_directory(PROJECT_ROOT, 'index.html')

# Auto database initialization
try:
    init_db()
except Exception as e:
    print(f"Database initialization warning: {e}")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
