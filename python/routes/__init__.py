from .auth import auth_bp
from .students import students_bp
from .teachers import teachers_bp
from .schedules import schedules_bp
from .attendance import attendance_bp
from .settings import settings_bp

__all__ = [
    'auth_bp',
    'students_bp',
    'teachers_bp',
    'schedules_bp',
    'attendance_bp',
    'settings_bp',
]
