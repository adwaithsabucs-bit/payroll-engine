# backend/attendance/apps.py — REPLACE ENTIRE FILE

from django.apps import AppConfig


class AttendanceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'attendance'

    def ready(self):
        import attendance.signals  # noqa — registers post_save signals
