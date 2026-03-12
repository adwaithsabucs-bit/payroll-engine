from django.contrib import admin
from .models import SupervisorPayroll, ContractorProjectPayroll, DailyLabourerPayroll

admin.site.register(SupervisorPayroll)
admin.site.register(ContractorProjectPayroll)
admin.site.register(DailyLabourerPayroll)