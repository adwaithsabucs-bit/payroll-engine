from django.contrib import admin
from .models import Attendance


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ['labourer', 'date', 'status', 'overtime_hours', 'approval_status', 'marked_by']
    list_filter = ['status', 'approval_status', 'date']
    search_fields = ['labourer__user__username']
    date_hierarchy = 'date'