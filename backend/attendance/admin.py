# attendance/admin.py
from django.contrib import admin
from .models import Project, Period, TemporaryLabourer, ContractorAttendance, LabourerAttendance

admin.site.register(Project)
admin.site.register(Period)
admin.site.register(TemporaryLabourer)
admin.site.register(ContractorAttendance)
admin.site.register(LabourerAttendance)